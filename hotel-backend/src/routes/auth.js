const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../prisma");

const router = express.Router();

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/);

const registerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(6),
  role: z.enum(["MERCHANT", "ADMIN"])
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { username: body.username } });
    if (exists) return res.status(409).json({ message: "用户名已存在" });

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash,
        role: body.role
      },
      select: { id: true, username: true, role: true, createdAt: true }
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1)
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username: body.username } });
    if (!user) return res.status(401).json({ message: "账号或密码错误" });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "账号或密码错误" });

    // 登录不需要选择角色：直接把 role 返回给前端
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "2h" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
