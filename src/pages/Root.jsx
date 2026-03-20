import React from "react";
import { Page, Box, Text, Button, Input, Tabs } from "zmp-ui";
import {
  installFinish,
  installStart,
  listOrders,
  loginByPhone,
  me,
  prodFinish,
  prodStart,
  qcApproveInstall,
  qcApproveProd,
  saleCreateOrder,
} from "../lib/api.js";

function useAsyncState(initial) {
  const [state, setState] = React.useState(initial);
  return [state, setState];
}

function RoleBadge({ roles }) {
  return (
    <Text size="small" style={{ opacity: 0.8 }}>
      Role: {(roles || []).join(", ")}
    </Text>
  );
}

function BigButton(props) {
  return <Button fullWidth size="large" {...props} />;
}

function PhotosPicker({ onChange }) {
  return (
    <Input
      type="file"
      multiple
      accept="image/*"
      onChange={(e) => onChange(Array.from(e.target.files || []))}
    />
  );
}

function OrderCard({ o, children }) {
  return (
    <Box
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid #eee",
        marginBottom: 10,
      }}
    >
      <Text.Title>{o.order_id}</Text.Title>
      <Text size="small">Khách: {o.customer_name} — {o.customer_phone}</Text>
      <Text size="small">Lắp: {o.installation_date}</Text>
      <Text size="small">Trạng thái: {o.order_status}</Text>
      <Box mt={2}>{children}</Box>
    </Box>
  );
}

