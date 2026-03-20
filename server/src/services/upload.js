import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveUploadedFilesOrThrow({
  files,
  orderId,
  step, // 'PROD' | 'INSTALL'
  uploadDir,
}) {
  if (!Array.isArray(files) || files.length === 0) return [];
  if (files.length > 20) {
    const err = new Error("Tối đa 20 ảnh");
    err.statusCode = 400;
    throw err;
  }

  const safeStep = step || "UNKNOWN";
  const baseDir = path.resolve(uploadDir || "uploads");
  const targetDir = path.join(
    baseDir,
    new Date().toISOString().slice(0, 10),
    orderId,
    safeStep
  );
  await ensureDir(targetDir);

  const saved = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext =
        (f.mimetype && mime.extension(f.mimetype)) ||
        path.extname(f.originalname).replace(".", "") ||
        "jpg";
      const filename = `${Date.now()}_${i}.${ext}`;
      const fullPath = path.join(targetDir, filename);
      await fs.writeFile(fullPath, f.buffer);
      saved.push(fullPath);
    }
    return saved;
  } catch (e) {
    // Nếu lưu file lỗi, dọn những file đã ghi
    await cleanupFiles(saved);
    throw e;
  }
}

export async function cleanupFiles(filePaths = []) {
  await Promise.all(
    filePaths.map(async (p) => {
      try {
        await fs.unlink(p);
      } catch {
        // ignore
      }
    })
  );
}

