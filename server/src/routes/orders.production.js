import express from "express";
import multer from "multer";
import { z } from "zod";

import { authRequired } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { Roles, OrderStatus, VisibleStatusByRole } from "../constants.js";
import { withTx } from "../db.js";
import { getPool } from "../db.js";
import { makeHistoryLog } from "../services/history.js";
import {
  appendHistoryAndSetStatus,
  assertTransition,
  getOrderById,
  listOrdersByStatuses,
  computeDurationFromLastStep,
} from "../services/ordersRepo.js";
import { cleanupFiles, saveUploadedFilesOrThrow } from "../services/upload.js";
import { sendZaloNotice } from "../services/zaloNotice.js";

export const productionOrdersRouter = express.Router();
productionOrdersRouter.use(authRequired, requireRole([Roles.PROD]));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 20 },
});

productionOrdersRouter.get("/", async (req, res, next) => {
  try {
    const statuses = VisibleStatusByRole.PROD;
    const rows = await withTx((conn) => listOrdersByStatuses(conn, statuses));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// Thợ sản xuất nhận đơn: NEW_ORDER -> IN_PRODUCTION
productionOrdersRouter.post("/:orderId/start", async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const note = z
      .object({ note: z.string().max(500).optional() })
      .parse(req.body || {}).note;

    await withTx(async (conn) => {
      const order = await getOrderById(conn, orderId);
      if (!order) {
        const err = new Error("Không tìm thấy đơn");
        err.statusCode = 404;
        throw err;
      }
      assertTransition(order.order_status, OrderStatus.IN_PRODUCTION);

      const log = makeHistoryLog({
        status: OrderStatus.IN_PRODUCTION,
        by: req.user.full_name,
        role: Roles.PROD,
        note: note || "Bắt đầu sản xuất",
        photos: [],
        duration_from_last_step: computeDurationFromLastStep(order),
      });
      await appendHistoryAndSetStatus(conn, {
        orderId,
        nextStatus: OrderStatus.IN_PRODUCTION,
        log,
      });
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Thợ sản xuất hoàn tất, upload 10 ảnh + note: IN_PRODUCTION -> QC_PROD_PENDING
productionOrdersRouter.post(
  "/:orderId/finish",
  upload.array("photos", 10),
  async (req, res, next) => {
    const orderId = req.params.orderId;
    let savedPaths = [];

    try {
      const note = z
        .object({ note: z.string().max(500).optional() })
        .parse(req.body || {}).note;

      await withTx(async (conn) => {
        const order = await getOrderById(conn, orderId);
        if (!order) {
          const err = new Error("Không tìm thấy đơn");
          err.statusCode = 404;
          throw err;
        }
        assertTransition(order.order_status, OrderStatus.QC_PROD_PENDING);

        // Upload ảnh trước, nếu lỗi => throw => rollback
        savedPaths = await saveUploadedFilesOrThrow({
          files: req.files || [],
          orderId,
          step: "PROD",
          uploadDir: process.env.UPLOAD_DIR,
        });

        const log = makeHistoryLog({
          status: OrderStatus.QC_PROD_PENDING,
          by: req.user.full_name,
          role: Roles.PROD,
          note: note || "Hoàn tất sản xuất, chờ QC",
          photos: savedPaths,
          duration_from_last_step: computeDurationFromLastStep(order),
        });

        await appendHistoryAndSetStatus(conn, {
          orderId,
          nextStatus: OrderStatus.QC_PROD_PENDING,
          log,
        });
      });

      // Notice cho QC (best-effort)
      try {
        const pool = getPool();
        const [qcUsers] = await pool.execute(
          `SELECT zalo_id
           FROM USER
           WHERE JSON_CONTAINS(roles, JSON_QUOTE(:role))
             AND status = 'ACTIVE'
             AND zalo_id IS NOT NULL`,
          { role: Roles.QC }
        );
        await Promise.all(
          (qcUsers || []).map((u) =>
            sendZaloNotice(
              u.zalo_id,
              `Đơn ${orderId} đã xong sản xuất, chờ QC duyệt.`
            )
          )
        );
      } catch {
        // ignore
      }

      res.json({ ok: true });
    } catch (err) {
      // Nếu lỗi sau khi đã lưu file => dọn file (rollback DB đã làm trong withTx)
      await cleanupFiles(savedPaths);
      next(err);
    }
  }
);

