import express from "express";
import { z } from "zod";
import { authRequired } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { Roles, OrderStatus, VisibleStatusByRole } from "../constants.js";
import { withTx } from "../db.js";
import { makeOrderId } from "../utils/id.js";
import { makeHistoryLog } from "../services/history.js";
import { listOrdersByStatuses } from "../services/ordersRepo.js";
import { getPool } from "../db.js";
import { sendZaloNotice } from "../services/zaloNotice.js";

export const saleOrdersRouter = express.Router();

saleOrdersRouter.use(authRequired, requireRole([Roles.SALE]));

// SALE xem toàn bộ tiến độ để feedback khách
saleOrdersRouter.get("/", async (req, res, next) => {
  try {
    const pool = getPool();
    const statuses = VisibleStatusByRole.SALE;
    const rows = await withTx((conn) => listOrdersByStatuses(conn, statuses));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// SALE tạo đơn NEW_ORDER + ghi history
saleOrdersRouter.post("/", async (req, res, next) => {
  try {
    const body = z
      .object({
        customer_name: z.string().min(1).max(100),
        customer_phone: z.string().min(8).max(20),
        installation_address: z.string().min(1).max(255),
        installation_date: z.string().min(8).max(20), // YYYY-MM-DD
        items: z
          .array(
            z.object({
              door_model: z.string().min(1).max(100),
              quantity: z.number().int().min(1).max(999),
              notes: z.string().max(500).optional(),
            })
          )
          .min(1)
          .max(50),
      })
      .parse(req.body);

    const orderId = makeOrderId();
    const createdBy = req.user.user_id;
    const log = makeHistoryLog({
      status: OrderStatus.NEW_ORDER,
      by: req.user.full_name,
      role: Roles.SALE,
      note: "Tạo đơn",
      photos: [],
      duration_from_last_step: "",
    });

    await withTx(async (conn) => {
      await conn.execute(
        `INSERT INTO ORDER_MAS
         (order_id, customer_name, customer_phone, installation_address, installation_date, order_status, history, created_by)
         VALUES
         (:order_id, :customer_name, :customer_phone, :installation_address, :installation_date, :order_status,
          JSON_ARRAY(CAST(:log AS JSON)), :created_by)`,
        {
          order_id: orderId,
          customer_name: body.customer_name,
          customer_phone: body.customer_phone,
          installation_address: body.installation_address,
          installation_date: body.installation_date,
          order_status: OrderStatus.NEW_ORDER,
          log: JSON.stringify(log),
          created_by: createdBy,
        }
      );

      for (let i = 0; i < body.items.length; i++) {
        const it = body.items[i];
        await conn.execute(
          `INSERT INTO ORDER_INF
           (order_id, seq, door_model, quantity, item_status, notes)
           VALUES
           (:order_id, :seq, :door_model, :quantity, :item_status, :notes)`,
          {
            order_id: orderId,
            seq: i + 1,
            door_model: it.door_model,
            quantity: it.quantity,
            item_status: OrderStatus.NEW_ORDER,
            notes: it.notes || null,
          }
        );
      }
    });

    // Gửi notice cho thợ sản xuất (best-effort)
    // Ở đây demo: gửi cho tất cả user role PROD (production thực tế nên chọn theo nhóm/ca)
    try {
      const pool = getPool();
      const [prodUsers] = await pool.execute(
        `SELECT zalo_id
         FROM USER
         WHERE JSON_CONTAINS(roles, JSON_QUOTE(:role))
           AND status = 'ACTIVE'
           AND zalo_id IS NOT NULL`,
        { role: Roles.PROD }
      );
      await Promise.all(
        (prodUsers || []).map((u) =>
          sendZaloNotice(u.zalo_id, `Có đơn mới ${orderId} cần sản xuất.`)
        )
      );
    } catch {
      // ignore
    }

    res.status(201).json({ order_id: orderId });
  } catch (err) {
    next(err);
  }
});

