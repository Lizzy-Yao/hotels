const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");
const { authRequired, roleRequired } = require("../middlewares/auth");
const { format } = require('date-fns');
const router = express.Router();

// 子结构校验
const roomTypeSchema = z.object({
  name: z.string().min(1),
  bedType: z.string().optional(),
  capacity: z.number().int().optional(),
  areaSqm: z.number().optional(),
  basePriceCents: z.number().int().nonnegative(),
  currency: z.string().optional()
});

const nearbySchema = z.object({
  type: z.enum(["ATTRACTION", "TRANSPORT", "MALL"]),
  name: z.string().min(1),
  distanceMeters: z.number().int().nonnegative().optional(),
  address: z.string().optional()
});

const discountschema = z.object({
  type: z.enum(["percentOff", "amountOffCents"]),
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // percentOff: z.number().int().optional(),        // 80 表示 8 折
  // amountOffCents: z.number().int().optional(),  // 套餐立减金额
  value: z.any().optional(),
  conditionsJson: z.any().optional(),
  isActive: z.boolean().optional()
});

const hotelUpsertSchema = z.object({
  nameCn: z.string().min(1),
  nameEn: z.string().optional(),
  address: z.string().min(1),
  starRating: z.number().int().min(0).max(5),
  openDate: z.string().pipe(z.coerce.date()).optional(),
    minPriceCents: z.number().int().optional(),
  maxPriceCents: z.number().int().optional(),
  currency: z.string().optional(),
  roomTypes: z.array(roomTypeSchema).optional(),
  nearbyPlaces: z.array(nearbySchema).optional(),
  discounts: z.array(discountschema).optional()
});

// 创建酒店（DRAFT）
router.post("/", authRequired, roleRequired("MERCHANT"), async (req, res, next) => {
  try {
    const body = hotelUpsertSchema.parse(req.body);
    // console.log("after parse:", JSON.stringify(body.discounts, null, 2));

    const hotel = await prisma.hotel.create({
      data: {
        merchantId: req.user.id,
        nameCn: body.nameCn,
        nameEn: body.nameEn,
        address: body.address,
        starRating: body.starRating,
        openDate: body.openDate ? new Date(body.openDate) : null,
        minPriceCents: body.minPriceCents,
        maxPriceCents: body.maxPriceCents,
        currency: body.currency || "CNY",
        status: "DRAFT",
        roomTypes: body.roomTypes ? {
          create: body.roomTypes.map(r => ({
            name: r.name,
            bedType: r.bedType,
            capacity: r.capacity,
            areaSqm: r.areaSqm,
            basePriceCents: r.basePriceCents,
            currency: r.currency || body.currency || "CNY"
          }))
        } : undefined,
        nearbyPlaces: body.nearbyPlaces ? {
          create: body.nearbyPlaces.map(n => ({
            type: n.type,
            name: n.name,
            distanceMeters: n.distanceMeters,
            address: n.address
          }))
        } : undefined,
        discounts: body.discounts ? {
          create: body.discounts.map(p => ({
            type: p.type,
            title: p.title,
            description: p.description,
            startDate: p.startDate ? new Date(p.startDate) : null,
            endDate: p.endDate ? new Date(p.endDate) : null,
            percentOff: p.type == "percentOff" ? p.value: null,
            amountOffCents: p.type == "amountOffCents" ? p.value: null,
            conditionsJson: p.conditionsJson,
            isActive: p.isActive ?? true
          }))
        } : undefined,
        
        auditLogs: {
          create: { operatorId: req.user.id, action: "UPDATE", note: "create draft" }
        }
      },
      include: { roomTypes: true, nearbyPlaces: true, discounts: true }
    });

    // 实时推送给该商户（保存后端侧实时更新）
    const io = req.app.get("io");
    io.to(`user:${req.user.id}`).emit("hotel:updated", { hotelId: hotel.id, hotel });

    res.json({ hotel });
  } catch (err) {
    next(err);
  }
});

// 更新酒店（仅 DRAFT/REJECTED 允许商户编辑）
router.put("/:id", authRequired, roleRequired("MERCHANT"), async (req, res, next) => {
  try {
    const body = hotelUpsertSchema.parse(req.body);
    const hotelId = req.params.id;

    const existing = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!existing) return res.status(404).json({ message: "酒店不存在" });
    if (existing.merchantId !== req.user.id) return res.status(403).json({ message: "无权限" });

    if (!["DRAFT", "REJECTED"].includes(existing.status)) {
      return res.status(400).json({ message: `当前状态(${existing.status})不允许商户编辑` });
    }

    // 简化策略：子表全量重建（先删后建）
    const hotel = await prisma.$transaction(async (tx) => {
      await tx.roomType.deleteMany({ where: { hotelId } });
      await tx.nearbyPlace.deleteMany({ where: { hotelId } });
      await tx.promotion.deleteMany({ where: { hotelId } });

      const updated = await tx.hotel.update({
        where: { id: hotelId },
        data: {
          nameCn: body.nameCn,
          nameEn: body.nameEn,
          address: body.address,
          starRating: body.starRating,
          openDate: body.openDate ? new Date(body.openDate) : null,
          minPriceCents: body.minPriceCents,
          maxPriceCents: body.maxPriceCents,
          currency: body.currency || existing.currency || "CNY",
          // REJECTED 编辑后仍保持 REJECTED，直到商户 submit 再变 SUBMITTED
          auditLogs: {
            create: { operatorId: req.user.id, action: "UPDATE", note: "merchant update" }
          },
          roomTypes: body.roomTypes ? {
            create: body.roomTypes.map(r => ({
              name: r.name,
              bedType: r.bedType,
              capacity: r.capacity,
              areaSqm: r.areaSqm,
              basePriceCents: r.basePriceCents,
              currency: r.currency || body.currency || existing.currency || "CNY"
            }))
          } : undefined,
          nearbyPlaces: body.nearbyPlaces ? {
            create: body.nearbyPlaces.map(n => ({
              type: n.type,
              name: n.name,
              distanceMeters: n.distanceMeters,
              address: n.address
            }))
          } : undefined,
          discounts: body.discounts ? {
            create: body.discounts.map(p => ({
              type: p.type,
              title: p.title,
              description: p.description,
              startDate: p.startDate ? new Date(p.startDate) : null,
              endDate: p.endDate ? new Date(p.endDate) : null,
              percentOff: p.percentOff,
              amountOffCents: p.amountOffCents,
              conditionsJson: p.conditionsJson,
              isActive: p.isActive ?? true
            }))
          } : undefined
        },
        include: { roomTypes: true, nearbyPlaces: true, discounts: true }
      });

      return updated;
    });

    const io = req.app.get("io");
    io.to(`user:${req.user.id}`).emit("hotel:updated", { hotelId: hotel.id, hotel });

    res.json({ hotel });
  } catch (err) {
    next(err);
  }
});

