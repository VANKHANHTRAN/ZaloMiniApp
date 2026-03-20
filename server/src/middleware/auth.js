import jwt from "jsonwebtoken";
import { getPool } from "../db.js";

// Auth đơn giản: login lấy JWT, các API yêu cầu Bearer token
export async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload?.user_id;
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT user_id, phone_number, full_name, roles, zalo_id, status
       FROM USER
       WHERE user_id = :user_id
       LIMIT 1`,
      { user_id: userId }
    );
    const user = rows?.[0];
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.status !== "ACTIVE")
      return res.status(403).json({ error: "User inactive" });

    // roles trong DB là JSON array; mysql2 có thể trả string hoặc object tuỳ config
    let roles = user.roles;
    if (typeof roles === "string") {
      try {
        roles = JSON.parse(roles);
      } catch {
        roles = [];
      }
    }
    req.user = { ...user, roles: Array.isArray(roles) ? roles : [] };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

