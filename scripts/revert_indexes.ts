import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { categories, articles } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { articleCache } from '../src/lib/cache';

const tursoClient = createClient({ url: process.env.TURSO_DATABASE_URL || "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(tursoClient);

async function revertIndexes() {
    console.log("🚀 Sửa lỗi đổi tên hàng loạt...");

    const allCats = await db.select().from(categories);
    const allArts = await db.select().from(articles);

    let updatedCount = 0;

    for (const article of allArts) {
        if (article.title.startsWith("Mục lục: ")) {
            // Khôi phục lại tên gốc
            const originalTitle = article.title.replace("Mục lục: ", "");
            
            // Xác định xem đây có thực sự là trang Mục Lục không
            // Một trang Mục lục (TOC) là bài viết nằm trong một Category C,
            // mà Category C đó PHẢI chứa các Category con khác.
            const parentCatId = article.chapterId;
            const hasChildrenCats = allCats.some(c => c.parentId === parentCatId);

            let finalTitle = originalTitle;
            
            if (hasChildrenCats) {
                // Đây đúng là trang Mục lục thực sự
                finalTitle = `Mục lục: ${originalTitle}`;
            }

            if (article.title !== finalTitle) {
                await db.update(articles)
                    .set({ title: finalTitle })
                    .where(eq(articles.id, article.id));
                    
                articleCache.delete(article.slug);
                console.log(`✅ Khôi phục: "${article.title}" -> "${finalTitle}"`);
                updatedCount++;
            }
        }
    }

    console.log(`🎉 Đã sửa lại ${updatedCount} bài viết về đúng tên gốc!`);
    process.exit(0);
}

revertIndexes().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});
