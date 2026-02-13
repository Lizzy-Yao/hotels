const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");
const { authRequired, roleRequired } = require("../middlewares/auth");
const { format } = require('date-fns');
const router = express.Router();

// 管理员列表（默认看 SUBMITTED）
router.get("/hotels", authRequired, roleRequired("ADMIN"), async (req, res, next) => {
  try {
    const { status = "SUBMITTED", merchant_id, page = "1", pageSize = "10" } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize, 10)));

    const where = {
      ...(status ? { status } : {}),
      ...(merchant_id ? { merchantId: String(merchant_id) } : {})
    };

    const [total, items] = await Promise.all([
      prisma.hotel.count({ where }),
      prisma.hotel.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (p - 1) * ps,
        take: ps,
        include: { merchant: { select: { id: true, username: true } } }
      })
    ]);
    const formattedItems = items.map(item => {
      const newItem = { ...item };
      if (newItem.openDate) {
        newItem.openDate = format(new Date(newItem.openDate), 'yyyy-MM-dd');
      }
      return newItem;
    });
    res.json({ page: p, pageSize: ps, total, items:formattedItems });
  } catch (err) {
    next(err);
  }
});

// 审核
const reviewSchema = z.object({
  result: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional()
});

router.post("/hotels/:id/review", authRequired, roleRequired("ADMIN"), async (req, res, next) => {
  try {
    const body = reviewSchema.parse(req.body);
    const hotelId = req.params.id;

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) return res.status(404).json({ message: "酒店不存在" });
    if (hotel.status !== "SUBMITTED") {
      return res.status(400).json({ message: `仅 SUBMITTED 可审核，当前为 ${hotel.status}` });
    }

    let updated;
    if (body.result === "APPROVE") {
      updated = await prisma.hotel.update({
        where: { id: hotelId },
        data: {
          status: "APPROVED",
          rejectReason: null,
          auditLogs: {
            create: { operatorId: req.user.id, action: "APPROVE", note: "approve" }
          }
        }
      });
    } else {
      if (!body.reason || body.reason.trim().length === 0) {
        return res.status(400).json({ message: "不通过必须填写原因" });
      }
      updated = await prisma.hotel.update({
        where: { id: hotelId },
        data: {
          status: "REJECTED",
          rejectReason: body.reason,
          auditLogs: {
            create: { operatorId: req.user.id, action: "REJECT", note: body.reason }
          }
        }
      });
    }

    // 推送给商户：审核结果实时可见
    const io = req.app.get("io");
    io.to(`user:${updated.merchantId}`).emit("hotel:reviewed", {
      hotelId: updated.id,
      status: updated.status,
      rejectReason: updated.rejectReason || null
    });

    res.json({ hotel: updated });
  } catch (err) {
    next(err);
  }
});

// 发布
router.post("/hotels/:id/publish", authRequired, roleRequired("ADMIN"), async (req, res, next) => {
  try {
    const hotelId = req.params.id;
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) return res.status(404).json({ message: "酒店不存在" });
    if (hotel.status !== "APPROVED") {
      return res.status(400).json({ message: `仅 APPROVED 可发布，当前为 ${hotel.status}` });
    }

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        auditLogs: {
          create: { operatorId: req.user.id, action: "PUBLISH", note: "publish" }
        }
      }
    });

    const io = req.app.get("io");
    io.to(`user:${updated.merchantId}`).emit("hotel:published", { hotelId: updated.id });

    res.json({ hotel: updated });
  } catch (err) {
    next(err);
  }
});

// 下线
router.post("/hotels/:id/offline", authRequired, roleRequired("ADMIN"), async (req, res, next) => {
  try {
    const hotelId = req.params.id;
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) return res.status(404).json({ message: "酒店不存在" });
    if (!["PUBLISHED"].includes(hotel.status)) {
      return res.status(400).json({ message: `仅 PUBLISHED 可下线，当前为 ${hotel.status}` });
    }

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        offlineFromStatus: hotel.status,
        status: "OFFLINE",
        offlineAt: new Date(),
        auditLogs: {
          create: { operatorId: req.user.id, action: "OFFLINE", note: "offline" }
        }
      }
    });

    const io = req.app.get("io");
    io.to(`user:${updated.merchantId}`).emit("hotel:offline", { hotelId: updated.id });

    res.json({ hotel: updated });
  } catch (err) {
    next(err);
  }
});

// 恢复
router.post("/hotels/:id/restore", authRequired, roleRequired("ADMIN"), async (req, res, next) => {
  try {
    const hotelId = req.params.id;
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) return res.status(404).json({ message: "酒店不存在" });
    if (hotel.status !== "OFFLINE") {
      return res.status(400).json({ message: `仅 OFFLINE 可恢复，当前为 ${hotel.status}` });
    }

    const restoreTo = hotel.offlineFromStatus || "PUBLISHED";

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        status: restoreTo,
        offlineAt: null,
        auditLogs: {
          create: { operatorId: req.user.id, action: "RESTORE", note: `restore to ${restoreTo}` }
        }
      }
    });

    const io = req.app.get("io");
    io.to(`user:${updated.merchantId}`).emit("hotel:restored", { hotelId: updated.id, status: updated.status });

    res.json({ hotel: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
