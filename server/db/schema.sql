-- MySQL 8+
-- Tạo DB (đổi tên nếu cần)
CREATE DATABASE IF NOT EXISTS zalo_order_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE zalo_order_app;

-- USER
CREATE TABLE IF NOT EXISTS USER (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone_number VARCHAR(20) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  roles JSON NOT NULL,
  zalo_id VARCHAR(64) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uniq_user_phone (phone_number)
);

-- ORDER_MAS
CREATE TABLE IF NOT EXISTS ORDER_MAS (
  order_id VARCHAR(32) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  installation_address VARCHAR(255) NOT NULL,
  installation_date DATE NOT NULL,
  order_status VARCHAR(32) NOT NULL,
  history JSON NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  KEY idx_order_status (order_status),
  KEY idx_installation_date (installation_date),
  CONSTRAINT fk_order_created_by FOREIGN KEY (created_by) REFERENCES USER(user_id)
);

-- ORDER_INF
CREATE TABLE IF NOT EXISTS ORDER_INF (
  order_id VARCHAR(32) NOT NULL,
  seq INT NOT NULL,
  door_model VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  item_status VARCHAR(32) NOT NULL,
  notes VARCHAR(500) NULL,
  PRIMARY KEY (order_id, seq),
  KEY idx_order_inf_order_id (order_id),
  CONSTRAINT fk_order_inf_order FOREIGN KEY (order_id) REFERENCES ORDER_MAS(order_id) ON DELETE CASCADE
);

-- Seed mẫu (tuỳ chọn)
INSERT INTO USER (phone_number, full_name, roles, zalo_id, status)
VALUES
('0900000001', 'Sale Demo', JSON_ARRAY('SALE'), NULL, 'ACTIVE'),
('0900000002', 'Prod Demo', JSON_ARRAY('PROD'), NULL, 'ACTIVE'),
('0900000003', 'Install Demo', JSON_ARRAY('INSTALL'), NULL, 'ACTIVE'),
('0900000004', 'QC Demo', JSON_ARRAY('QC'), NULL, 'ACTIVE'),
('0900000005', 'Manager Demo', JSON_ARRAY('MANAGER'), NULL, 'ACTIVE')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

