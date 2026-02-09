const { PrismaClient } = require("@prisma/client");

// Prisma 客户端实例，全局复用
const prisma = new PrismaClient();

module.exports = prisma;
