import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { tags } from '../src/db/schema';

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const tursoClient = createClient({ url, authToken: authToken || undefined });
const db = drizzle(tursoClient);
// Hàm xử lý tạo URL thân thiện (bỏ dấu tiếng Việt)
function slugify(text: string) {
    return text.toString().toLowerCase()
        .normalize('NFD') // Tách dấu
        .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-') // Thay khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
        .replace(/(^-|-$)+/g, ''); // Xóa gạch ngang ở đầu và cuối
}

const tagList = [
    "godot", "2d", "odin", "raylib", "farm", 
    "ninjja school", "react", "next", "solid", 
    "solid start", "3d", "render", "tips tricks", 
    "performance", "interview"
];

async function seedTags() {
    console.log("🚀 Bắt đầu tạo Tags...");

    for (const tagName of tagList) {
        const slug = slugify(tagName);
        try {
            // Chèn tag mới
            const result = await db.insert(tags).values({
                name: tagName,
                slug: slug
            }).returning({ id: tags.id });
            
            console.log(`✅ Đã tạo Tag: [${tagName}] => ID: ${result[0].id}`);
        } catch (error: any) {
            // Nếu bị lỗi do UNIQUE constraint (trùng tag)
            if (error.message.includes('UNIQUE constraint failed')) {
                console.log(`⏩ Tag [${tagName}] đã tồn tại, bỏ qua...`);
            } else {
                console.error(`❌ Lỗi khi tạo tag [${tagName}]:`, error.message);
            }
        }
    }

    console.log("🎉 Hoàn tất việc tạo Tags! Vui lòng copy ID của 'godot' và '2d' gửi lại nhé.");
    process.exit(0);
}

seedTags().catch(err => {
    console.error("❌ Lỗi nghiêm trọng:", err);
    process.exit(1);
});
