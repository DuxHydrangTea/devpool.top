# 🌟 DevPool.top - Nền Tảng Tài Liệu Lập Trình & Tri Thức Thực Chiến

<p align="center">
  <img src="https://raw.githubusercontent.com/DuxHydrangTea/devpool.top/main/public/favicon.ico" width="80" height="80" alt="DevPool Logo" />
</p>

<p align="center">
  <strong>Nền tảng tài liệu kỹ thuật chuyên sâu, mã nguồn mở dành riêng cho cộng đồng lập trình viên Việt Nam.</strong>
</p>

<p align="center">
  <a href="https://devpool.top"><img src="https://img.shields.io/badge/Website-devpool.top-34d399?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Website" /></a>
  <img src="https://img.shields.io/badge/SolidJS-2.0-4f46e5?style=for-the-badge&logo=solid&logoColor=white" alt="SolidJS" />
  <img src="https://img.shields.io/badge/Vite-8.0-646cff?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Turso-SQLite-000000?style=for-the-badge&logo=sqlite&logoColor=white" alt="Turso" />
  <img src="https://img.shields.io/badge/Upstash-Redis-00e9a3?style=for-the-badge&logo=redis&logoColor=white" alt="Upstash" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

---

## 📖 Giới Thiệu (About DevPool)

**DevPool** được xây dựng với mục tiêu thu hẹp khoảng cách giữa lý thuyết sách giáo khoa cơ bản và những bài toán thực tế phức tạp trong môi trường doanh nghiệp. Toàn bộ tài liệu trên hệ thống được biên soạn theo định hướng **Production-Ready**: tập trung vào kiến trúc sạch, phân tích cạm bẫy thực tế, tối ưu hiệu năng và bảo mật hệ thống.

---

## ✨ Tính Năng Nổi Bật (Core Features)

- ⚡ **Tốc Độ Phản Hồi Tức Thì (Instant Load):** Được tối ưu hóa bằng **SolidJS Fine-grained Reactivity** (không dùng Virtual DOM) kết hợp máy chủ **Nitro SSR** và kiến trúc bộ nhớ đệm 2 tầng (L1 In-Memory + L2 Upstash Redis), giúp tải trang dưới 50ms.
- 🌳 **Cấu Trúc Cây Phân Cấp Đa Tầng:** Quản lý tài liệu theo mô hình phân cấp 4 cấp độ trực quan: **Nhóm (Group) ➔ Chuyên mục (Category) ➔ Chương (Chapter) ➔ Bài viết (Article)**.
- 🔍 **Tìm Kiếm Toàn Cục Nhanh Chóng (`Ctrl + K`):** Hỗ trợ tìm kiếm thời gian thực theo từ khóa, tiêu đề và nội dung bài viết.
- 🎨 **Trình Đọc Markdown Dracula Hiện Đại:** Làm nổi bật cú pháp mã nguồn (Syntax Highlighting) với chủ đề Dracula, hỗ trợ xem ảnh một chạm (Medium-zoom), bảng dữ liệu chuẩn và GitHub Alerts (`[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!CAUTION]`).
- 🛡️ **Hệ Thống Quản Trị Nội Bộ (Admin CMS):** Bảng điều khiển quản lý danh mục, bài viết, tích hợp trình soạn thảo Markdown EasyMDE và cơ chế dọn sạch cache tự động.

---

## 📚 Các Bộ Giáo Trình Nổi Bật (Curriculums)

| Chủ Đề | Nội Dung Trọng Tâm | Trạng Thái |
| :--- | :--- | :---: |
| 🚀 **Golang Gin Framework** | Clean Architecture, Transaction Atomic, JWT/RBAC, Connection Pooling, Graceful Shutdown, Docker <15MB. | ✅ Hoàn thành (86+ bài) |
| ⚡ **Modern Angular (18/19)** | Standalone Architecture, Signals Reactivity (`signal`, `computed`, `effect`), Zoneless Performance, RxJS Streams, Deferrable Views (`@defer`). | ✅ Hoàn thành (40+ bài) |
| 🎮 **Game Development** | Làm chủ Godot 4 & Raylib Engine, Node Tree, State Machine, Tilemap Collision, 2D/3D Physics & Shaders. | ✅ Đang cập nhật |
| 🏛️ **Kiến Trúc & Tối Ưu Hệ Thống** | Multi-tier Caching Strategies, Database Edge Replication, Web Vitals 100/100, Microservices Patterns. | ✅ Đang cập nhật |

