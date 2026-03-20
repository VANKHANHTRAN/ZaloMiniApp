import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { authRequired } from "../middleware/auth.js";
import { VisibleStatusByRole } from "../constants.js";
import { getPool } from "../db.js";
import { getOrderDetail } from "../services/ordersRepo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");

/** Chuyển đường dẫn file thành path tương đối để frontend gọi /api/uploads/... */
function toPhotoUrls(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.map((p) => {
    if (typeof p !== "string") return p;
    try {
      const rel = path.relative(uploadDir, p);
      return rel.replace(/\\/g, "/");
    } catch {
      return p;
    }
  });
}

/** API chi tiết đơn: history + items. Chỉ user có quyền (role thấy được trạng thái đơn) mới xem được. */
export const orderDetailRouter = express.Router();

orderDetailRouter.get("/:orderId", authRequired, async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const role = (req.user?.roles || [])[0];
    const allowed = VisibleStatusByRole[role];
    if (!allowed || !Array.isArray(allowed)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      const detail = await getOrderDetail(conn, orderId);
      if (!detail) return res.status(404).json({ error: "Không tìm thấy đơn" });
      if (!allowed.includes(detail.order_status)) {
        return res.status(403).json({ error: "Bạn không có quyền xem đơn này" });
      }
      // Ghi log lưu path tuyệt đối; trả về client dạng path tương đối cho URL ảnh
      if (Array.isArray(detail.history)) {
        detail.history = detail.history.map((h) => ({
          ...h,
          photos: toPhotoUrls(h.photos || []),
        }));
      }
      res.json({ data: detail });
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});
