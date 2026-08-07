import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Dữ liệu bài viết cho Mục Odin, liên kết bằng chapterId từ ID phân cấp thấp nhất (Level 3 - Section)
const odinArticles = [
  {
    chapterId: 75, // Phần 1: Nhập môn
    articles: [
      "Giới thiệu & Mục lục",
      "Chương 1: Giới thiệu & Cài đặt",
      "Chương 2: Biến, Hằng số & Kiểu DL",
      "Chương 3: Toán tử & Ép kiểu",
      "Chương 4: Cấu trúc điều khiển",
    ]
  },
  {
    chapterId: 76, // Phần 2: CTDL & Hàm
    articles: [
      "Chương 5: Mảng, Slice & Chuỗi",
      "Chương 6: Hàm & Defer",
      "Chương 7: Struct, Union, Enum",
    ]
  },
  {
    chapterId: 77, // Phần 3: Bộ nhớ & Con trỏ
    articles: [
      "Chương 8: Con trỏ",
      "Chương 9: Stack vs Heap",
      "Chương 10: Hệ thống Context",
      "Chương 11: Mảng động & Map",
    ]
  },
  {
    chapterId: 78, // Phần 4: Nâng cao
    articles: [
      "Chương 12: Allocators & Arena",
      "Chương 13: Đa luồng (Threading)",
      "Chương 14: Bitwise & DOD",
      "Chương 15: Giao tiếp với C",
      "Chương 16: Polymorphism & Reflection",
    ]
  },
  {
    chapterId: 79, // Phần 5: Tổ chức dự án
    articles: [
      "Chương 17: Packages & Scope",
      "Chương 18: Xử lý lỗi",
      "Chương 19: Viết Test (Testing)",
    ]
  }
];

async function main() {
  const { db } = await import("../src/lib/turso");
  const { articles: articlesSchema } = await import("../src/db/schema");

  console.log("Đang bắt đầu thêm bài viết (Articles) cho mục Odin...");

  try {
    let globalOrder = 1;

    for (const group of odinArticles) {
      console.log(`Đang xử lý chapterId: ${group.chapterId}`);

      let articleOrder = 1;
      for (const title of group.articles) {
        await db.insert(articlesSchema).values({
          title: title,
          contentMd: "", // Để trống nội dung lúc seed, có thể update sau
          chapterId: group.chapterId,
          order: articleOrder++,
        });
        globalOrder++;
      }
    }

    console.log(`✅ Đã thêm thành công ${globalOrder - 1} bài viết cho mục Odin!`);
  } catch (error) {
    console.error("❌ Lỗi khi thêm dữ liệu bài viết:", error);
  }

  process.exit(0);
}

main();
