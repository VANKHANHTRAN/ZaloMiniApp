import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Page, Box, Text, Button } from "zmp-ui";
import { getOrderDetail } from "../lib/api";

const API_BASE = "/api";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    getOrderDetail(orderId)
      .then(setDetail)
      .catch(() => setError("Không tải được đơn."))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <Page><Box p={4}><Text>Đang tải...</Text></Box></Page>;
  if (error || !detail) {
    return (
      <Page>
        <Box p={4}>
          <Text>{error || "Không tìm thấy đơn."}</Text>
          <Box mt={2}>
            <Button onClick={() => navigate("/")}>Về trang chủ</Button>
          </Box>
        </Box>
      </Page>
    );
  }

  const history = Array.isArray(detail.history) ? detail.history : [];

  return (
    <Page>
      <Box p={4}>
        <Text.Title>{detail.order_id}</Text.Title>
        <Text size="small">Khách: {detail.customer_name} — {detail.customer_phone}</Text>
        <Text size="small">Địa chỉ lắp: {detail.installation_address}</Text>
        <Text size="small">Ngày lắp: {detail.installation_date}</Text>
        <Text size="small">Trạng thái: {detail.order_status}</Text>

        {detail.items?.length > 0 && (
          <Box mt={3}>
            <Text.Title size="small">Chi tiết sản phẩm</Text.Title>
            {detail.items.map((it, i) => (
              <Box key={i} mt={1} style={{ padding: 8, background: "#f5f5f5", borderRadius: 8 }}>
                <Text size="small">{it.door_model} × {it.quantity}</Text>
                {it.notes && <Text size="small"> — {it.notes}</Text>}
              </Box>
            ))}
          </Box>
        )}

        <Box mt={3}>
          <Text.Title size="small">Tiến độ (timeline)</Text.Title>
          {history.length === 0 ? (
            <Text size="small">Chưa có bản ghi.</Text>
          ) : (
            history.map((h, i) => (
              <Box
                key={i}
                mt={2}
                style={{
                  padding: 12,
                  borderLeft: "3px solid #0068FF",
                  background: "#f9f9f9",
                  borderRadius: 0,
                }}
              >
                <Text size="small" bold>{h.status}</Text>
                <Text size="small"> {h.time && new Date(h.time).toLocaleString("vi")}</Text>
                {h.role && <Text size="small"> — {h.role}</Text>}
                {h.note && <Text size="small"> — {h.note}</Text>}
                {Array.isArray(h.photos) && h.photos.length > 0 && (
                  <Box
                    mt={2}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                    }}
                  >
                    {h.photos.map((rel, j) => (
                      <a
                        key={j}
                        href={`${API_BASE}/uploads/${rel}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "block" }}
                      >
                        <img
                          src={`${API_BASE}/uploads/${rel}`}
                          alt=""
                          style={{
                            width: "100%",
                            aspectRatio: 1,
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                      </a>
                    ))}
                  </Box>
                )}
              </Box>
            ))
          )}
        </Box>

        <Box mt={4}>
          <Button fullWidth onClick={() => navigate("/")}>
            Về trang chủ
          </Button>
        </Box>
      </Box>
    </Page>
  );
}
