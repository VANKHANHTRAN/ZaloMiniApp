import express from "express";
import { z } from "zod";

import { authRequired } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { Roles } from "../constants.js";
import { getPool, withTx } from "../db.js";

export const managerRouter = express.Router();
managerRouter.use(authRequired, requireRole([Roles.MANAGER]));

// Danh sách user (để quản lý + phân quyền)
managerRouter.get("/users", async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT user_id, phone_number, full_name, roles, zalo_id, status, created_at
       FROM USER
       ORDER BY user_id`
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// Dashboard tổng quan đơn hàng theo status (số lượng từng trạng thái)
managerRouter.get("/dashboard", async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT order_status, COUNT(*) AS total
       FROM ORDER_MAS
       GROUP BY order_status
       ORDER BY order_status`
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// Danh sách đơn cho Manager (query ?status= để lọc theo trạng thái)
managerRouter.get("/orders", async (req, res, next) => {
  try {
    const status = req.query.status;
    const pool = getPool();
    let rows;
    if (status && status !== "ALL") {
      [rows] = await pool.execute(
        `SELECT order_id, customer_name, customer_phone, installation_address,
                installation_date, order_status, created_by, created_at, updated_at
         FROM ORDER_MAS
         WHERE order_status = :order_status
         ORDER BY updated_at DESC`,
        { order_status: status }
      );
    } else {
      [rows] = await pool.execute(
        `SELECT order_id, customer_name, customer_phone, installation_address,
                installation_date, order_status, created_by, created_at, updated_at
         FROM ORDER_MAS
         ORDER BY updated_at DESC`
      );
    }
    res.json({ data: rows || [] });
  } catch (err) {
    next(err);
  }
});

// Sửa user (phân quyền: đổi role, trạng thái, thông tin)
managerRouter.patch("/users/:userId", async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: "userId không hợp lệ" });
    }
    const body = z
      .object({
        full_name: z.string().min(1).max(100).optional(),
        role: z.enum(["SALE", "PROD", "INSTALL", "QC", "MANAGER"]).optional(),
        zalo_id: z.string().max(64).nullable().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      })
      .parse(req.body);

    const pool = getPool();
    const updates = [];
    const params = { user_id: userId };
    if (body.full_name !== undefined) {
      updates.push("full_name = :full_name");
      params.full_name = body.full_name;
    }
    if (body.role !== undefined) {
      updates.push("roles = JSON_ARRAY(:role)");
      params.role = body.role;
    }
    if (body.zalo_id !== undefined) {
      updates.push("zalo_id = :zalo_id");
      params.zalo_id = body.zalo_id;
    }
    if (body.status !== undefined) {
      updates.push("status = :status");
      params.status = body.status;
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: "Không có trường nào để cập nhật" });
    }
    await pool.execute(
      `UPDATE USER SET ${updates.join(", ")} WHERE user_id = :user_id`,
      params
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Tạo user + gán 1 role (enforce 1 role/user)
managerRouter.post("/users", async (req, res, next) => {
  try {
    const body = z
      .object({
        phone_number: z.string().min(8).max(20),
        full_name: z.string().min(1).max(100),
        role: z.enum(["SALE", "PROD", "INSTALL", "QC", "MANAGER"]),
        zalo_id: z.string().max(64).optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      })
      .parse(req.body);

    const pool = getPool();
    await withTx(async (conn) => {
      await conn.execute(
        `INSERT INTO USER (phone_number, full_name, roles, zalo_id, status)
         VALUES (:phone_number, :full_name, JSON_ARRAY(:role), :zalo_id, :status)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name),
           roles = VALUES(roles),
           zalo_id = VALUES(zalo_id),
           status = VALUES(status)`,
        {
          phone_number: body.phone_number,
          full_name: body.full_name,
          role: body.role,
          zalo_id: body.zalo_id || null,
          status: body.status || "ACTIVE",
        }
      );
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

