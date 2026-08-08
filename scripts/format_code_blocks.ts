import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { articles } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { articleCache } from '../src/lib/cache';

const tursoClient = createClient({ url: process.env.TURSO_DATABASE_URL || "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(tursoClient);

async function formatCodeBlocks() {
    console.log("🚀 Bắt đầu dọn dẹp và format Code Blocks...");

    const allArts = await db.select().from(articles);
    let updatedCount = 0;

    for (const article of allArts) {
        if (!article.contentMd) continue;

        let content = article.contentMd;
        let originalContent = content;

        // 1. Tìm và xóa các đoạn chữ rác "GDScriptC#", "GDScriptC#C++", "GDScript"
        // Dùng Regex để xóa các dòng chỉ chứa những chữ này (có thể có khoảng trắng thừa)
        content = content.replace(/^(GDScriptC#C\+\+|GDScriptC#|GDScript)\s*$/gm, '');

        // 2. Tìm và xóa chữ "Copy to clipboard" hoặc "Sao chép vào clipboard"
        content = content.replace(/^(Copy to clipboard|Sao chép vào clipboard)\s*$/gm, '');

        // 3. Gắn tag gdscript cho tất cả các khối code trống
        // Khối code bắt đầu bằng ``` (không có chữ phía sau)
        // Lưu ý: \r?\n xử lý cả Windows và Linux line endings
        content = content.replace(/^```\s*$/gm, '```gdscript');

        // 4. Xóa bớt các dòng trống thừa sinh ra do việc xóa text ở trên (nhiều hơn 2 dòng trống liên tiếp)
        content = content.replace(/\n{3,}/g, '\n\n');

        if (content !== originalContent) {
            await db.update(articles)
                .set({ contentMd: content })
                .where(eq(articles.id, article.id));
                
            articleCache.delete(article.slug);
            console.log(`✅ Đã format code blocks cho bài viết: "${article.title}"`);
            updatedCount++;
        }
    }

    console.log(`🎉 Hoàn tất! Đã dọn dẹp và gắn thẻ gdscript cho ${updatedCount} bài viết.`);
    process.exit(0);
}

formatCodeBlocks().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});
