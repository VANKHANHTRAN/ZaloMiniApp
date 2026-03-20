import express from "express";
import { authRequired } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { Roles, OrderStatus } from "../constants.js";
import { getPool } from "../db.js";
import { getOrderDetail } from "../services/ordersRepo.js";

export const dashboardRouter = express.Router();

dashboardRouter.use(authRequired, requireRole([Roles.MANAGER]));

// Thống kê theo tháng: số đơn mới / đang xử lý / hoàn thành
dashboardRouter.get("/stats", async (req, res, next) => {
  try {
    const pool = getPool();
    // Lấy 2 tháng gần nhất (bao gồm tháng hiện tại)
    const [rows] = await pool.execute(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') AS ym,
         SUM(CASE WHEN order_status = :new_status THEN 1 ELSE 0 END) AS new_count,
         SUM(CASE WHEN order_status IN (:p1, :p2, :p3, :p4, :p5) THEN 1 ELSE 0 END) AS processing_count,
         SUM(CASE WHEN order_status = :done_status THEN 1 ELSE 0 END) AS completed_count
       FROM ORDER_MAS
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
       GROUP BY ym
       ORDER BY ym`,
      {
        new_status: OrderStatus.NEW_ORDER,
        p1: OrderStatus.IN_PRODUCTION,
        p2: OrderStatus.QC_PROD_PENDING,
        p3: OrderStatus.READY_FOR_INSTALL,
        p4: OrderStatus.IN_INSTALLATION,
        p5: OrderStatus.QC_INSTALL_PENDING,
        done_status: OrderStatus.COMPLETED,
      }
    );

    const data = (rows || []).map((r) => ({
      ym: r.ym,
      month_label: r.ym,
      new_count: Number(r.new_count || 0),
      processing_count: Number(r.processing_count || 0),
      completed_count: Number(r.completed_count || 0),
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// Aging orders: đơn chưa hoàn thành, sort theo ngày tồn, kèm cảnh báo SLA + bottleneck từ history
dashboardRouter.get("/aging-orders", async (req, res, next) => {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT order_id, customer_name, customer_phone, installation_address,
                installation_date, order_status, created_at, updated_at, history
         FROM ORDER_MAS
         WHERE order_status <> :done_status
         ORDER BY DATEDIFF(CURDATE(), DATE(created_at)) DESC, updated_at ASC`,
        { done_status: OrderStatus.COMPLETED }
      );

      const aging = [];
      for (const row of rows || []) {
        const ageDays = Number(
          Math.max(
            0,
            Math.round(
              (Date.now() - new Date(row.created_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        );
        const slaWarning = ageDays > 7;

        // Tính bottleneck từ history: bước nào chiếm nhiều thời gian nhất
        let history = row.history;
        if (typeof history === "string") {
          try {
            history = JSON.parse(history);
          } catch {
            history = [];
          }
        }
        if (!Array.isArray(history)) history = [];

        let bottleneck = null;
        if (history.length > 1) {
          let prevTime = new Date(row.created_at).getTime();
          let maxDur = -1;
          for (let i = 0; i < history.length; i++) {
            const h = history[i];
            const t = h.time ? new Date(h.time).getTime() : prevTime;
            const durMs = Math.max(0, t - prevTime);
            const durDays = durMs / (1000 * 60 * 60 * 24);
            if (durDays >= maxDur) {
              maxDur = durDays;
              bottleneck = {
                status: h.status,
                role: h.role,
                duration_days: Number(durDays.toFixed(1)),
              };
            }
            prevTime = t;
          }
        }

        aging.push({
          order_id: row.order_id,
          customer_name: row.customer_name,
          order_status: row.order_status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          age_days: ageDays,
          sla_warning: slaWarning,
          bottleneck,
        });
      }

      res.json({ data: aging });
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

