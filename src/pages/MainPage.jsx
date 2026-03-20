import React from "react";
import { useAuth } from "../contexts/AuthContext";
import HomePage from "./HomePage";
import ManagerPage from "./ManagerPage";

// Trang chính `/`:
// - Nếu role = MANAGER => vào màn quản lý users + đơn
// - Các role khác => vào màn xử lý theo role (SALE/PROD/INSTALL/QC)
export default function MainPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const role = (user?.roles || [])[0];

  if (role === "MANAGER") return <ManagerPage />;
  return <HomePage />;
}

