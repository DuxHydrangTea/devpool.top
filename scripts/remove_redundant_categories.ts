import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { categories, articles } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { articleCache } from '../src/lib/cache';

const tursoClient = createClient({ url: process.env.TURSO_DATABASE_URL || "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(tursoClient);

async function run() {
    console.log("🚀 Bắt đầu quét và xóa các Category/Chapter thừa thãi...");
    
    // Lấy toàn bộ categories và articles
    const allCategories = await db.select().from(categories);
    const allArticles = await db.select().from(articles);
    
    let removedCount = 0;
    
    // Tìm các chapter (hoặc category) mà chỉ chứa ĐÚNG 1 bài viết và KHÔNG chứa thư mục con nào
    for (const cat of allCategories) {
        if (cat.type === 'group') continue;
        
        const childrenCats = allCategories.filter(c => c.parentId === cat.id);
        const childrenArts = allArticles.filter(a => a.chapterId === cat.id);
        
        // Nếu Category/Chapter này rỗng, hoặc chỉ chứa đúng 1 bài viết và không có Category con
        if (childrenCats.length === 0 && childrenArts.length === 1) {
            const childArticle = childrenArts[0];
            
            // Di chuyển bài viết lên cấp cha của Category/Chapter này
            console.log(`📦 Chuyển bài viết [${childArticle.title}] lên cha của [${cat.name}]`);
            await db.update(articles)
                .set({ chapterId: cat.parentId })
                .where(eq(articles.id, childArticle.id));
                
            // Xóa Category/Chapter thừa
            console.log(`🗑️ Đã xóa thư mục thừa: [${cat.name}]`);
            await db.delete(categories).where(eq(categories.id, cat.id));
            
            removedCount++;
            articleCache.delete(childArticle.slug);
        } else if (childrenCats.length === 0 && childrenArts.length === 0) {
            // Xóa luôn nếu thư mục rỗng
            console.log(`🗑️ Đã xóa thư mục rỗng: [${cat.name}]`);
            await db.delete(categories).where(eq(categories.id, cat.id));
            removedCount++;
        }
    }
    
    // Xóa toàn bộ cache để đảm bảo Sidebar tải lại
    articleCache.clear();
    
    console.log(`🎉 Hoàn tất! Đã xóa ${removedCount} thư mục thừa thãi.`);
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});
