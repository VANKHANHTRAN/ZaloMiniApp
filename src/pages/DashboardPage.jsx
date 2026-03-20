import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button } from "zmp-ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getDashboardStats, getDashboardAgingOrders } from "../lib/api";
import { useNavigate } from "react-router-dom";

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

export default function DashboardPage() {
  const [stats, setStats] = useState([]);
  const [aging, setAging] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [s, a] = await Promise.all([getDashboardStats(), getDashboardAgingOrders()]);
        setStats(s || []);
        // Sort theo độ tồn (urgency): đơn tồn lâu nhất lên đầu
        setAging((a || []).sort((x, y) => y.age_days - x.age_days));
      } catch (e) {
        setError("Không tải được dữ liệu dashboard.");
        // eslint-disable-next-line no-console
        console.error("Dashboard error", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const latest = stats[stats.length - 1];
  const prev = stats[stats.length - 2];

  return (
    <Page>
      <Box p={4}>
        <Text.Title>Dashboard</Text.Title>

        {error && (
          <Box mt={2}>
            <Text style={{ color: "red" }}>{error}</Text>
          </Box>
        )}

        {loading ? (
          <Box mt={3}>
            <Text>Đang tải số liệu...</Text>
          </Box>
        ) : (
          <>
            <Box mt={3}>
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
                  label={`Đang xử lý`}
                  value={latest?.processing_count ?? 0}
                  color="#FF9900"
                />
                <StatCard
                  label={`Hoàn thành`}
                  value={latest?.completed_count ?? 0}
                  color="#2BB673"
                />
              </Box>
              {prev && (
                <Box mt={1}>
                  <Text size="small" style={{ opacity: 0.7 }}>
                    Tháng trước ({prev.month_label}): mới {prev.new_count}, đang xử lý{" "}
                    {prev.processing_count}, hoàn thành {prev.completed_count}
                  </Text>
                </Box>
              )}
            </Box>

            <Box mt={3} style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
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
              <Text.Title size="small">Đơn tồn (aging & SLA)</Text.Title>
              {aging.length === 0 ? (
                <Text size="small">Không có đơn tồn.</Text>
              ) : (
                <Box mt={2}>
                  {aging.map((o) => (
                    <Box
                      key={o.order_id}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        borderRadius: 12,
                        border: "1px solid #eee",
                        background: o.sla_warning ? "#FFECEC" : "#fff",
                      }}
                    >
                      <Text size="small" bold>
                        {o.order_id} — {o.order_status}
                      </Text>
                      <Text size="small">
                        {" "}
                        — {o.customer_name} — {o.age_days} ngày
                      </Text>
                      {o.sla_warning && (
                        <Text size="small" style={{ color: "red" }}>
                          {" "}
                          (High Priority)
                        </Text>
                      )}
                      {o.bottleneck && (
                        <Box mt={1}>
                          <Text size="small" style={{ opacity: 0.8 }}>
                            Bottleneck: {o.bottleneck.status} ({o.bottleneck.role}) —{" "}
                            {o.bottleneck.duration_days} ngày
                          </Text>
                        </Box>
                      )}
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
                  ))}
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Page>
  );
}

