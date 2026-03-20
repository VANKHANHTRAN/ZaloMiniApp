import mysql from "mysql2/promise";

let pool;

export function getPool() {
  if (pool) return pool;

  // namedPlaceholders = true để dùng :param theo yêu cầu
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    timezone: "Z",
    decimalNumbers: true,
  });
  return pool;
}

export async function withTx(fn) {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // rollback fail: ưu tiên trả lỗi gốc
    }
    throw err;
  } finally {
    conn.release();
  }
}

