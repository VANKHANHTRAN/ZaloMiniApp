export const Roles = Object.freeze({
  SALE: "SALE",
  PROD: "PROD",
  INSTALL: "INSTALL",
  QC: "QC",
  MANAGER: "MANAGER",
});

export const OrderStatus = Object.freeze({
  NEW_ORDER: "NEW_ORDER",
  IN_PRODUCTION: "IN_PRODUCTION",
  QC_PROD_PENDING: "QC_PROD_PENDING",
  READY_FOR_INSTALL: "READY_FOR_INSTALL",
  IN_INSTALLATION: "IN_INSTALLATION",
  QC_INSTALL_PENDING: "QC_INSTALL_PENDING",
  COMPLETED: "COMPLETED",
});

// Map trạng thái được phép hiển thị theo role (theo yêu cầu)
export const VisibleStatusByRole = Object.freeze({
  SALE: Object.values(OrderStatus),
  PROD: [OrderStatus.NEW_ORDER, OrderStatus.IN_PRODUCTION],
  INSTALL: [OrderStatus.READY_FOR_INSTALL, OrderStatus.IN_INSTALLATION],
  QC: [OrderStatus.QC_PROD_PENDING, OrderStatus.QC_INSTALL_PENDING],
  MANAGER: Object.values(OrderStatus),
});

