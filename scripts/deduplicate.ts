import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import("../src/lib/turso");
  const { articles: articlesSchema } = await import("../src/db/schema");
  const { inArray } = await import("drizzle-orm");

  console.log("Đang quét để tìm các bài viết bị trùng lặp...");
  
  // Lấy toàn bộ bài viết ra
  const allArticles = await db.select().from(articlesSchema);

  const seen = new Set<string>();
  const duplicateIds: number[] = [];

  // Giữ lại bài viết đầu tiên (ID nhỏ nhất do được order theo ID tăng dần mặc định), các bài sau bị tính là duplicate
  for (const article of allArticles) {
    const key = `${article.chapterId}-${article.title}`;
    if (seen.has(key)) {
      duplicateIds.push(article.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIds.length > 0) {
    console.log(`⚠️ Phát hiện ${duplicateIds.length} bài viết trùng lặp. Đang tiến hành xóa...`);
    
    // Xóa các ID bị duplicate
    await db.delete(articlesSchema).where(inArray(articlesSchema.id, duplicateIds));
    
    console.log(`✅ Đã dọn dẹp sạch sẽ ${duplicateIds.length} bài viết trùng lặp!`);
  } else {
    console.log("✅ Không tìm thấy bài viết nào bị trùng lặp!");
  }

  process.exit(0);
}

main();
