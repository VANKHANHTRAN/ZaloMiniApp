// RBAC: kiểm tra quyền dựa trên mảng roles (nhưng hệ thống enforce 1 role/user)
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    const ok = roles.some((r) => allowedRoles.includes(r));
    if (!ok) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

