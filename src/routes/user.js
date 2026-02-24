const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");

const router = express.Router();

const searchSchema = z.object({
  city: z.string().trim().min(1),
  keyword: z.string().trim().optional(),
  checkInDate: z.string().trim(),
  checkOutDate: z.string().trim(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

function parseYmdDate(dateStr) {
  const matched = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (!matched) return null;

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;

  const [y, m, d] = dateStr.split("-").map(Number);
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) {
    return null;
  }

  return date;
}

router.post("/hotels/search", async (req, res) => {
  try {
    const body = searchSchema.parse(req.body);

    const checkIn = parseYmdDate(body.checkInDate);
    const checkOut = parseYmdDate(body.checkOutDate);

    if (!checkIn || !checkOut || checkIn >= checkOut) {
      return res.status(200).json({
        code: 1001,
        message: "入住日期不能晚于离店日期",
        data: { total: 0, list: [] },
      });
    }

    const cityExists = await prisma.hotel.count({
      where: {
        status: "APPROVED",
        address: { contains: body.city },
      },
    });

    if (cityExists === 0) {
      return res.status(200).json({
        code: 1002,
        message: "城市不支持或不存在",
        data: { total: 0, list: [] },
      });
    }

    const keyword = body.keyword?.trim();
    const tags = (body.tags || []).map((tag) => tag.trim()).filter(Boolean);

    const where = {
      status: "APPROVED",
      address: { contains: body.city },
      ...(keyword
        ? {
            OR: [
              { nameCn: { contains: keyword } },
              { nameEn: { contains: keyword } },
              { address: { contains: keyword } },
              { nearbyPlaces: { some: { name: { contains: keyword } } } },
            ],
          }
        : {}),
      ...(tags.length
        ? {
            AND: tags.map((tag) => ({
              OR: [
                { nameCn: { contains: tag } },
                { address: { contains: tag } },
                { nearbyPlaces: { some: { name: { contains: tag } } } },
                { discounts: { some: { title: { contains: tag } } } },
                { discounts: { some: { description: { contains: tag } } } },
              ],
            })),
          }
        : {}),
    };

    const hotels = await prisma.hotel.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        nameCn: true,
        address: true,
        minPriceCents: true,
        starRating: true,
        roomTypes: {
          select: { basePriceCents: true },
          orderBy: { basePriceCents: "asc" },
          take: 1,
        },
        nearbyPlaces: {
          select: { name: true },
          orderBy: [{ distanceMeters: "asc" }, { createdAt: "asc" }],
          take: 8,
        },
        discounts: {
          where: { isActive: true },
          select: { title: true },
          orderBy: { createdAt: "desc" },
          take: 4,
        },
        _count: {
          select: { auditLogs: true },
        },
      },
    });

    const list = hotels.map((hotel) => {
      const nearbyTags = hotel.nearbyPlaces.map((item) => item.name);
      const promoTags = hotel.discounts.map((item) => item.title).filter(Boolean);
      const mergedTags = [...new Set([...nearbyTags, ...promoTags])].slice(0, 8);

      const roomMinPrice = hotel.roomTypes[0]?.basePriceCents;
      const minPriceCents =
        hotel.minPriceCents != null
          ? hotel.minPriceCents
          : roomMinPrice != null
          ? roomMinPrice
          : 0;

      return {
        hotelId: hotel.id,
        hotelName: hotel.nameCn,
        address: hotel.address,
        coverImage: "",
        tags: mergedTags,
        minPrice: Math.floor(minPriceCents),
        score: Number(hotel.starRating.toFixed(1)),
        commentCount: hotel._count.auditLogs,
      };
    });

    return res.status(200).json({
      code: 0,
      message: "success",
      data: {
        total: list.length,
        list,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(200).json({
        code: 1001,
        message: "参数校验失败",
        data: { total: 0, list: [] },
      });
    }

    console.error(err);
    return res.status(500).json({
      code: 2000,
      message: "服务内部异常",
      data: { total: 0, list: [] },
    });
  }
});

module.exports = router;
