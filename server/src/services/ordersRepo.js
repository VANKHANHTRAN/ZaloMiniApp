import { OrderStatus } from "../constants.js";

export async function getOrderById(conn, orderId) {
  const [rows] = await conn.execute(
    `SELECT order_id, customer_name, customer_phone, installation_address,
            installation_date, order_status, history, created_by
     FROM ORDER_MAS
     WHERE order_id = :order_id
     LIMIT 1`,
    { order_id: orderId }
  );
  return rows?.[0] || null;
}

/** Trả về đơn + history (mảng) + items (ORDER_INF) để hiển thị timeline và grid ảnh */
export async function getOrderDetail(conn, orderId) {
  const order = await getOrderById(conn, orderId);
  if (!order) return null;

  let history = order.history;
  if (typeof history === "string") {
    try {
      history = JSON.parse(history);
    } catch {
      history = [];
    }
  }
  if (!Array.isArray(history)) history = [];

  const [itemRows] = await conn.execute(
    `SELECT order_id, seq, door_model, quantity, item_status, notes
     FROM ORDER_INF
     WHERE order_id = :order_id
     ORDER BY seq`,
    { order_id: orderId }
  );

  return {
    ...order,
    history,
    items: itemRows || [],
  };
}

// Tính duration_from_last_step (chuỗi, ví dụ '2 days') dựa vào history cũ và thời điểm hiện tại
export function computeDurationFromLastStep(order) {
  try {
    let history = order?.history;
    if (typeof history === "string") {
      history = JSON.parse(history);
    }
    if (!Array.isArray(history) || history.length === 0) {
      return "";
    }
    const last = history[history.length - 1];
    if (!last.time) return "";
    const prev = new Date(last.time).getTime();
    const now = Date.now();
    const days = Math.max(0, (now - prev) / (1000 * 60 * 60 * 24));
    if (days < 1) return `${Math.round(days * 24)} hours`;
    return `${Math.round(days)} days`;
  } catch {
    return "";
  }
}

export async function listOrdersByStatuses(conn, statuses) {
  if (!Array.isArray(statuses) || statuses.length === 0) return [];
  const [rows] = await conn.execute(
    `SELECT order_id, customer_name, customer_phone, installation_address,
            installation_date, order_status, history, created_by, created_at, updated_at
     FROM ORDER_MAS
     WHERE order_status IN (${statuses.map((_, i) => `:s${i}`).join(",")})
     ORDER BY updated_at DESC`,
    Object.fromEntries(statuses.map((s, i) => [`s${i}`, s]))
  );
  return rows;
}

export async function appendHistoryAndSetStatus(conn, { orderId, nextStatus, log }) {
  // JSON_ARRAY_APPEND(history, '$', CAST(:log AS JSON))
  // Nếu history null => set JSON_ARRAY(:log)
  await conn.execute(
    `UPDATE ORDER_MAS
     SET order_status = :next_status,
         history = CASE
           WHEN history IS NULL THEN JSON_ARRAY(CAST(:log AS JSON))
           ELSE JSON_ARRAY_APPEND(history, '$', CAST(:log AS JSON))
         END
     WHERE order_id = :order_id`,
    {
      order_id: orderId,
      next_status: nextStatus,
      log: JSON.stringify(log),
    }
  );
}

export function assertTransition(current, next) {
  const ok =
    (current === OrderStatus.NEW_ORDER && next === OrderStatus.IN_PRODUCTION) ||
    (current === OrderStatus.IN_PRODUCTION && next === OrderStatus.QC_PROD_PENDING) ||
    (current === OrderStatus.READY_FOR_INSTALL && next === OrderStatus.IN_INSTALLATION) ||
    (current === OrderStatus.IN_INSTALLATION &&
      next === OrderStatus.QC_INSTALL_PENDING) ||
    (current === OrderStatus.QC_PROD_PENDING && next === OrderStatus.READY_FOR_INSTALL) ||
    (current === OrderStatus.QC_INSTALL_PENDING && next === OrderStatus.COMPLETED);

  if (!ok) {
    const err = new Error(`Không hợp lệ: ${current} -> ${next}`);
    err.statusCode = 400;
    throw err;
  }
}