export default function Root() {
  const [phone, setPhone] = useAsyncState("");
  const [user, setUser] = useAsyncState(null);
  const [orders, setOrders] = useAsyncState([]);
  const [loading, setLoading] = useAsyncState(false);
  const [error, setError] = useAsyncState("");

  const role = (user?.roles || [])[0]; // enforce 1 role/user

  async function refresh() {
    if (!role) return;
    const rolePath =
      role === "SALE"
        ? "sale"
        : role === "PROD"
          ? "production"
          : role === "INSTALL"
            ? "installation"
            : role === "QC"
              ? "qc"
              : "sale";
    const rows = await listOrders(rolePath);
    setOrders(rows);
  }

  async function doLogin() {
    setError("");
    setLoading(true);
    try {
      await loginByPhone(phone);
      const u = await me();
      setUser(u);
      await refresh();
    } catch (e) {
      setError("Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function optimisticRemove(orderId) {
    // Optimistic UI: update xong tự ẩn khỏi màn hình bằng filter()
    setOrders((prev) => prev.filter((x) => x.order_id !== orderId));
  }

  if (!user) {
    return (
      <Page>
        <Box p={4}>
          <Text.Title>Đăng nhập</Text.Title>
          <Text size="small" style={{ opacity: 0.8 }}>
            Nhập SĐT đã có trong bảng USER (demo).
          </Text>
          <Box mt={3}>
            <Input
              label="Số điện thoại"
              placeholder="0900000001"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Box>
          <Box mt={3}>
            <BigButton loading={loading} onClick={doLogin}>
              Vào hệ thống
            </BigButton>
          </Box>
          {error ? (
            <Box mt={2}>
              <Text style={{ color: "red" }}>{error}</Text>
            </Box>
          ) : null}
        </Box>
      </Page>
    );
  }

  return (
    <Page>
      <Box p={4}>
        <Text.Title>Quản lý đơn</Text.Title>
        <Text size="small">{user.full_name}</Text>
        <RoleBadge roles={user.roles} />

        <Box mt={3}>
          <BigButton variant="secondary" onClick={refresh}>
            Tải lại danh sách
          </BigButton>
        </Box>

        {role === "SALE" ? (
          <SaleCreate onCreated={refresh} />
        ) : null}

        <Box mt={3}>
          <Text.Title size="small">Danh sách đơn</Text.Title>
          {orders.map((o) => (
            <OrderCard key={o.order_id} o={o}>
              {role === "PROD" ? (
                <ProdActions
                  o={o}
                  onDone={async () => {
                    await optimisticRemove(o.order_id);
                  }}
                />
              ) : null}
              {role === "INSTALL" ? (
                <InstallActions
                  o={o}
                  onDone={async () => {
                    await optimisticRemove(o.order_id);
                  }}
                />
              ) : null}
              {role === "QC" ? (
                <QCActions
                  o={o}
                  onDone={async () => {
                    await optimisticRemove(o.order_id);
                  }}
                />
              ) : null}
            </OrderCard>
          ))}
        </Box>
      </Box>
    </Page>
  );
}

function SaleCreate({ onCreated }) {
  const [customer_name, setName] = React.useState("");
  const [customer_phone, setPhone] = React.useState("");
  const [installation_address, setAddr] = React.useState("");
  const [installation_date, setDate] = React.useState("");
  const [door_model, setModel] = React.useState("");
  const [quantity, setQty] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

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

function ProdActions({ o, onDone }) {
  const [note, setNote] = React.useState("");
  const [photos, setPhotos] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  async function start() {
    setLoading(true);
    try {
      await prodStart(o.order_id, note);
      await onDone?.();
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setLoading(true);
    try {
      await prodFinish(o.order_id, { note, photos });
      await onDone?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs>
      <Tabs.Tab key="a" label="Bắt đầu">
        <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <Box mt={2}>
          <BigButton loading={loading} onClick={start}>
            NEW_ORDER → IN_PRODUCTION
          </BigButton>
        </Box>
      </Tabs.Tab>
      <Tabs.Tab key="b" label="Hoàn tất">
        <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <Box mt={2}>
          <Text size="small">Upload tối đa 10 ảnh.</Text>
          <PhotosPicker onChange={setPhotos} />
        </Box>
        <Box mt={2}>
          <BigButton loading={loading} onClick={finish}>
            IN_PRODUCTION → QC_PROD_PENDING
          </BigButton>
        </Box>
      </Tabs.Tab>
    </Tabs>
  );
}

function InstallActions({ o, onDone }) {
  const [note, setNote] = React.useState("");
  const [photos, setPhotos] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  async function start() {
    setLoading(true);
    try {
      await installStart(o.order_id, note);
      await onDone?.();
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setLoading(true);
    try {
      await installFinish(o.order_id, { note, photos });
      await onDone?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs>
      <Tabs.Tab key="a" label="Bắt đầu">
        <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <Box mt={2}>
          <BigButton loading={loading} onClick={start}>
            READY_FOR_INSTALL → IN_INSTALLATION
          </BigButton>
        </Box>
      </Tabs.Tab>
      <Tabs.Tab key="b" label="Hoàn tất">
        <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <Box mt={2}>
          <Text size="small">Upload tối đa 10 ảnh.</Text>
          <PhotosPicker onChange={setPhotos} />
        </Box>
        <Box mt={2}>
          <BigButton loading={loading} onClick={finish}>
            IN_INSTALLATION → QC_INSTALL_PENDING
          </BigButton>
        </Box>
      </Tabs.Tab>
    </Tabs>
  );
}

function QCActions({ o, onDone }) {
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function approveProd() {
    setLoading(true);
    try {
      await qcApproveProd(o.order_id, note);
      await onDone?.();
    } finally {
      setLoading(false);
    }
  }

  async function approveInstall() {
    setLoading(true);
    try {
      await qcApproveInstall(o.order_id, note);
      await onDone?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Input label="Ghi chú QC" value={note} onChange={(e) => setNote(e.target.value)} />
      <Box mt={2}>
        <BigButton loading={loading} onClick={approveProd}>
          QC_PROD_PENDING → READY_FOR_INSTALL
        </BigButton>
      </Box>
      <Box mt={2}>
        <BigButton loading={loading} onClick={approveInstall}>
          QC_INSTALL_PENDING → COMPLETED
        </BigButton>
      </Box>
    </Box>
  );
}

