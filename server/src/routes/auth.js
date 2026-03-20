import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getPool } from "../db.js";
import { authRequired } from "../middleware/auth.js";

export const authRouter = express.Router();

// Đăng nhập đơn giản theo SĐT (demo/production nội bộ):
// - Mục tiêu: map SĐT -> USER.user_id -> JWT
// - Thực tế production: có thể thay bằng Zalo login + verify
authRouter.post("/login", async (req, res, next) => {
  try {
    const body = z
      .object({
        phone_number: z.string().min(8).max(20),
      })
      .parse(req.body);

    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT user_id, roles, status
       FROM USER
       WHERE phone_number = :phone_number
       LIMIT 1`,
      { phone_number: body.phone_number }
    );
    const user = rows?.[0];
    if (!user) return res.status(401).json({ error: "Sai tài khoản" });
    if (user.status !== "ACTIVE")
      return res.status(403).json({ error: "Tài khoản bị khoá" });

    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// Lấy thông tin user hiện tại (phục vụ frontend phân luồng theo role)
authRouter.get("/me", authRequired, async (req, res) => {
  res.json({
    data: {
      user_id: req.user.user_id,
      phone_number: req.user.phone_number,
      full_name: req.user.full_name,
      roles: req.user.roles,
      zalo_id: req.user.zalo_id,
      status: req.user.status,
    },
  });
});

