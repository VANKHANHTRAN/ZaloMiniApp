import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Box, Text, Button, Input } from "zmp-ui";
import { useAuth } from "../contexts/AuthContext";
import {
  listOrders,
  saleCreateOrder,
  prodStart,
  prodFinish,
  installStart,
  installFinish,
  qcApproveProd,
  qcApproveInstall,
} from "../lib/api";

const ROLE_PATH = {
  SALE: "sale",
  PROD: "production",
  INSTALL: "installation",
  QC: "qc",
};

function BigButton(props) {
  return <Button fullWidth size="large" {...props} />;
}

function PhotosPicker({ onChange, max = 10 }) {
  const [previews, setPreviews] = useState([]);
  const handleChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, max);
    onChange(files);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => {
      prev.forEach(URL.revokeObjectURL);
      return urls;
    });
  };
  return (
    <Box>
      <Input type="file" multiple accept="image/*" onChange={handleChange} />
      {previews.length > 0 && (
        <Box
          mt={2}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {previews.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              style={{ width: "100%", aspectRatio: 1, objectFit: "cover", borderRadius: 8 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

function OrderCard({ order, role, onActionDone }) {
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleStartProd = async () => {
    setLoading(true);
    try {
      await prodStart(order.order_id, note);
      onActionDone?.(order.order_id);
    } finally {
      setLoading(false);
    }
  };
  const handleFinishProd = async () => {
    setLoading(true);
    try {
      await prodFinish(order.order_id, { note, photos });
      onActionDone?.(order.order_id);
    } finally {
      setLoading(false);
    }
  };
  const handleStartInstall = async () => {
    setLoading(true);
    try {
      await installStart(order.order_id, note);
      onActionDone?.(order.order_id);
    } finally {
      setLoading(false);
    }
  };
  const handleFinishInstall = async () => {
    setLoading(true);
    try {
      await installFinish(order.order_id, { note, photos });
      onActionDone?.(order.order_id);
    } finally {
      setLoading(false);
    }
  };
  const handleApproveProd = async () => {
    setLoading(true);
    try {
      await qcApproveProd(order.order_id, note);
      onActionDone?.(order.order_id);
    } finally {
      setLoading(false);
    }
  };
  const handleApproveInstall = async () => {
    setLoading(true);
    try {
      await qcApproveInstall(order.order_id, note);
      onActionDone?.(order.order_id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid #eee",
        marginBottom: 12,
      }}
    >
      <Text.Title size="small">{order.order_id}</Text.Title>
      <Text size="small">
        Khách: {order.customer_name} — {order.customer_phone}
      </Text>
      <Text size="small">Lắp: {order.installation_date}</Text>
      <Text size="small">Trạng thái: {order.order_status}</Text>
      <Box mt={2}>
        <BigButton variant="secondary" size="small" onClick={() => navigate(`/order/${order.order_id}`)}>
          Xem tiến độ
        </BigButton>
      </Box>
      {role === "PROD" && (
        <Box mt={2}>
          <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
          {order.order_status === "NEW_ORDER" && (
            <Box mt={2}>
              <BigButton loading={loading} onClick={handleStartProd}>
                Bắt đầu sản xuất
              </BigButton>
            </Box>
          )}
          {order.order_status === "IN_PRODUCTION" && (
            <>
              <Text size="small">Tối đa 10 ảnh</Text>
              <PhotosPicker onChange={setPhotos} />
              <Box mt={2}>
                <BigButton loading={loading} onClick={handleFinishProd}>
                  Báo hoàn tất (chờ QC)
                </BigButton>
              </Box>
            </>
          )}
        </Box>
      )}
      {role === "INSTALL" && (
        <Box mt={2}>
          <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
          {order.order_status === "READY_FOR_INSTALL" && (
            <Box mt={2}>
              <BigButton loading={loading} onClick={handleStartInstall}>
                Bắt đầu lắp đặt
              </BigButton>
            </Box>
          )}
          {order.order_status === "IN_INSTALLATION" && (
            <>
              <Text size="small">Tối đa 10 ảnh</Text>
              <PhotosPicker onChange={setPhotos} />
              <Box mt={2}>
                <BigButton loading={loading} onClick={handleFinishInstall}>
                  Báo hoàn tất (chờ QC)
                </BigButton>
              </Box>
            </>
          )}
        </Box>
      )}
      {role === "QC" && (
        <Box mt={2}>
          <Input label="Ghi chú QC" value={note} onChange={(e) => setNote(e.target.value)} />
          {order.order_status === "QC_PROD_PENDING" && (
            <Box mt={2}>
              <BigButton loading={loading} onClick={handleApproveProd}>
                Duyệt đạt SX → READY_FOR_INSTALL
              </BigButton>
            </Box>
          )}
          {order.order_status === "QC_INSTALL_PENDING" && (
            <Box mt={2}>
              <BigButton loading={loading} onClick={handleApproveInstall}>
                Duyệt đạt lắp đặt → COMPLETED
              </BigButton>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function SaleCreate({ onCreated }) {
  const [customer_name, setName] = useState("");
  const [customer_phone, setPhone] = useState("");
  const [installation_address, setAddr] = useState("");
  const [installation_date, setDate] = useState("");
  const [door_model, setModel] = useState("");
  const [quantity, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await saleCreateOrder({
        customer_name,
        customer_phone,
        installation_address,
        installation_date,
        items: [{ door_model, quantity, notes: "" }],
      });
      setName("");
      setPhone("");
      setAddr("");
      setDate("");
      setModel("");
      setQty(1);
      await onCreated?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box mt={4} style={{ padding: 12, borderRadius: 12, border: "1px solid #eee" }}>
      <Text.Title size="small">Tạo đơn (SALE)</Text.Title>
      <Input label="Tên khách" value={customer_name} onChange={(e) => setName(e.target.value)} />
      <Input label="SĐT khách" value={customer_phone} onChange={(e) => setPhone(e.target.value)} />
      <Input label="Địa chỉ lắp" value={installation_address} onChange={(e) => setAddr(e.target.value)} />
      <Input label="Ngày lắp (YYYY-MM-DD)" value={installation_date} onChange={(e) => setDate(e.target.value)} />
      <Input label="Mẫu cửa" value={door_model} onChange={(e) => setModel(e.target.value)} />
      <Input
        label="Số lượng"
        type="number"
        value={String(quantity)}
        onChange={(e) => setQty(Number(e.target.value || 1))}
      />
      <Box mt={2}>
        <BigButton loading={loading} onClick={submit}>
          Tạo đơn
        </BigButton>
      </Box>
    </Box>
  );
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = (user?.roles || [])[0];
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    if (!role || role === "MANAGER") return;
    const path = ROLE_PATH[role];
    if (!path) return;
    const data = await listOrders(path);
    setOrders(data);
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const optimisticRemove = (orderId) => {
    setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
  };

  return (
    <Page>
      <Box p={4}>
        <Text.Title>Quản lý đơn</Text.Title>
        <Text size="small">{user?.full_name} — {(user?.roles || []).join(", ")}</Text>
        <Box mt={2}>
          <BigButton variant="secondary" onClick={load}>
            Tải lại
          </BigButton>
        </Box>
        {role === "SALE" && <SaleCreate onCreated={load} />}
        <Box mt={3}>
          <Text.Title size="small">Danh sách đơn</Text.Title>
          {orders.map((o) => (
            <OrderCard
              key={o.order_id}
              order={o}
              role={role}
              onActionDone={optimisticRemove}
            />
          ))}
        </Box>
        <Box mt={2}>
          <Button variant="secondary" onClick={logout}>Đăng xuất</Button>
        </Box>
      </Box>
    </Page>
  );
}