---

## 🛠️ Kiến Trúc Công Nghệ (Tech Stack)

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│       SolidJS 2.0 (Signals / Zero Virtual DOM)              │
│       Vanilla CSS Custom Design System                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / SSR
┌──────────────────────────────▼──────────────────────────────┐
│                    Nitro Server (Vite 8)                    │
│       L1 In-Memory Cache ───► L2 Upstash Edge Redis         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Drizzle ORM
┌──────────────────────────────▼──────────────────────────────┐
│                  Turso Database (LibSQL Edge)               │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend:** SolidJS, SolidStart 2.0, Solid Router, Marked.js, Highlight.js, Medium-zoom.
- **Styling:** Custom Vanilla CSS Design System (Không phụ thuộc Tailwind runtime, siêu nhẹ và kiểm soát 100% CSS).
- **Backend & SSR:** Nitro Engine, Vite 8, TypeScript.
- **Database & Cache:** Turso Edge SQLite, Drizzle ORM, Upstash Redis.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Getting Started)

### 1. Yêu cầu hệ thống
- **Node.js:** `>= 20.0.0` (Khuyên dùng Node 22 hoặc 24 LTS)
- **npm** hoặc **pnpm**

### 2. Cài đặt mã nguồn

```bash
# Clone repository
git clone https://github.com/DuxHydrangTea/devpool.top.git
cd devpool.top

# Cài đặt các gói phụ thuộc
npm install
```

### 3. Cấu hình biến môi trường (`.env`)

Tạo file `.env` tại thư mục gốc với các thông số sau:

```env
# Cấu hình Turso Database
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Cấu hình Upstash Redis Cache (Tùy chọn)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# Khóa bí mật ký Session / JWT Admin
JWT_SECRET=your-super-secret-jwt-key
```

### 4. Khởi chạy môi trường Development

```bash
npm run dev
```

Mở trình duyệt tại địa chỉ: `http://localhost:3000`

### 5. Đóng gói & Triển khai Production

```bash
# Biên dịch dự án
npm run build

# Khởi chạy server production
npm start
```

---

## 📂 Cấu Trúc Thư Mục (Project Layout)

```
devpool.top/
├── public/                 # Tài nguyên tĩnh (Favicon, Logo, Assets)
├── src/
│   ├── components/         # Reusable SolidJS Components (Sidebar, Nav, SearchModal,...)
│   ├── contexts/           # Title & State Contexts
│   ├── db/                 # Drizzle Schema & Database Migrations
│   ├── lib/                # Cache (L1/L2 Redis), Markdown Parser, Turso Client, Auth
│   ├── routes/             # SolidStart File-based Routing
│   │   ├── admin/          # Quản trị hệ thống (Categories, Articles)
│   │   ├── docs/           # Trang hiển thị chi tiết tài liệu (/docs/[...slug])
│   │   ├── about.tsx       # Trang giới thiệu DevPool
│   │   └── index.tsx       # Trang chủ (Hero, Tracks, Features)
│   ├── server/             # Server Services (Article, Category, Doc, Home Services)
│   ├── types/              # TypeScript Type Definitions
│   └── app.css             # Custom Vanilla CSS Design System
├── temp/                   # Thư mục chứa tài liệu soạn thảo & công cụ biên tập tạm
├── package.json
└── README.md
```

---

## 🤝 Đóng Góp Phát Triển (Contributing)

Mọi sự đóng góp nhằm cải thiện chất lượng bài giảng, sửa lỗi chính tả hoặc bổ sung các chủ đề kỹ thuật mới đều được hoan nghênh nồng nhiệt!

1. Fork dự án
2. Tạo nhánh tính năng (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi (`git commit -m 'feat: thêm bài viết mới'`)
4. Push lên nhánh của bạn (`git push origin feature/amazing-feature`)
5. Mở một **Pull Request**

---

## 📄 Giấy Phép (License)

Dự án được phát hành dưới giấy phép mã nguồn mở **[MIT License](LICENSE)**.

<p align="center">
  Phát triển với tất cả tâm huyết dành cho cộng đồng lập trình viên Việt Nam 🇻🇳
</p>
