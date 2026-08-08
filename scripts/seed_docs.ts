import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { categories, articles, articleTags } from '../src/db/schema';

// Khởi tạo trực tiếp DB để đảm bảo dotenv.config() chạy trước
const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const tursoClient = createClient({ url, authToken: authToken || undefined });
const db = drizzle(tursoClient);

const HISTORY_FILE = path.resolve('temp/seed_history.json');
let seedHistory: string[] = [];

// Hàm xử lý tạo URL thân thiện (bỏ dấu tiếng Việt)
function slugify(text: string) {
    return text.toString().toLowerCase()
        .normalize('NFD') // Tách dấu
        .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-') // Thay khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
        .replace(/(^-|-$)+/g, ''); // Xóa gạch ngang ở đầu và cuối
}

async function processDirectory(dirPath: string, parentId: number | null, depth: number) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory());
    
    let orderNum = 0;
    for (const folder of folders) {
        orderNum++;
        const folderName = folder.name;
        const folderPath = path.join(dirPath, folderName);
        
        // Kiểm tra lịch sử để tránh trùng lặp
        if (seedHistory.includes(folderPath)) {
            console.log(`⏩ Bỏ qua ${folderName} (đã seed trước đó)`);
            continue;
        }

        const title = folderName.replace(/_/g, ' ');
        const slug = slugify(title);
        const type = depth === 0 ? 'group' : (depth === 1 ? 'category' : 'chapter');
        
        console.log(`[Level ${depth}] Đang chèn ${type.toUpperCase()}: ${title}...`);
        
        const result = await db.insert(categories).values({
            name: title,
            type: type,
            parentId: parentId,
            order: orderNum,
            slug: slug
        }).returning({ id: categories.id });
        
        const newCategoryId = result[0].id;
        
        const indexPath = path.join(folderPath, 'index.md');
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf-8');
            const articleResult = await db.insert(articles).values({
                title: title,
                contentMd: content,
                chapterId: newCategoryId,
                order: orderNum,
                slug: slug
            }).returning({ id: articles.id });
            
            const newArticleId = articleResult[0].id;
            
            // Gắn Tag theo ID: 1 (godot), 2 (2d)
            await db.insert(articleTags).values([
                { articleId: newArticleId, tagId: 1 },
                { articleId: newArticleId, tagId: 2 }
            ]);
            
            console.log(`  => Đã đính kèm Article và gán tag [godot, 2d] vào ${title}`);
        }
        
        // Cập nhật lịch sử
        seedHistory.push(folderPath);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(seedHistory, null, 2));

        // Tiếp tục đệ quy quét các thư mục con bên trong
        await processDirectory(folderPath, newCategoryId, depth + 1);
    }
}

async function seed() {
    console.log("🚀 Bắt đầu quá trình Seed Database...");
    
    // Đọc lịch sử cào
    if (fs.existsSync(HISTORY_FILE)) {
        seedHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
        console.log(`📋 Đã tải lịch sử seed: ${seedHistory.length} thư mục đã được xử lý.`);
    } else {
        console.log("📋 Khởi tạo lịch sử seed mới...");
    }
    
    const rootDir = path.resolve('temp/docs_vi');
    if (!fs.existsSync(rootDir)) {
        console.error("❌ Thư mục temp/docs_vi không tồn tại!");
        process.exit(1);
    }
    
    // Tự động kiểm tra hoặc tạo thư mục gốc "Godot full docs"
    const masterName = "Godot full docs";
    const masterSlug = slugify(masterName);
    const { eq } = await import('drizzle-orm');
    
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
    } else {
        masterId = master[0].id;
    }
    
    console.log("📂 Đang quét thư mục tài liệu...");
    // Bắt đầu quét và cho chúng làm con của Godot full docs (depth = 1)
    await processDirectory(rootDir, masterId, 1);
    
    console.log("🎉 Seed hoàn tất 100%!");
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Lỗi nghiêm trọng trong quá trình Seed:", err);
    process.exit(1);
});
