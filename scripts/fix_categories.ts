import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { categories } from '../src/db/schema';
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

async function fix() {
    console.log("🚀 Bắt đầu gom nhóm các chuyên mục Godot...");

    const masterName = "Godot full docs";
    const masterSlug = slugify(masterName);
    
    // 1. Kiểm tra hoặc Tạo chuyên mục Mẹ lớn nhất
    let master = await db.select().from(categories).where(eq(categories.slug, masterSlug));
    let masterId;
    if (master.length === 0) {
        const inserted = await db.insert(categories).values({
            name: masterName, 
            slug: masterSlug, 
            type: 'group', 
            parentId: null, 
            order: 0
        }).returning({ id: categories.id });
        masterId = inserted[0].id;
        console.log(`✅ Đã tạo thư mục gốc: [${masterName}]`);
    } else {
        masterId = master[0].id;
        console.log(`✅ Thư mục gốc [${masterName}] đã tồn tại.`);
    }
    
    // 2. Thu thập danh sách tên các thư mục vừa cào từ temp/docs_vi
    const rootDir = path.resolve('temp/docs_vi');
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory());
    
    // Tạo danh sách slug của các thư mục cào
    const folderSlugs = folders.map(f => slugify(f.name.replace(/_/g, ' ')));
    
    // 3. Quét toàn bộ DB để tìm những Category bị mồ côi (parentId = null) mà nằm trong danh sách cào
    const allCategories = await db.select().from(categories);
    const toUpdate = allCategories.filter(c => c.parentId === null && folderSlugs.includes(c.slug));
    
    for (const c of toUpdate) {
        // Cập nhật nó thành con của masterId, và đổi type thành 'category' (level 1)
        await db.update(categories)
            .set({ parentId: masterId, type: 'category' })
            .where(eq(categories.id, c.id));
            
        console.log(`📦 Đã "bế" [${c.name}] vào trong [Godot full docs]`);
        
        // Cập nhật các thư mục con của nó (level 2) từ 'category' thành 'chapter' cho chuẩn xác
        const children = allCategories.filter(child => child.parentId === c.id);
        for (const child of children) {
            await db.update(categories)
                .set({ type: 'chapter' })
                .where(eq(categories.id, child.id));
        }
    }
    
    console.log("🎉 Hoàn tất việc dọn dẹp và gom nhóm!");
    process.exit(0);
}

fix().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});
