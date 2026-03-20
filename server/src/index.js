import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authRouter } from "./routes/auth.js";
import { saleOrdersRouter } from "./routes/orders.sale.js";
import { productionOrdersRouter } from "./routes/orders.production.js";
import { installationOrdersRouter } from "./routes/orders.installation.js";
import { qcOrdersRouter } from "./routes/orders.qc.js";
import { orderDetailRouter } from "./routes/orders.detail.js";
import { managerRouter } from "./routes/manager.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/orders/sale", saleOrdersRouter);
app.use("/api/orders/production", productionOrdersRouter);
app.use("/api/orders/installation", installationOrdersRouter);
app.use("/api/orders/qc", qcOrdersRouter);
app.use("/api/orders/detail", orderDetailRouter);
app.use("/api/manager", managerRouter);
app.use("/api/dashboard", dashboardRouter);

// Phục vụ ảnh đã upload (để hiển thị trong timeline / grid)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, "..", process.env.UPLOAD_DIR || "uploads");
app.use("/api/uploads", express.static(uploadDir));

app.use((err, req, res, next) => {
  const statusCode = err?.statusCode || 500;
  // Log chi tiết lỗi backend để debug (bao gồm stack)
  // eslint-disable-next-line no-console
  console.error("API error:", err);
  const message = statusCode === 500 ? "Internal error" : err.message;
  res.status(statusCode).json({ error: message });
});

const port = Number(process.env.PORT || 8080);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on :${port}`);
  });
}

export { app };

