const jwt = require("jsonwebtoken");

/**
 * JWT 鉴权中间件：
 * - 校验 Authorization: Bearer <token>
 * - 把 user 信息挂到 req.user
 */
function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "未登录或缺少 token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = payload; // { id, role, username }
    next();
  } catch (e) {
    return res.status(401).json({ message: "token 无效或已过期" });
  }
}

/**
 * 角色校验：
 * @param {"MERCHANT"|"ADMIN"} role
 */
function roleRequired(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "未登录" });
    if (req.user.role !== role) {
      return res.status(403).json({ message: "无权限" });
    }
    next();
  };
}

module.exports = { authRequired, roleRequired };
