import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Box, Text, Button, Input } from "zmp-ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import {
  getDashboardStats,
  getDashboardAgingOrders,
  getManagerUsers,
  createUser,
  updateUser,
  getManagerOrders,
} from "../lib/api";

const ORDER_STATUS_OPTIONS = [
  "ALL",
  "NEW_ORDER",
  "IN_PRODUCTION",
  "QC_PROD_PENDING",
  "READY_FOR_INSTALL",
  "IN_INSTALLATION",
  "QC_INSTALL_PENDING",
  "COMPLETED",
];

function BigButton(props) {
  return <Button fullWidth size="large" {...props} />;
}

function StatCard({ label, value, color }) {
  return (
    <Box
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid #eee",
        textAlign: "center",
        background: "#fff",
      }}
    >
      <Text size="small" style={{ opacity: 0.8 }}>
        {label}
      </Text>
      <Text.Title style={{ color }}>{value}</Text.Title>
    </Box>
  );
}

function getRoleDisplay(u) {
  const r = u.roles;
  if (Array.isArray(r)) return r.join(", ");
  if (typeof r === "string") return r;
  return String(r || "");
}

export default function ManagerPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState([]);
  const [dashboardAging, setDashboardAging] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [form, setForm] = useState({
    phone_number: "",
    full_name: "",
    role: "SALE",
    zalo_id: "",
    status: "ACTIVE",
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [userActionError, setUserActionError] = useState("");
  const [userActionSuccess, setUserActionSuccess] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "SALE", zalo_id: "", status: "ACTIVE" });
  const [editLoading, setEditLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const u = await getManagerUsers();
      setUsers(u || []);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const list = await getManagerOrders(orderStatusFilter);
      setOrders(list || []);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (tab !== "dashboard") return;
    (async () => {
      setDashboardLoading(true);
      setDashboardError("");
      try {
        const [s, a] = await Promise.all([getDashboardStats(), getDashboardAgingOrders()]);
        setDashboardStats(s || []);
        // backend đã sort theo age_days desc, vẫn giữ sort để chắc chắn
        setDashboardAging((a || []).slice().sort((x, y) => y.age_days - x.age_days));
      } catch (e) {
        setDashboardError("Không tải được dashboard analytics.");
        // eslint-disable-next-line no-console
        console.error("Load dashboard analytics failed", e);
      } finally {
        setDashboardLoading(false);
      }
    })();
  }, [tab]);

  useEffect(() => {
    if (tab === "orders") loadOrders();
  }, [tab, orderStatusFilter]);

  async function handleCreateUser(e) {
    e?.preventDefault();
    setUserActionError("");
    setUserActionSuccess("");
    setSubmitLoading(true);
    try {
      await createUser({
        phone_number: form.phone_number,
        full_name: form.full_name,
        role: form.role,
        zalo_id: form.zalo_id || undefined,
        status: form.status,
      });
      setForm({ phone_number: "", full_name: "", role: "SALE", zalo_id: "", status: "ACTIVE" });
      await loadUsers();
      setTab("users");
      setUserActionSuccess("Đã tạo / cập nhật user thành công.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Create user failed", err);
      setUserActionError(err?.response?.data?.error || err?.message || "Tạo user thất bại");
    } finally {
      setSubmitLoading(false);
    }
  }

  function openEditUser(u) {
    setEditingUserId(u.user_id);
    setEditForm({
      full_name: u.full_name || "",
      role: Array.isArray(u.roles) ? u.roles[0] : (u.roles || "SALE"),
      zalo_id: u.zalo_id || "",
      status: u.status || "ACTIVE",
    });
  }

  async function handleUpdateUser(e) {
    e?.preventDefault();
    if (!editingUserId) return;
    setUserActionError("");
    setUserActionSuccess("");
    setEditLoading(true);
    try {
      await updateUser(editingUserId, {
        full_name: editForm.full_name,
        role: editForm.role,
        zalo_id: editForm.zalo_id || null,
        status: editForm.status,
      });
      setEditingUserId(null);
      await loadUsers();
      setUserActionSuccess("Đã cập nhật user thành công.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Update user failed", err);
      setUserActionError(err?.response?.data?.error || err?.message || "Cập nhật user thất bại");
    } finally {
      setEditLoading(false);
    }
  }

  const latest = dashboardStats[dashboardStats.length - 1];
  const prev = dashboardStats[dashboardStats.length - 2];

  return (
    <Page>
      <Box p={4}>
        <Text.Title>Quản lý</Text.Title>
        <Text size="small">{user?.full_name}</Text>

        <Box mt={3} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button size="small" onClick={() => setTab("dashboard")}>Dashboard</Button>
          <Button size="small" onClick={() => setTab("orders")}>Đơn hàng</Button>
          <Button size="small" onClick={() => setTab("users")}>User</Button>
          <Button size="small" onClick={() => setTab("create")}>Tạo User</Button>
        </Box>

        {userActionError ? (
          <Box mt={2}>
            <Text style={{ color: "red" }}>{userActionError}</Text>
          </Box>
        ) : null}
        {userActionSuccess ? (
          <Box mt={2}>
            <Text style={{ color: "#2BB673" }}>{userActionSuccess}</Text>
          </Box>
        ) : null}

        {tab === "dashboard" && (
          <Box mt={3}>
            <Text.Title size="small">Dashboard Analytics</Text.Title>

            {dashboardError ? (
              <Box mt={2}>
                <Text style={{ color: "red" }}>{dashboardError}</Text>
              </Box>
            ) : null}

            {dashboardLoading ? (
              <Box mt={3}>
                <Text>Đang tải analytics...</Text>
              </Box>
            ) : (
              <>
                <Box mt={2}>
                  <Text.Title size="small">Thống kê tháng (hiện tại vs trước)</Text.Title>
                  <Box
                    mt={2}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10,
                    }}
                  >
                    <StatCard
                      label={`Mới (${latest?.month_label || "-"})`}
                      value={latest?.new_count ?? 0}
                      color="#0068FF"
                    />
                    <StatCard
                      label="Đang xử lý"
                      value={latest?.processing_count ?? 0}
                      color="#FF9900"
                    />
                    <StatCard
                      label="Hoàn thành"
                      value={latest?.completed_count ?? 0}
                      color="#2BB673"
                    />
                  </Box>

                  {prev ? (
                    <Box mt={1}>
                      <Text size="small" style={{ opacity: 0.7 }}>
                        Tháng trước ({prev.month_label}): mới {prev.new_count}, đang xử lý{" "}
                        {prev.processing_count}, hoàn thành {prev.completed_count}
                      </Text>
                    </Box>
                  ) : null}
                </Box>

                <Box mt={3} style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardStats}>
                      <XAxis dataKey="month_label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="new_count" name="Đơn mới" stackId="a" fill="#0068FF" />
                      <Bar
                        dataKey="processing_count"
                        name="Đang xử lý"
                        stackId="a"
                        fill="#FF9900"
                      />
                      <Bar
                        dataKey="completed_count"
                        name="Hoàn thành"
                        stackId="a"
                        fill="#2BB673"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                <Box mt={4}>
                  <Text.Title size="small">Đơn tồn (Aging & SLA)</Text.Title>

                  {dashboardAging.length === 0 ? (
                    <Text size="small" mt={2}>
                      Không có đơn tồn.
                    </Text>
                  ) : (
                    <Box mt={2}>
                      {dashboardAging.slice(0, 20).map((o) => {
                        let color = "#333";
                        if (o.age_days > 10) color = "red";
                        else if (o.age_days > 5) color = "#D4A017";

                        return (
                          <Box
                            key={o.order_id}
                            style={{
                              padding: 12,
                              marginBottom: 8,
                              borderRadius: 12,
                              border: "1px solid #eee",
                              background: "#fff",
                            }}
                          >
                            <Text size="small" bold>
                              {o.order_id} — {o.order_status}
                            </Text>
                            <Text size="small">
                              {" "}
                              — {o.customer_name}
                            </Text>
                            <Text size="small" style={{ color }} mt={1}>
                              {o.age_days} ngày tồn
                            </Text>
                            {o.bottleneck ? (
                              <Text size="small" mt={1} style={{ opacity: 0.8 }}>
                                Bottleneck: {o.bottleneck.status} ({o.bottleneck.role}) —{" "}
                                {o.bottleneck.duration_days} ngày
                              </Text>
                            ) : null}
                            <Box mt={1}>
                              <Button
                                size="small"
                                variant="secondary"
                                onClick={() => navigate(`/order/${o.order_id}`)}
                              >
                                Xem tiến độ
                              </Button>
                            </Box>
                          </Box>
                        );
                      })}
                      {dashboardAging.length > 20 ? (
                        <Text size="small" style={{ opacity: 0.7 }}>
                          Hiển thị 20 đơn tồn gần nhất theo độ ưu tiên.
                        </Text>
                      ) : null}
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}

        {tab === "orders" && (
          <Box mt={3}>
            <Text.Title size="small">Danh sách đơn theo trạng thái</Text.Title>
            <Box mt={2}>
              <Text size="small">Trạng thái</Text>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                style={{ width: "100%", padding: 10, marginTop: 4, borderRadius: 8 }}
              >
                <option value="ALL">Tất cả</option>
                {ORDER_STATUS_OPTIONS.filter((s) => s !== "ALL").map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Box>
            {ordersLoading ? (
              <Text style={{ marginTop: 12 }}>Đang tải...</Text>
            ) : (
              <Box mt={2}>
                {orders.length === 0 ? (
                  <Text size="small">Không có đơn nào.</Text>
                ) : (
                  orders.map((o) => (
                    <Box
                      key={o.order_id}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        borderRadius: 12,
                        border: "1px solid #eee",
                      }}
                    >
                      <Text size="small" bold>{o.order_id}</Text>
                      <Text size="small"> — {o.order_status}</Text>
                      <Text size="small"> — {o.customer_name} — {o.installation_date}</Text>
                      <Box mt={1}>
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => navigate(`/order/${o.order_id}`)}
                        >
                          Xem tiến độ
                        </Button>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            )}
          </Box>
        )}

        {tab === "users" && (
          <Box mt={3}>
            <Text.Title size="small">Danh sách User</Text.Title>
            {loading ? (
              <Text>Đang tải...</Text>
            ) : (
              <Box mt={2}>
                {users.map((u) => (
                  <Box
                    key={u.user_id}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 12,
                      border: "1px solid #eee",
                    }}
                  >
                    {editingUserId === u.user_id ? (
                      <Box>
                        <Input
                          label="Họ tên"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                        />
                        <Box mt={1}>
                          <Text size="small">Role</Text>
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                            style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8 }}
                          >
                            <option value="SALE">SALE</option>
                            <option value="PROD">PROD</option>
                            <option value="INSTALL">INSTALL</option>
                            <option value="QC">QC</option>
                            <option value="MANAGER">MANAGER</option>
                          </select>
                        </Box>
                        <Input
                          label="Zalo ID"
                          value={editForm.zalo_id}
                          onChange={(e) => setEditForm((f) => ({ ...f, zalo_id: e.target.value }))}
                        />
                        <Box mt={1}>
                          <Text size="small">Trạng thái</Text>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                            style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8 }}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                          </select>
                        </Box>
                        <Box mt={2} style={{ display: "flex", gap: 8 }}>
                          <Button size="small" loading={editLoading} onClick={(e) => handleUpdateUser(e)}>
                            Lưu
                          </Button>
                          <Button size="small" variant="secondary" onClick={() => setEditingUserId(null)}>Hủy</Button>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Text>{u.full_name}</Text>
                        <Text size="small"> SĐT: {u.phone_number}</Text>
                        <Text size="small"> Role: {getRoleDisplay(u)}</Text>
                        <Text size="small"> Trạng thái: {u.status}</Text>
                        <Box mt={1}>
                          <Button size="small" onClick={() => openEditUser(u)}>Sửa</Button>
                        </Box>
                      </>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {tab === "create" && (
          <Box mt={3}>
            <Text.Title size="small">Tạo User (1 role/user)</Text.Title>
            <Input
              label="Số điện thoại"
              value={form.phone_number}
              onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
              placeholder="0900000001"
            />
            <Input
              label="Họ tên"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
            <Box mt={2}>
              <Text size="small">Role</Text>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                style={{ width: "100%", padding: 10, marginTop: 4, borderRadius: 8 }}
              >
                <option value="SALE">SALE</option>
                <option value="PROD">PROD</option>
                <option value="INSTALL">INSTALL</option>
                <option value="QC">QC</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </Box>
            <Input
              label="Zalo ID (tùy chọn)"
              value={form.zalo_id}
              onChange={(e) => setForm((f) => ({ ...f, zalo_id: e.target.value }))}
            />
            <Box mt={2}>
              <Text size="small">Trạng thái</Text>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                style={{ width: "100%", padding: 10, marginTop: 4, borderRadius: 8 }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </Box>
            <Box mt={3}>
              <BigButton loading={submitLoading} onClick={(e) => handleCreateUser(e)}>
                Tạo / Cập nhật User
              </BigButton>
            </Box>
          </Box>
        )}
        <Box mt={1}>
          <Button variant="secondary" onClick={logout}>Đăng xuất</Button>
        </Box>
      </Box>
    </Page>
  );
}