// 我的酒店列表
// 我的酒店列表
router.get(
  "/",
  authRequired,
  roleRequired("MERCHANT"),
  async (req, res, next) => {
    try {
      const { status, page = "1", pageSize = "10" } = req.query;
      const p = Math.max(1, parseInt(page, 10));
      const ps = Math.min(50, Math.max(1, parseInt(pageSize, 10)));

      const where = {
        merchantId: req.user.id,
        ...(status ? { status } : {}),
      };

      const now = new Date();

      function isPromotionEffective(promo) {
        if (promo.isActive === false) return false;
        if (promo.startDate && now < promo.startDate) return false;
        if (promo.endDate && now > promo.endDate) return false;
        return true;
      }

      function mapPromotionToDiscount(promo) {
        // 你的 schema: PromotionType = percentOff | PACKAGE_MINUS
        if (promo.type === "percentOff") {
          const percent = Number(promo.percentOff ?? 0); // 例如 20 表示便宜 20%
          const value = (100 - percent) / 100; // 20 -> 0.8 -> 8折
          return {
            type: "discount",
            name: promo.title,
            value,
            description: promo.description || "",
          };
        }

        // PACKAGE_MINUS：立减
        const amountYuan = Number(promo.amountOffCents ?? 0) / 100;
        return {
          type: "minus",
          name: promo.title,
          value: amountYuan,
          description: promo.description || "",
        };
      }

      const [total, items] = await Promise.all([
        prisma.hotel.count({ where }),
        prisma.hotel.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (p - 1) * ps,
          take: ps,
          include: {
            nearbyPlaces: {
              orderBy: [{ type: "asc" }, { createdAt: "asc" }],
            },

            // ✅ 房型/价格：按前端字段名 roomTypes 直接返回
            roomTypes: {
              select: {
                id: true,
                name: true,
                basePriceCents: true,
                currency: true,
              },
              orderBy: { basePriceCents: "asc" },
            },

            // ✅ 优惠活动：从 discounts 映射到 discounts
            discounts: {
              select: {
                id: true,
                type: true,
                title: true,
                description: true,
                percentOff: true,
                amountOffCents: true,
                startDate: true,
                endDate: true,
                isActive: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        }),
      ]);
      // console.log(items)
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
  }
);



// 酒店详情（商户）
router.get("/:id", authRequired, roleRequired("MERCHANT"), async (req, res, next) => {
  try {
    const hotelId = req.params.id;

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { roomTypes: true, nearbyPlaces: true, discounts: true }
    });

    if (!hotel) return res.status(404).json({ message: "酒店不存在" });
    if (hotel.merchantId !== req.user.id) return res.status(403).json({ message: "无权限" });

    res.json({ hotel });
  } catch (err) {
    next(err);
  }
});

// 提交审核（SUBMITTED）
router.post("/:id/submit", authRequired, roleRequired("MERCHANT"), async (req, res, next) => {
  try {
    const hotelId = req.params.id;

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { roomTypes: true }
    });

    if (!hotel) return res.status(404).json({ message: "酒店不存在" });
    if (hotel.merchantId !== req.user.id) return res.status(403).json({ message: "无权限" });
    if (!["DRAFT", "REJECTED"].includes(hotel.status)) {
      return res.status(400).json({ message: `当前状态(${hotel.status})不允许提交审核` });
    }

    // 关键字段完整性校验（可按需求加严）
    if (!hotel.nameCn || !hotel.address || hotel.starRating == null) {
      return res.status(400).json({ message: "酒店基础信息不完整，无法提交审核" });
    }
    if (!hotel.roomTypes || hotel.roomTypes.length < 1) {
      return res.status(400).json({ message: "至少需要配置 1 个房型，才能提交审核" });
    }

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        status: "SUBMITTED",
        rejectReason: null,
        auditLogs: {
          create: { operatorId: req.user.id, action: "SUBMIT", note: "merchant submit" }
        }
      }
    });

    // 推送给管理员端：有新的待审
    const io = req.app.get("io");
    io.to("admin").emit("hotel:submitted", { hotelId: updated.id });

    res.json({ hotel: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
