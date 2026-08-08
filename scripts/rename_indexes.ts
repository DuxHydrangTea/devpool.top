import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { categories, articles } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { articleCache } from '../src/lib/cache';

const tursoClient = createClient({ url: process.env.TURSO_DATABASE_URL || "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(tursoClient);

async function renameIndexes() {
    console.log("🚀 Bắt đầu đổi tên các bài viết index thành Mục lục...");

    const allCats = await db.select().from(categories);
    const allArts = await db.select().from(articles);

    let updatedCount = 0;

    for (const article of allArts) {
        // Tìm category cha của bài viết
        const parentCategory = allCats.find(c => c.id === article.chapterId);
        
        // Nếu tên bài viết trùng khớp hoàn toàn với tên thư mục chứa nó
        // (ví dụ: bài viết "Vật lý" nằm trong thư mục "Vật lý")
        // và chưa có chữ "Mục lục"
        if (parentCategory && article.title === parentCategory.name && !article.title.startsWith("Mục lục")) {
            const newTitle = `Mục lục: ${article.title}`;
            
            await db.update(articles)
                .set({ title: newTitle })
                .where(eq(articles.id, article.id));
                
            // Xóa cache để cập nhật nội dung ngay lập tức
            articleCache.delete(article.slug);
            
            console.log(`✅ Đã đổi tên: "${article.title}" -> "${newTitle}"`);
            updatedCount++;
        }
    }

    console.log(`🎉 Hoàn tất! Đã cập nhật ${updatedCount} bài viết.`);
    process.exit(0);
}

renameIndexes().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});
