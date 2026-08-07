import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const seedData = [
  {
    name: "Raylib + Odin",
    tabs: [
      { name: "Odin", chapters: ["Phần 1: Nhập môn", "Phần 2: CTDL & Hàm", "Phần 3: Bộ nhớ & Con trỏ", "Phần 4: Nâng cao", "Phần 5: Tổ chức dự án"] },
      { name: "Tài Liệu", chapters: ["Tài liệu Gốc"] },
      { name: "Lộ Trình", chapters: ["Lộ trình Cơ Bản", "Lộ trình Nâng Cao", "Cấp độ Chuyên Gia", "Nghệ thuật Thiết kế"] },
      { name: "Dự Án", chapters: ["Khởi động Dự án", "Dự án Tốt Nghiệp (Vampire Survivors)", "Thực Hành Nông Trại (Avatar 2D)"] },
      { name: "Avatar 2D", chapters: ["Phân Hệ 1: Nền Tảng", "Phân Hệ 2: Trồng Trọt", "Phân Hệ 3: Chăn Nuôi", "Phân Hệ 4: Kinh Tế", "Phân Hệ 5 & 6: MMO & Polish", "Đặc Biệt"] },
      { name: "Ninja", chapters: ["Phần 1: Platformer 2D", "Phần 2: Võ học & Kỹ năng", "Phần 3: Quái vật & Combat", "Phần 4: Trang bị & Đập đồ", "Phần 5: UI & Hoàn thiện"] },
      { name: "K.T Online", chapters: ["Kỹ Thuật Game Online"] },
      { name: "Lỗi Game", chapters: ["30 Vấn Đề Thực Tế (Troubleshooting)"] },
      { name: "Lỗi Online", chapters: ["6 Lỗi Game Online Kinh Điển"] }
    ]
  },
  {
    name: "React / Next.js",
    tabs: [
      { name: "Next.js", chapters: ["Phần 1: Nhập Môn & Khởi Tạo", "Phần 2: Routing & Rendering", "Phần 3: Dữ Liệu & UI", "Phần 4: Backend & Bảo Mật", "Phần 5: Triển khai & Tối Ưu"] },
      { name: "ReactJS", chapters: ["Phần 1: Kiến Trúc & Tư Duy", "Phần 2: Quản Lý Trạng Thái", "Phần 3: Routing & Form", "Phần 4: Hiệu Năng & Dữ Liệu Lớn", "Phần 5: UI/UX & Testing", "Phần 6: Bảo Mật & CI/CD", "Phần 7: Thực Chiến Doanh Nghiệp"] }
    ]
  },
  {
    name: "SolidJS / SolidStart",
    tabs: [
      { name: "SolidJS", chapters: ["Khóa Học SolidJS"] },
      { name: "SolidStart", chapters: ["Làm chủ Meta-Framework"] }
    ]
  },
  {
    name: "Godot 2D",
    tabs: [
      { name: "Cơ Bản", chapters: ["GDScript Cơ Bản"] },
      { name: "Mẫu Thiết Kế", chapters: ["Godot Khi Làm Game (GDScript & C#)"] },
      { name: "Farmer Game", chapters: ["Triển Khai Godot 2D - Farmer Game"] },
      { name: "Nâng Cao", chapters: ["Godot Nâng Cao (UI & Animation)"] },
      { name: "Component", chapters: ["Thư Viện Component (Godot 2D)"] },
      { name: "Từ điển Node", chapters: ["Từ điển Node 2D"] },
      { name: "Hàm Helper", chapters: ["Từ điển Hàm Helper 2D"] }
    ]
  }
];

async function main() {
  const { db } = await import("../src/lib/turso");
  const { categories: categoriesSchema } = await import("../src/db/schema");

  console.log("Đang xóa dữ liệu cũ (chỉ categories)...");
  await db.delete(categoriesSchema);

  console.log("Đang bắt đầu thêm cấu trúc danh mục mới...");
  
  try {
    let groupOrder = 1;
    for (const group of seedData) {
      // 1. Insert Group
      const [insertedGroup] = await db.insert(categoriesSchema).values({
        name: group.name,
        type: "group",
        parentId: null,
        order: groupOrder++,
      }).returning({ id: categoriesSchema.id });
      
      let tabOrder = 1;
      for (const tab of group.tabs) {
        // 2. Insert Tab (Category)
        const [insertedTab] = await db.insert(categoriesSchema).values({
          name: tab.name,
          type: "category",
          parentId: insertedGroup.id, // Dùng ID tự tăng vừa nhận được
          order: tabOrder++,
        }).returning({ id: categoriesSchema.id });

        let chapterOrder = 1;
        for (const chapter of tab.chapters) {
          // 3. Insert Chapter
          await db.insert(categoriesSchema).values({
            name: chapter,
            type: "chapter",
            parentId: insertedTab.id, // Dùng ID tự tăng vừa nhận được
            order: chapterOrder++,
          });
        }
      }
    }

    console.log("✅ Đã hoàn thành quá trình seed dữ liệu!");
  } catch (error) {
    console.error("❌ Lỗi khi thêm dữ liệu:", error);
  }
  
  process.exit(0);
}

main();
