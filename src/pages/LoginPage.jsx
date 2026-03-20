import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Box, Text, Button, Input } from "zmp-ui";
import { loginByPhone, me } from "../lib/api";

function BigButton(props) {
  return <Button fullWidth size="large" {...props} />;
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function doLogin() {
    setError("");
    setLoading(true);
    try {
      await loginByPhone(phone);
      const u = await me();
      // Cập nhật context qua custom event (AuthProvider lắng nghe sau)
      window.dispatchEvent(new CustomEvent("auth-login", { detail: u }));
      navigate("/", { replace: true });
    } catch {
      setError("Đăng nhập thất bại. Kiểm tra SĐT đã có trong hệ thống.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Box p={4}>
        <Text.Title>Đăng nhập</Text.Title>
        <Text size="small" style={{ opacity: 0.8 }}>
          Nhập SĐT đã có trong bảng USER (demo: 0900000001–0900000005).
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
