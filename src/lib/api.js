import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function loginByPhone(phone_number) {
  const { data } = await api.post("/auth/login", { phone_number });
  localStorage.setItem("token", data.token);
  return data.token;
}

export async function me() {
  const { data } = await api.get("/auth/me");
  return data.data;
}

export async function listOrders(role) {
  const { data } = await api.get(`/orders/${role}`);
  return data.data;
}

/** Chi tiết đơn: history + items (ảnh trả về dạng path tương đối, gắn base /api/uploads/ để hiển thị) */
export async function getOrderDetail(orderId) {
  const { data } = await api.get(`/orders/detail/${orderId}`);
  return data.data;
}

export async function saleCreateOrder(payload) {
  const { data } = await api.post("/orders/sale", payload);
  return data;
}

export async function prodStart(orderId, note) {
  await api.post(`/orders/production/${orderId}/start`, { note });
}
export async function prodFinish(orderId, { note, photos }) {
  const fd = new FormData();
  if (note) fd.append("note", note);
  (photos || []).forEach((f) => fd.append("photos", f));
  await api.post(`/orders/production/${orderId}/finish`, fd);
}

export async function installStart(orderId, note) {
  await api.post(`/orders/installation/${orderId}/start`, { note });
}
export async function installFinish(orderId, { note, photos }) {
  const fd = new FormData();
  if (note) fd.append("note", note);
  (photos || []).forEach((f) => fd.append("photos", f));
  await api.post(`/orders/installation/${orderId}/finish`, fd);
}

export async function qcApproveProd(orderId, note) {
  await api.post(`/orders/qc/${orderId}/approve-prod`, { note });
}
export async function qcApproveInstall(orderId, note) {
  await api.post(`/orders/qc/${orderId}/approve-install`, { note });
}

// Manager
export async function getManagerDashboard() {
  const { data } = await api.get("/manager/dashboard");
  return data.data;
}

export async function getManagerUsers() {
  const { data } = await api.get("/manager/users");
  return data.data;
}

export async function createUser(payload) {
  await api.post("/manager/users", payload);
}

/** Cập nhật user (phân quyền: role, status, full_name, zalo_id) */
export async function updateUser(userId, payload) {
  await api.patch(`/manager/users/${userId}`, payload);
}

/** Danh sách đơn cho Manager; status = 'ALL' hoặc trạng thái cụ thể */
export async function getManagerOrders(status) {
  const params = status && status !== "ALL" ? { status } : {};
  const { data } = await api.get("/manager/orders", { params });
  return data.data;
}

// Dashboard analytics
export async function getDashboardStats() {
  const { data } = await api.get("/dashboard/stats");
  return data.data;
}

export async function getDashboardAgingOrders() {
  const { data } = await api.get("/dashboard/aging-orders");
  return data.data;
}
