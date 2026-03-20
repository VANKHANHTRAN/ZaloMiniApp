// Kiểm thử luồng nghiệp vụ backend bằng supertest + node:test
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/index.js";
import { OrderStatus } from "../src/constants.js";
import { getPool } from "../src/db.js";

// Helper: login theo SĐT, trả về token
async function login(phone) {
  const res = await request(app).post("/api/auth/login").send({ phone_number: phone });
  return res;
}

// 1) Kiểm tra login cho dải số demo
test("Auth: login demo users 0900000001-0900000005", async () => {
  for (let i = 1; i <= 5; i++) {
    const phone = `090000000${i}`;
    const res = await login(phone);
    if (res.statusCode !== 200) {
      // Log chi tiết để debug (ví dụ lỗi kết nối DB)
      // eslint-disable-next-line no-console
      console.error(`Login failed for ${phone}`, {
        status: res.statusCode,
        body: res.body,
      });
    }
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.token, "Token phải tồn tại");
  }
});

// Helper: tạo header Authorization
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// 2) Order lifecycle: NEW_ORDER -> IN_PRODUCTION, kiểm tra history JSON
test("Order lifecycle + history log", async () => {
  // Login SALE & PROD
  const saleToken = (await login("0900000001")).body.token;
  const prodToken = (await login("0900000002")).body.token;

  // Tạo đơn mới
  const createRes = await request(app)
    .post("/api/orders/sale")
    .set(authHeader(saleToken))
    .send({
      customer_name: "Test Customer",
      customer_phone: "0900000999",
      installation_address: "Test address",
      installation_date: "2030-01-01",
      items: [{ door_model: "M1", quantity: 1 }],
    });
  assert.equal(createRes.statusCode, 201);
  const orderId = createRes.body.order_id;
  assert.ok(orderId);

  // PROD bắt đầu sản xuất: NEW_ORDER -> IN_PRODUCTION
  const startRes = await request(app)
    .post(`/api/orders/production/${orderId}/start`)
    .set(authHeader(prodToken))
    .send({ note: "Bắt đầu test sản xuất" });
  assert.equal(startRes.statusCode, 200);

  // Lấy chi tiết đơn, kiểm tra history
  const detailRes = await request(app)
    .get(`/api/orders/detail/${orderId}`)
    .set(authHeader(saleToken));
  assert.equal(detailRes.statusCode, 200);
  const detail = detailRes.body.data;
  assert.ok(Array.isArray(detail.history), "History phải là mảng");
  const statuses = detail.history.map((h) => h.status);
  assert.equal(statuses[0], OrderStatus.NEW_ORDER);
  assert.ok(statuses.includes(OrderStatus.IN_PRODUCTION));
});

// 3) Transaction & upload: nếu upload lỗi (ví dụ gửi >20 ảnh), DB phải rollback trạng thái
test("Transaction: upload lỗi phải rollback trạng thái", async () => {
  const saleToken = (await login("0900000001")).body.token;
  const prodToken = (await login("0900000002")).body.token;

  // Tạo đơn
  const createRes = await request(app)
    .post("/api/orders/sale")
    .set(authHeader(saleToken))
    .send({
      customer_name: "Rollback Test",
      customer_phone: "0900000888",
      installation_address: "Rollback address",
      installation_date: "2030-01-02",
      items: [{ door_model: "M2", quantity: 1 }],
    });
  assert.equal(createRes.statusCode, 201);
  const orderId = createRes.body.order_id;

  // Đưa đơn vào IN_PRODUCTION
  await request(app)
    .post(`/api/orders/production/${orderId}/start`)
    .set(authHeader(prodToken))
    .send({ note: "Chuẩn bị test rollback" })
    .expect(200);

  // Gửi 21 file để vượt limit 20 ảnh -> upload service sẽ throw
  let reqUpload = request(app)
    .post(`/api/orders/production/${orderId}/finish`)
    .set(authHeader(prodToken));
  for (let i = 0; i < 21; i++) {
    // Đính kèm file giả (buffer rỗng), supertest yêu cầu đường dẫn nên dùng Buffer workaround
    reqUpload = reqUpload.attach("photos", Buffer.from("test"), {
      filename: `f${i}.jpg`,
      contentType: "image/jpeg",
    });
  }
  const uploadRes = await reqUpload;
  assert.equal(uploadRes.statusCode, 400);

  // Kiểm tra lại trạng thái đơn trong DB vẫn là IN_PRODUCTION (không lên QC_PROD_PENDING)
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT order_status FROM ORDER_MAS WHERE order_id = :order_id`,
    { order_id: orderId }
  );
  const row = rows?.[0];
  assert.ok(row);
  assert.equal(row.order_status, OrderStatus.IN_PRODUCTION);
});

// 4) Dashboard stats & aging: API không lỗi và trả đúng format tối thiểu
test("Dashboard stats & aging API", async () => {
  // Login MANAGER
  const managerRes = await login("0900000005");
  assert.equal(managerRes.statusCode, 200);
  const managerToken = managerRes.body.token;
  assert.ok(managerToken);

  const statsRes = await request(app)
    .get("/api/dashboard/stats")
    .set(authHeader(managerToken));
  assert.equal(statsRes.statusCode, 200);
  assert.ok(Array.isArray(statsRes.body.data));
  if (statsRes.body.data.length > 0) {
    const row = statsRes.body.data[0];
    assert.ok("ym" in row);
    assert.ok("new_count" in row);
    assert.ok("processing_count" in row);
    assert.ok("completed_count" in row);
  }

  const agingRes = await request(app)
    .get("/api/dashboard/aging-orders")
    .set(authHeader(managerToken));
  assert.equal(agingRes.statusCode, 200);
  assert.ok(Array.isArray(agingRes.body.data));
  if (agingRes.body.data.length > 0) {
    const row = agingRes.body.data[0];
    assert.ok("order_id" in row);
    assert.ok("age_days" in row);
    assert.ok("sla_warning" in row);
  }
});


