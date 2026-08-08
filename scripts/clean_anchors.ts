import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { articles } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const tursoClient = createClient({ url: process.env.TURSO_DATABASE_URL || "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(tursoClient);

async function cleanAnchors() {
    console.log("🚀 Bắt đầu quét và xóa rác (biểu tượng ) trong Database...");

    const allArticles = await db.select().from(articles);
    let updatedCount = 0;

    for (const article of allArticles) {
        if (!article.contentMd) continue;

        // Xóa chuỗi dạng: [](link_bat_ky)
        // Dùng Regex: khoảng trắng (tùy chọn) + [] + (bất kỳ ký tự nào không phải dấu ngoặc đóng) + )
        const cleanedContent = article.contentMd.replace(/\s*\[\]\([^)]+\)/g, '');

        if (cleanedContent !== article.contentMd) {
            await db.update(articles)
                .set({ contentMd: cleanedContent })
                .where(eq(articles.id, article.id));
            updatedCount++;
        }
    }

    console.log(`🎉 Đã dọn dẹp thành công ${updatedCount} bài viết!`);
    process.exit(0);
}

cleanAnchors().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});
