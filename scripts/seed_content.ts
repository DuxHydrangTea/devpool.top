import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const { db } = await import("../src/lib/turso");
  const { articles: articlesSchema } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  console.log("Đang đọc file index.html để trích xuất mapping...");
  const htmlPath = 'c:/projects/raylib-odin/index.html';
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Regex để tìm các bài học có onclick="loadMarkdown('...', this)"
  const regex = /loadMarkdown\('([^']+)',\s*this\)[^>]*>([\s\S]*?)<\/li>/g;
  let match;
  const titleToPath: Record<string, string> = {};
  
  while ((match = regex.exec(htmlContent)) !== null) {
    let filePath = match[1];
    // Thay thế nhiều khoảng trắng, \n bằng 1 khoảng trắng và trim
    let title = match[2].replace(/\s+/g, ' ').trim(); 
    // Xóa các thẻ HTML (nếu có, ví dụ <i>)
    title = title.replace(/<[^>]+>/g, '').trim();
    titleToPath[title] = filePath;
  }
  
  console.log(`Đã tìm thấy ${Object.keys(titleToPath).length} link file markdown trong sidebar.`);

  // Lấy toàn bộ bài viết từ DB (những bài chưa có nội dung hoặc có thể overwrite)
  const allArticles = await db.select().from(articlesSchema);
  console.log(`Đã lấy ${allArticles.length} bài viết từ Database để update content_md.`);

  let updatedCount = 0;
  for (const article of allArticles) {
    let dbTitle = article.title.replace(/\s+/g, ' ').trim();
    const mdRelativePath = titleToPath[dbTitle];
    
    if (mdRelativePath) {
      const fullMdPath = path.join('c:/projects/raylib-odin', mdRelativePath);
      
      if (fs.existsSync(fullMdPath)) {
        const mdContent = fs.readFileSync(fullMdPath, 'utf8');
        
        // Update vào Database
        await db.update(articlesSchema)
          .set({ contentMd: mdContent })
          .where(eq(articlesSchema.id, article.id));
          
        updatedCount++;
        console.log(`✅ [${updatedCount}] Đã update content cho: ${dbTitle}`);
      } else {
        console.log(`⚠️ LỖI: Không tìm thấy file trên đĩa: ${fullMdPath}`);
      }
    } else {
      console.log(`⚠️ LỖI: Không map được link HTML cho bài viết: '${dbTitle}'`);
    }
  }

  console.log(`\n🎉 Hoàn tất! Đã update nội dung thành công cho ${updatedCount}/${allArticles.length} bài viết.`);
  process.exit(0);
}

main();
