const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const hotelRoutes = require("./routes/hotels");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");
const userRoutes = require("./routes/user");

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const server = http.createServer(app);

// Socket.IO：用于“保存/审核/发布后实时更新到端侧”
const io = new Server(server, {
  cors: { origin: "*"}
});

// 简单房间策略：
// - 商户连接后 join: user:<userId>
// - 管理员连接后 join: admin
io.on("connection", (socket) => {
  socket.on("join", ({ userId, role }) => {
    if (userId) socket.join(`user:${userId}`);
    if (role === "ADMIN") socket.join("admin");
  });
});

// 把 io 挂到 app，便于路由里发事件
app.set("io", io);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/hotels", hotelRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/v1/user", userRoutes);

// 统一错误兜底
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`API listening on ${PORT}`));
