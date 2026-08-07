import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

function toSlug(str: string) {
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/[^a-z0-9\s-]/g, ""); 
    str = str.replace(/\s+/g, "-");       
    str = str.replace(/-+/g, "-");        
    str = str.replace(/^-+|-+$/g, "");    
    return str;
}

async function main() {
  const { db } = await import("../src/lib/turso");
  const { categories: categoriesSchema, articles: articlesSchema } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  console.log("Đang lấy danh mục (categories)...");
  const cats = await db.select().from(categoriesSchema);
  let catUpdated = 0;
  for (const cat of cats) {
      let slug = toSlug(cat.name);
      if (!slug) slug = `cat-${cat.id}`;
      await db.update(categoriesSchema).set({ slug }).where(eq(categoriesSchema.id, cat.id));
      catUpdated++;
  }
  console.log(`✅ Đã cập nhật slug cho ${catUpdated} danh mục.`);

  console.log("Đang lấy bài viết (articles)...");
  const arts = await db.select().from(articlesSchema);
  let artUpdated = 0;
  for (const art of arts) {
      let slug = toSlug(art.title);
      if (!slug) slug = `art-${art.id}`;
      // Nối thêm ID để tránh trùng lặp tuyệt đối (nếu có 2 bài trùng tên)
      // Nhưng tạm thời user đã dedup nên không lo, có điều an toàn thì cứ để nguyên slug.
      await db.update(articlesSchema).set({ slug }).where(eq(articlesSchema.id, art.id));
      artUpdated++;
  }
  console.log(`✅ Đã cập nhật slug cho ${artUpdated} bài viết.`);

  process.exit(0);
}

main();
