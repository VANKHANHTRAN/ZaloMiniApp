import axios from "axios";

// Gửi push miễn phí qua Zalo OA.
// Lưu ý: tuỳ loại Notification của Zalo Mini App/OA mà endpoint có thể khác.
// Ở đây triển khai dạng "best-effort": nếu lỗi thì log và không chặn transaction.
export async function sendZaloNotice(zalo_id, message) {
  if (!zalo_id) return { ok: false, skipped: true };
  const token = process.env.OA_ACCESS_TOKEN;
  if (!token) return { ok: false, skipped: true };

  try {
    // Endpoint có thể cần chỉnh theo OA API thực tế bạn đang dùng.
    // Giữ hàm này cô lập để thay đổi dễ dàng.
    const resp = await axios.post(
      "https://openapi.zalo.me/v3.0/oa/message",
      {
        recipient: { user_id: zalo_id },
        message: { text: message },
      },
      {
        headers: {
          "Content-Type": "application/json",
          access_token: token,
        },
        timeout: 10000,
      }
    );
    return { ok: true, data: resp.data };
  } catch (err) {
    // Không throw để không làm hỏng luồng nghiệp vụ chính
    return { ok: false, error: "Zalo notice failed" };
  }
}

