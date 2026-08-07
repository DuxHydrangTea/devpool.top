import { createClient } from "@libsql/client";

// Mặc định tạo file local.db nếu không có URL trên Cloud
const url = process.env.VITE_TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

const db = createClient({
  url,
  authToken: authToken || undefined,
});

async function initDB() {
  console.log("Đang khởi tạo Database Turso (libSQL) tại:", url);
  try {
    // Tạo bảng Categories (Danh mục, Nhóm, Chương)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'group', 'category', 'chapter'
        parent_id TEXT,
        order_num INTEGER DEFAULT 0
      );
    `);
    console.log("✅ Đã tạo/kiểm tra xong bảng 'categories'");

    // Tạo bảng Articles (Bài viết)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content_md TEXT,
        chapter_id TEXT,
        order_num INTEGER DEFAULT 0,
        FOREIGN KEY(chapter_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `);
    console.log("✅ Đã tạo/kiểm tra xong bảng 'articles'");
    
    console.log("🎉 Khởi tạo hoàn tất!");
  } catch (err) {
    console.error("❌ Lỗi khi tạo bảng:", err);
  }
}

initDB();
