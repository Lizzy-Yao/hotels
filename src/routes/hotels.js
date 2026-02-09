const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");
const { authRequired, roleRequired } = require("../middlewares/auth");

const router = express.Router();

// 子结构校验
const roomTypeSchema = z.object({
  name: z.string().min(1),
  bed_type: z.string().optional(),
  capacity: z.number().int().optional(),
  area_sqm: z.number().optional(),
  base_price_cents: z.number().int().nonnegative(),
  currency: z.string().optional()
});

const nearbySchema = z.object({
  type: z.enum(["ATTRACTION", "TRANSPORT", "MALL"]),
  name: z.string().min(1),
  distance_meters: z.number().int().nonnegative().optional(),
  address: z.string().optional()
});

const promotionSchema = z.object({
  type: z.enum(["PERCENT_OFF", "PACKAGE_MINUS"]),
  title: z.string().min(1),
  description: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  percent_off: z.number().int().optional(),        // 80 表示 8 折
  amount_off_cents: z.number().int().optional(),  // 套餐立减金额
  conditions_json: z.any().optional(),
  is_active: z.boolean().optional()
});

const hotelUpsertSchema = z.object({
  name_cn: z.string().min(1),
  name_en: z.string().optional(),
  address: z.string().min(1),
  star_rating: z.number().int().min(0).max(5),
  open_date: z.string().datetime().optional(),
  min_price_cents: z.number().int().optional(),
  max_price_cents: z.number().int().optional(),
  currency: z.string().optional(),
  room_types: z.array(roomTypeSchema).optional(),
  nearby_places: z.array(nearbySchema).optional(),
  promotions: z.array(promotionSchema).optional()
});

// 创建酒店（DRAFT）
router.post("/", authRequired, roleRequired("MERCHANT"), async (req, res, next) => {
  try {
    const body = hotelUpsertSchema.parse(req.body);

    const hotel = await prisma.hotel.create({
      data: {
        merchantId: req.user.id,
        nameCn: body.name_cn,
        nameEn: body.name_en,
        address: body.address,
        starRating: body.star_rating,
        openDate: body.open_date ? new Date(body.open_date) : null,
        minPriceCents: body.min_price_cents,
        maxPriceCents: body.max_price_cents,
        currency: body.currency || "CNY",
        status: "DRAFT",
        roomTypes: body.room_types ? {
          create: body.room_types.map(r => ({
            name: r.name,
            bedType: r.bed_type,
            capacity: r.capacity,
            areaSqm: r.area_sqm,
            basePriceCents: r.base_price_cents,
            currency: r.currency || body.currency || "CNY"
          }))
        } : undefined,
        nearbyPlaces: body.nearby_places ? {
          create: body.nearby_places.map(n => ({
            type: n.type,
            name: n.name,
            distanceMeters: n.distance_meters,
            address: n.address
          }))
        } : undefined,
        promotions: body.promotions ? {
          create: body.promotions.map(p => ({
            type: p.type,
            title: p.title,
            description: p.description,
            startDate: p.start_date ? new Date(p.start_date) : null,
            endDate: p.end_date ? new Date(p.end_date) : null,
            percentOff: p.percent_off,
            amountOffCents: p.amount_off_cents,
            conditionsJson: p.conditions_json,
            isActive: p.is_active ?? true
          }))
        } : undefined,
        auditLogs: {
          create: { operatorId: req.user.id, action: "UPDATE", note: "create draft" }
        }
      },
      include: { roomTypes: true, nearbyPlaces: true, promotions: true }
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
          nameCn: body.name_cn,
          nameEn: body.name_en,
          address: body.address,
          starRating: body.star_rating,
          openDate: body.open_date ? new Date(body.open_date) : null,
          minPriceCents: body.min_price_cents,
          maxPriceCents: body.max_price_cents,
          currency: body.currency || existing.currency || "CNY",
          // REJECTED 编辑后仍保持 REJECTED，直到商户 submit 再变 SUBMITTED
          auditLogs: {
            create: { operatorId: req.user.id, action: "UPDATE", note: "merchant update" }
          },
          roomTypes: body.room_types ? {
            create: body.room_types.map(r => ({
              name: r.name,
              bedType: r.bed_type,
              capacity: r.capacity,
              areaSqm: r.area_sqm,
              basePriceCents: r.base_price_cents,
              currency: r.currency || body.currency || existing.currency || "CNY"
            }))
          } : undefined,
          nearbyPlaces: body.nearby_places ? {
            create: body.nearby_places.map(n => ({
              type: n.type,
              name: n.name,
              distanceMeters: n.distance_meters,
              address: n.address
            }))
          } : undefined,
          promotions: body.promotions ? {
            create: body.promotions.map(p => ({
              type: p.type,
              title: p.title,
              description: p.description,
              startDate: p.start_date ? new Date(p.start_date) : null,
              endDate: p.end_date ? new Date(p.end_date) : null,
              percentOff: p.percent_off,
              amountOffCents: p.amount_off_cents,
              conditionsJson: p.conditions_json,
              isActive: p.is_active ?? true
            }))
          } : undefined
        },
        include: { roomTypes: true, nearbyPlaces: true, promotions: true }
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
router.get("/", authRequired, roleRequired("MERCHANT"), async (req, res, next) => {
  try {
    const { status, page = "1", pageSize = "10" } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize, 10)));

    const where = {
      merchantId: req.user.id,
      ...(status ? { status } : {})
    };

    const [total, items] = await Promise.all([
      prisma.hotel.count({ where }),
      prisma.hotel.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (p - 1) * ps,
        take: ps
      })
    ]);

    res.json({ page: p, pageSize: ps, total, items });
  } catch (err) {
    next(err);
  }
});

// 酒店详情（商户）
router.get("/:id", authRequired, roleRequired("MERCHANT"), async (req, res, next) => {
  try {
    const hotelId = req.params.id;

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { roomTypes: true, nearbyPlaces: true, promotions: true }
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
