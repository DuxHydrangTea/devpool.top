import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { categories, articles } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const tursoClient = createClient({ url, authToken: authToken || undefined });
const db = drizzle(tursoClient);

function slugify(text: string) {
    return text.toString().toLowerCase()
        .normalize('NFD') // Tách dấu
        .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-') // Thay khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
        .replace(/(^-|-$)+/g, ''); // Xóa gạch ngang ở đầu và cuối
}

async function fixOrder() {
    console.log("🚀 Bắt đầu cập nhật lại thứ tự sắp xếp theo bản gốc...");

    const mdPath = path.resolve('temp/godot_docs_2d.md');
    if (!fs.existsSync(mdPath)) {
        console.error("❌ Không tìm thấy file godot_docs_2d.md");
        process.exit(1);
    }

    const content = fs.readFileSync(mdPath, 'utf8');
    const lines = content.split('\n');

    let orderCounter = 1;

    for (const line of lines) {
        // Tìm các tiêu đề nằm trong ngoặc vuông, ví dụ: [Introduction]
        const match = line.match(/\[(.*?)\]/);
        if (match) {
            const rawTitle = match[1];
            
            // Xử lý title giống hệt cách tool cào đã làm
            const safeTitle = rawTitle.replace(/[:*?"<>|]/g, '');
            const slug = slugify(safeTitle);

            // Cập nhật order_num cho bảng categories
            await db.update(categories)
                .set({ order: orderCounter })
                .where(eq(categories.slug, slug));

            // Cập nhật order_num cho bảng articles
            await db.update(articles)
                .set({ order: orderCounter })
                .where(eq(articles.slug, slug));

            orderCounter++;
        }
    }

    console.log(`🎉 Đã cập nhật xong thứ tự (order_num) cho ${orderCounter - 1} mục thành công!`);
    process.exit(0);
}

fixOrder().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});
