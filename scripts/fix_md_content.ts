import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { articles } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { articleCache } from '../src/lib/cache';

const tursoClient = createClient({ url: process.env.TURSO_DATABASE_URL || "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(tursoClient);

function slugify(text: string) {
    return text.toString().toLowerCase()
        .normalize('NFD') // Tách dấu
        .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-') // Thay khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
        .replace(/(^-|-$)+/g, ''); // Xóa gạch ngang ở đầu và cuối
}

function processMarkdown(content: string) {
    // 1. Dọn dẹp mỏ neo []
    let newContent = content.replace(/\[\]\([^)]+\)/g, '');

    // 2. Dọn dẹp các chữ rác "GDScriptC#", "GDScriptC#C++", "GDScript" đứng một mình
    newContent = newContent.replace(/^(GDScriptC#C\+\+|GDScriptC#|GDScript)\s*$/gm, '');

    // 3. Dọn dẹp "Copy to clipboard"
    newContent = newContent.replace(/^(Copy to clipboard|Sao chép vào clipboard)\s*$/gm, '');

    // 4. Định dạng lại code block an toàn:
    // Tìm các khối code bắt đầu bằng ``` (theo sau là khoảng trắng hoặc newline)
    // và kết thúc bằng ```. Bắt trọn nội dung bên trong và đóng gói lại.
    // Dùng [\s\S]*? để lấy mọi ký tự kể cả newline
    newContent = newContent.replace(/```\s*[\r\n]+([\s\S]*?)[\r\n]+```/g, '```gdscript\n$1\n```');

    // 5. Xóa dòng trống thừa
    newContent = newContent.replace(/\n{3,}/g, '\n\n');
    
    return newContent;
}

let updatedCount = 0;

async function scanAndProcess(dirPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
            await scanAndProcess(fullPath);
        } else if (entry.name === 'index.md') {
            const folderName = path.basename(dirPath);
            const title = folderName.replace(/_/g, ' ');
            const slug = slugify(title);

            const content = fs.readFileSync(fullPath, 'utf-8');
            const cleanContent = processMarkdown(content);

            const result = await db.update(articles)
                .set({ contentMd: cleanContent })
                .where(eq(articles.slug, slug))
                .returning({ id: articles.id });

            if (result.length > 0) {
                articleCache.delete(slug);
                updatedCount++;
                console.log(`✅ Khôi phục thành công: ${title}`);
            }
        }
    }
}

async function run() {
    console.log("🚀 Bắt đầu khôi phục Content từ file .md gốc...");
    const rootDir = path.resolve('temp/docs_vi');
    await scanAndProcess(rootDir);
    console.log(`🎉 Hoàn tất khôi phục và định dạng chuẩn xác ${updatedCount} bài viết!`);
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});
