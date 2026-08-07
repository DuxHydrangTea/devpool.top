import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Dữ liệu bài viết cho tất cả các mục còn lại, liên kết bằng chapterId từ ID phân cấp thấp nhất (Level 3 - Section)
const remainingArticles = [
  // TÀI LIỆU
  { chapterId: 81, articles: ["Từ điển Raylib Toàn Tập"] },

  // LỘ TRÌNH
  { chapterId: 83, articles: ["Chương 1: Core & Game Loop", "Chương 2: FPS & Basic Shapes", "Chương 3: Input & Vector Math", "Chương 4: Textures & UI Fonts", "Chương 5: Collision & Camera", "Chương 6: Audio & Save/Load"] },
  { chapterId: 84, articles: ["Chương 7: RenderTexture", "Chương 8: Blend Modes & Shaders", "Chương 9: 9-Patch & Scissor UI", "Chương 10: State Machine & Arena"] },
  { chapterId: 85, articles: ["Chương 11: Physics System", "Chương 12: ECS Architecture", "Chương 13: Particle System", "Chương 14: Tilemap & Culling", "Chương 15: Threads & Network"] },
  { chapterId: 86, articles: ["Chương 16: AI & Pathfinding", "Chương 17: Skeletal Animation", "Chương 18: Profiling & Optimization", "Chương 19: Deployment & WASM", "Chương 20: Game Juice"] },

  // DỰ ÁN
  { chapterId: 88, articles: ["3 Bước Đầu Tiên", "5 Bước Hoàn Thiện"] },
  { chapterId: 89, articles: ["Phần 1: Core, Camera & Tilemap", "Phần 2: ECS & 1000 Quái vật", "Phần 3: Va chạm, Đạn & Hạt", "Phần 4: Thanh Máu & State Machine", "Phần 5: Game Feel & Đóng gói Web"] },
  { chapterId: 90, articles: ["Bài 1: Khởi tạo & Game Loop", "Bài 2: Tải Ảnh & Tilemap", "Bài 3: Lắp ráp ECS Cơ bản", "Bài 4: Di chuyển Grid-based", "Bài 5: Tương tác Cuốc đất", "Bài 6: Trồng cây & Thu hoạch", "Bài 7: Kho đồ & Game Feel"] },

  // AVATAR 2D
  { chapterId: 92, articles: ["Chương 1: Khởi tạo Game Loop", "Chương 2: Grid-based Movement", "Chương 3: Tilemap & Camera", "Chương 3 (Phụ): Load Map JSON", "Chương 4: Tương tác Interaction"] },
  { chapterId: 93, articles: ["Chương 5: Vòng đời Ô Đất", "Chương 6: Vòng đời Cây Trồng", "Chương 7: Sức khỏe Cây", "Chương 8: Phân Bón"] },
  { chapterId: 94, articles: ["Chương 9: AI Động vật Cơ bản", "Chương 10: Cho Ăn & Thu Hoạch", "Chương 11: Bệnh tật Vật nuôi", "Chương 12: Chó Canh Nông Trại"] },
  { chapterId: 95, articles: ["Chương 13: Túi đồ & Hành trang", "Chương 14: Cửa Hàng NPC", "Chương 15: Nâng Cấp Đất"] },
  { chapterId: 96, articles: ["Chương 16: Server MMO Base", "Chương 17: Thăm Hàng Xóm", "Chương 18: Trộm Cắp & Giúp Đỡ", "Chương 19: UI Kéo Thả (Drag Drop)", "Chương 20: Hạt & Âm Thanh"] },
  { chapterId: 97, articles: ["Chương 21: Full Source Code", "Chương 22: Tối Ưu Hiệu Năng", "Chương 23: Sự Sống Môi Trường"] },

  // NINJA
  { chapterId: 99, articles: ["Giới thiệu & Mục lục", "Chương 1: Khởi tạo & Trọng lực", "Chương 2: Va chạm Bản đồ", "Chương 3: Camera 2D & Cuộn nền"] },
  { chapterId: 100, articles: ["Chương 4: Kiến trúc ECS", "Chương 5: 6 Môn Phái Huyền Thoại", "Chương 6: Hệ thống Tung Chiêu", "Chương 7: Đạn & Phi tiêu"] },
  { chapterId: 101, articles: ["Chương 8: AI Quái vật Platformer", "Chương 9: Toán học Sát thương", "Chương 10: Trạng thái dị thường", "Chương 11: Text sát thương nhảy lên"] },
  { chapterId: 102, articles: ["Chương 12: Hành trang (Inventory)", "Chương 13: Sinh chỉ số trang bị", "Chương 14: Thuật toán Đập đồ", "Chương 15: Ghép đá & Ngọc"] },
  { chapterId: 103, articles: ["Chương 16: Giao diện (HP, MP)", "Chương 17: Chuyển Map & Save", "Chương 18: Full Source Code"] },

  // K.T ONLINE
  { chapterId: 105, articles: ["Chương 1: Cơ bản về Mạng", "Chương 2: Kiến trúc Mạng", "Chương 3: Gói tin Dữ liệu", "Chương 4: Lập trình Socket", "Chương 5: Đồng bộ Trạng thái", "Chương 6: Dự đoán Client", "Chương 7: Bồi thường Độ trễ", "Chương 8: Kỹ thuật Ngoại suy", "Chương 9: Tối ưu Băng thông", "Chương 10: Bảo mật & Scale", "Chương 11: MMO Farm - Server", "Chương 12: MMO Farm - Chunking", "Chương 13: MMO Farm - Kinh Tế"] },

  // LỖI GAME
  { chapterId: 107, articles: ["Vấn Đề 1: Y-Sorting", "Vấn Đề 2: Tilemap Bleeding", "Vấn Đề 3: Méo hình khi Resize", "Vấn Đề 4: Đạn bay xuyên tường", "Vấn Đề 5: Đi chéo bị nhanh hơn", "Vấn Đề 6: Kẹt vào tường", "Vấn Đề 7: Tốc độ phụ thuộc FPS", "Vấn Đề 8: Rớt phím bấm", "Vấn Đề 9: Lag do Rác bộ nhớ", "Vấn Đề 10: Code Mì Ý", "Vấn Đề 11: Lag do Sinh Quái", "Vấn Đề 12: Random bị trùng", "Vấn Đề 13: Điếc tai vì Âm thanh", "Vấn Đề 14: Kẹt góc Tilemap", "Vấn Đề 15: Tràn CPU Tìm đường", "Vấn Đề 16: Hỏng file Save game", "Vấn Đề 17: Camera bị rung giật", "Vấn Đề 18: Bấm xuyên qua UI", "Vấn Đề 19: Đứng hình khi Tải", "Vấn Đề 20: Thế giới mở bị lỗi", "Vấn Đề 21: Phân mảnh bộ nhớ", "Vấn Đề 22: Vật lý giật cục", "Vấn Đề 23: Tràn VRAM do load ảnh", "Vấn Đề 24: Kẹt đơ game vòng lặp", "Vấn Đề 25: Vòng xoáy tử thần DT", "Vấn Đề 26: Lỗi đè chéo đồ họa", "Vấn Đề 27: Con trỏ lơ lửng Crash", "Vấn Đề 28: Dư thừa kiểm tra va chạm", "Vấn Đề 29: Sát thương khống", "Vấn Đề 30: UI văng khỏi màn hình"] },

  // LỖI ONLINE
  { chapterId: 109, articles: ["Lỗi 1: Desync (Bất đồng bộ)", "Lỗi 2: Rubber-banding (Giật lùi)", "Lỗi 3: Ghost Bullets (Đạn ảo)", "Lỗi 4: Nagle's Algorithm (Trễ TCP)", "Lỗi 5: Server Tickrate Drop", "Lỗi 6: Không kết nối được P2P"] },

  // NEXT.JS
  { chapterId: 112, articles: ["Giới thiệu & Mục lục", "Chương 1: Nền tảng React (Enterprise)", "Chương 2: Khởi tạo Dự án Chuẩn"] },
  { chapterId: 113, articles: ["Chương 3: Routing App Router", "Chương 4: Server vs Client Components"] },
  { chapterId: 114, articles: ["Chương 5: Data Fetching & Mutations", "Chương 6: Styling (Tailwind/Modules)"] },
  { chapterId: 115, articles: ["Chương 8: Backend & Middleware", "Chương 9: Authentication & RBAC"] },
  { chapterId: 116, articles: ["Chương 7: Tối ưu hóa & SEO", "Chương 10: Triển khai & Docker", "Chương 11: Dự án Capstone"] },

  // REACTJS
  { chapterId: 118, articles: ["Giới thiệu & Lộ trình", "Chương 1: Tổ chức thư mục chuẩn Enterprise", "Chương 2: Tư duy Component hóa & SOLID"] },
  { chapterId: 119, articles: ["Chương 3: State Management Hiện Đại", "Chương 4: Global State (Zustand/RTK)", "Chương 5: Server State với React Query"] },
  { chapterId: 120, articles: ["Chương 6: Routing với React Router v6+", "Chương 7: Form chuẩn với RHF & Zod"] },
  { chapterId: 121, articles: ["Chương 8: Tối ưu hiệu năng (Memoization)", "Chương 9: Code Splitting & Virtualization", "Chương 10: Sức mạnh Concurrent React 18"] },
  { chapterId: 122, articles: ["Chương 11: Design System (Radix, Tailwind)", "Chương 12: Testing (Vitest, Playwright)"] },
  { chapterId: 123, articles: ["Chương 13: Bảo mật Frontend (XSS, CSRF)", "Chương 14: Docker, Nginx & CI/CD"] },
  { chapterId: 124, articles: ["Chương 15: Thực chiến JWT & Axios Interceptors", "Chương 16: Tránh cạm bẫy Render & Memory Leaks"] },

  // SOLIDJS & SOLIDSTART
  { chapterId: 127, articles: ["Chương 1: Khởi tạo & Core Reactivity", "Chương 2: Control Flow & Lifecycle", "Chương 3: Props & Components", "Chương 4: Store & Context", "Chương 5: Async & Fetching", "Chương 6: Định tuyến & Solid Router", "Chương 7: Giới thiệu SolidStart", "Chương 8: Styling & classList", "Chương 9: Custom Directives", "Chương 10: Tối ưu & Gotchas"] },
  { chapterId: 129, articles: ["Chương 1: Tổng quan & Routing", "Chương 2: Data Fetching (Server)", "Chương 3: Server Actions & Forms", "Chương 4: API Routes & Middleware", "Chương 5: Build & Deployment"] },

  // GODOT 2D
  { chapterId: 132, articles: ["Bài 1: Giới thiệu & Cú pháp cơ bản", "Bài 2: Các khái niệm cốt lõi: Node & Scene", "Bài 3: Xử lý Input & Sự kiện", "Bài 4: Hệ thống Tín hiệu (Signals)", "Bài 5: Vectơ và Toán học trong Game 2D", "Bài 6: Sinh ra Scene bằng Code (Instancing)", "Bài 7: Các loại Node Vật lý và Va chạm", "Bài 8: Hướng Đối Tượng - Lớp và Khởi tạo", "Bài 9: Hướng Đối Tượng - Kế thừa và Đa hình", "Bài 10: Hướng Đối Tượng - Getters và Setters"] },
  { chapterId: 134, articles: ["Bài 1: State Machine Cơ Bản (FSM)", "Bài 2: Autoload (Singleton) & Global State", "Bài 3: Hệ thống Event Bus (Signals)", "Bài 4: Object Pooling (Tối ưu đạn)", "Bài 5: Kiến trúc Component-based"] },
  { chapterId: 136, articles: ["Bài 1: Khởi tạo Bản đồ (TileMap) và Nhân vật", "Bài 2: Di chuyển theo Ô (Grid-based Movement)", "Bài 3: Tương tác Cuốc đất (Thay đổi TileMap)", "Bài 4: Gieo hạt và Thời gian lớn (Timer)", "Bài 5: Thu hoạch & Quản lý Kho đồ (Inventory)", "Bài 6: Hệ thống Thể lực (Stamina) & Sự Kiệt sức", "Bài 7: Vòng lặp Ngày/Đêm (Day/Night Cycle)", "Bài 8: Xây dựng Cửa Hàng (Shop UI)", "Bài 9: Hệ thống Lưu & Tải Game (Save / Load)", "Bài 10: Cơ chế Tưới Nước & Hệ thống Đất", "Bài 11: Hệ thống 4 Mùa (Seasons) & Cây héo úa", "Bài 12: Chăn nuôi (Xây Chuồng & Ấp Trứng)", "Bài 13: AI Động vật (Chăn nuôi Gà)", "Bài 14: Hệ thống Thời tiết & Mưa tự động", "Bài 15: Cơ chế Rớt đồ & Nam châm hút (Magnet)", "Bài 16: Chuyển Cảnh Mượt Mà (Scene Transition)", "Bài 17: Hệ thống Hội Thoại (Dialogue System)", "Bài 18: Lịch Trình NPC (NPC Schedule)", "Bài 19: Quản lý Âm Thanh (AudioManager)", "Bài 20: Main Menu & Xuất Game (Export)"] },
  { chapterId: 138, articles: ["Bài 1: Làm Chủ Hệ Thống Giao Diện (Control Nodes)", "Bài 2: Tạo HUD In-game (Thanh Máu & Icon)", "Bài 3: Nhập Môn AnimationPlayer", "Bài 4: Đỉnh cao AnimationTree (BlendSpace2D)", "Bài 5: State Machine trong AnimationTree"] },
  { chapterId: 140, articles: ["Bài 1: Health Component (Máu & I-Frames)", "Bài 2: Hitbox & Hurtbox Component", "Bài 3: Velocity Component (Vật lý)", "Bài 4: Audio Component (Random Pitch)", "Bài 5: Drop Component (Loot rớt đồ)"] },
  { chapterId: 142, articles: ["Bài 1: Nhóm Hình Ảnh (Visuals)", "Bài 2: Nhóm Vật lý & Va chạm (Physics)", "Bài 3: Nhóm Ánh sáng & Hiệu ứng (VFX)", "Bài 4: Nhóm Nghe - Nhìn (Camera & Audio)", "Bài 5: Nhóm Tìm đường (Navigation & AI)", "Bài 6: Nhóm Hoạt hình Xương (Skeletal)", "Bài 7: Nhóm Công cụ Tiện ích (Utilities)"] },
  { chapterId: 144, articles: ["Bài 1: Hàm Di chuyển Vật lý", "Bài 2: Hàm Toán học Vector2", "Bài 3: Hàm Tọa độ Trực quan (Node2D)", "Bài 4: Hàm Toán học Toàn cục (Global)", "Bài 5: Hàm Dò tìm (Raycast & Area)"] }
];

async function main() {
  const { db } = await import("../src/lib/turso");
  const { articles: articlesSchema } = await import("../src/db/schema");

  console.log("Đang bắt đầu thêm bài viết (Articles) cho tất cả các mục còn lại...");

  try {
    let totalAdded = 0;

    for (const group of remainingArticles) {
      console.log(`Đang xử lý chapterId: ${group.chapterId}`);

      let articleOrder = 1;
      for (const title of group.articles) {
        await db.insert(articlesSchema).values({
          title: title,
          contentMd: "", // Để trống nội dung lúc seed, có thể update sau
          chapterId: group.chapterId,
          order: articleOrder++,
        });
        totalAdded++;
      }
    }

    console.log(`✅ Đã thêm thành công tổng cộng ${totalAdded} bài viết cho các mục còn lại!`);
  } catch (error) {
    console.error("❌ Lỗi khi thêm dữ liệu bài viết:", error);
  }

  process.exit(0);
}

main();
