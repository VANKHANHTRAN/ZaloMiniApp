# ZaloOrderApp — Order Management (Zalo Mini App)

Tech stack:
- Frontend: React (Vite) + ZMP-UI
- Backend: Node.js (Express) + MySQL (`mysql2/promise`, named parameters `:param`)

## 1) MySQL schema

Chạy file `server/db/schema.sql` để tạo database + bảng.

## 2) Backend

```bash
cd server
npm i
cp .env.example .env
npm run dev
```

## 3) Frontend

```bash
npm i
npm run dev
```

## Ghi chú

- **RBAC** dựa trên `roles` (JSON array) nhưng hệ thống đang enforce **mỗi user 1 role**.
- **History JSON** lưu log thay đổi trạng thái trong `ORDER_MAS.history`.
- **Upload 10 ảnh**: API upload-multiple, nếu lỗi sẽ rollback transaction DB và dọn file đã upload.

