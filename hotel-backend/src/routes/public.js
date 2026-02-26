const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/hotels", async (req, res, next) => {
  try {
    const { page = "1", pageSize = "10" } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize, 10)));

    const where = { status: "PUBLISHED" };

    const [total, items] = await Promise.all([
      prisma.hotel.count({ where }),
      prisma.hotel.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (p - 1) * ps,
        take: ps,
        select: {
          id: true,
          nameCn: true,
          nameEn: true,
          address: true,
          starRating: true,
          minPriceCents: true,
          maxPriceCents: true,
          currency: true,

          // ✅ 加上关联表返回
          nearbyPlaces: {
            select: {
              id: true,
              type: true,
              name: true,
              distanceMeters: true,
              address: true
            },
            orderBy: [
              { type: "asc" },
              { distanceMeters: "asc" }
            ]
          }
        }
      })
    ]);

    res.json({ page: p, pageSize: ps, total, items });
  } catch (err) {
    next(err);
  }
});


router.get("/hotels/:id", async (req, res, next) => {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: req.params.id },
      include: { roomTypes: true, nearbyPlaces: true, discounts: true }
    });

    if (!hotel || hotel.status !== "PUBLISHED") {
      return res.status(404).json({ message: "酒店不存在或未发布" });
    }
    res.json({ hotel });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
