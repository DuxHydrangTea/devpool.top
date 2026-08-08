import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { categories, articles } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { articleCache } from '../src/lib/cache';
import fs from 'fs';

const tursoClient = createClient({ url: process.env.TURSO_DATABASE_URL || "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(tursoClient);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-c64172d6bb744384be2e800945e2e831";

async function translateWithDeepseek(texts: string[]): Promise<Record<string, string>> {
    console.log(`[Deepseek] Đang dịch ${texts.length} titles...`);
    const systemPrompt = `Bạn là một dịch giả chuyên nghiệp về lập trình game Godot. 
Dịch mảng chuỗi JSON sau sang tiếng Việt. 
Quy tắc:
1. Giữ nguyên các thuật ngữ kỹ thuật, tên class, node (VD: CharacterBody2D3D, Area2D, Node, TileMap, Asset, Render, Shader, Mesh, Parallax...).
2. "Using X" -> "Sử dụng X"
3. "Introduction to X" -> "Giới thiệu về X"
4. "Your first X" -> "X đầu tiên của bạn"
5. Nếu chuỗi đã là tiếng Việt, hoặc toàn bộ là thuật ngữ kỹ thuật (VD: "Math", "Transform2D", "Geometry2D", "AnimatableBody2D"), chỉ dịch các chữ tiếng Anh thông dụng (VD "Math" -> "Toán học", "Transform2D" -> giữ nguyên).
6. "Mục lục: X" -> Dịch X và giữ nguyên chữ "Mục lục: "
Chỉ trả về ĐÚNG một chuỗi JSON dictionary định dạng {"Tiếng Anh": "Tiếng Việt"}, không có markdown, không giải thích.`;

    const res = await fetch(`https://api.deepseek.com/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: "deepseek-v4-flash",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify(texts) }
            ],
            response_format: { type: "json_object" }
        })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Lỗi API");

    try {
        const jsonStr = data.choices[0].message.content;
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error("Lỗi parse JSON từ Deepseek");
    }
}

async function run() {
    console.log("🚀 Bắt đầu quá trình dịch Title...");
    const allCats = await db.select().from(categories);
    const allArts = await db.select().from(articles);

    // Lọc ra các category/article thuộc Godot (slug của master là godot-full-docs)
    const masterCat = allCats.find(c => c.slug === 'godot-full-docs');
    if (!masterCat) {
        console.error("Không tìm thấy Godot full docs");
        process.exit(1);
    }

    // Đệ quy lấy tất cả category con
    const godotCatIds = new Set<number>([masterCat.id]);
    let added = true;
    while (added) {
        added = false;
        for (const c of allCats) {
            if (c.parentId && godotCatIds.has(c.parentId) && !godotCatIds.has(c.id)) {
                godotCatIds.add(c.id);
                added = true;
            }
        }
    }

    const targetCats = allCats.filter(c => godotCatIds.has(c.id) && c.id !== masterCat.id);
    const targetArts = allArts.filter(a => godotCatIds.has(a.chapterId!));

    const titlesToTranslate = new Set<string>();
    
    // Lấy tên các category
    for (const c of targetCats) {
        // Chỉ thêm nếu chứa ký tự alphabet tiếng anh, và không có dấu tiếng việt (để tránh dịch lại)
        if (!/[áàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵđ]/i.test(c.name)) {
            titlesToTranslate.add(c.name);
        }
    }

    // Lấy tên các article
    for (const a of targetArts) {
        // Handle "Mục lục: ..." prefix
        let rawTitle = a.title;
        if (rawTitle.startsWith("Mục lục: ")) {
            rawTitle = rawTitle.substring(9);
        }
        if (!/[áàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵđ]/i.test(rawTitle)) {
            titlesToTranslate.add(rawTitle);
        }
    }

    const titleArray = Array.from(titlesToTranslate);
    console.log(`Tìm thấy ${titleArray.length} titles cần dịch.`);
    if (titleArray.length === 0) return process.exit(0);

    // Chia mảng thành cục nhỏ nếu quá nhiều (tuy 200 chữ thì ko cần chia, 
    // nhưng chia 100 cho an toàn)
    const dict: Record<string, string> = {};
    for (let i = 0; i < titleArray.length; i += 100) {
        const chunk = titleArray.slice(i, i + 100);
        const translatedChunk = await translateWithDeepseek(chunk);
        Object.assign(dict, translatedChunk);
    }

    // Tiến hành update Database
    let updateCount = 0;
    
    for (const c of targetCats) {
        if (dict[c.name]) {
            const vi = dict[c.name];
            await db.update(categories).set({ name: vi }).where(eq(categories.id, c.id));
            updateCount++;
            console.log(`[Category] ${c.name} -> ${vi}`);
        }
    }

    for (const a of targetArts) {
        let isMucLuc = a.title.startsWith("Mục lục: ");
        let rawTitle = isMucLuc ? a.title.substring(9) : a.title;
        
        if (dict[rawTitle]) {
            let vi = dict[rawTitle];
            let finalTitle = isMucLuc ? `Mục lục: ${vi}` : vi;
            
            await db.update(articles).set({ title: finalTitle }).where(eq(articles.id, a.id));
            articleCache.delete(a.slug);
            updateCount++;
            console.log(`[Article] ${a.title} -> ${finalTitle}`);
        }
    }

    console.log(`🎉 Đã dịch và cập nhật ${updateCount} titles!`);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
