import express from "express";
import { z } from "zod";

import { authRequired } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { Roles, OrderStatus, VisibleStatusByRole } from "../constants.js";
import { withTx } from "../db.js";
import { makeHistoryLog } from "../services/history.js";
import {
  appendHistoryAndSetStatus,
  assertTransition,
  getOrderById,
  listOrdersByStatuses,
  computeDurationFromLastStep,
} from "../services/ordersRepo.js";

export const qcOrdersRouter = express.Router();
qcOrdersRouter.use(authRequired, requireRole([Roles.QC]));

qcOrdersRouter.get("/", async (req, res, next) => {
  try {
    const statuses = VisibleStatusByRole.QC;
    const rows = await withTx((conn) => listOrdersByStatuses(conn, statuses));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// QC duyệt khâu sản xuất: QC_PROD_PENDING -> READY_FOR_INSTALL
qcOrdersRouter.post("/:orderId/approve-prod", async (req, res, next) => {
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
      assertTransition(order.order_status, OrderStatus.READY_FOR_INSTALL);

      const log = makeHistoryLog({
        status: OrderStatus.READY_FOR_INSTALL,
        by: req.user.full_name,
        role: Roles.QC,
        note: note || "QC duyệt đạt sản xuất",
        photos: [],
        duration_from_last_step: computeDurationFromLastStep(order),
      });
      await appendHistoryAndSetStatus(conn, {
        orderId,
        nextStatus: OrderStatus.READY_FOR_INSTALL,
        log,
      });
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// QC duyệt khâu lắp đặt: QC_INSTALL_PENDING -> COMPLETED
qcOrdersRouter.post("/:orderId/approve-install", async (req, res, next) => {
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
      assertTransition(order.order_status, OrderStatus.COMPLETED);

      const log = makeHistoryLog({
        status: OrderStatus.COMPLETED,
        by: req.user.full_name,
        role: Roles.QC,
        note: note || "QC duyệt đạt lắp đặt",
        photos: [],
        duration_from_last_step: computeDurationFromLastStep(order),
      });
      await appendHistoryAndSetStatus(conn, {
        orderId,
        nextStatus: OrderStatus.COMPLETED,
        log,
      });
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

