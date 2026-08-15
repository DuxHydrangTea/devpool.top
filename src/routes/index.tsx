import { Title } from "@solidjs/meta";
import { A, query, createAsync } from "@solidjs/router";
import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { asc } from "drizzle-orm";
import { For, Show } from "solid-js";

const getHomeDataServer = query(async () => {
  "use server";
  const groups = await db.select().from(categoriesSchema).where(categoriesSchema.type === "group" as any).orderBy(asc(categoriesSchema.order));
  const categories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
  const latestArticles = await db.select().from(articlesSchema).orderBy(asc(articlesSchema.order)).limit(6);

  return {
    groups,
    categories,
    latestArticles,
  };
}, "home-data");

export default function Home() {
  const data = createAsync(() => getHomeDataServer());

  return (
    <div class="client-home-root">
      <Title>DevPool - Nền Tảng Học Lập Trình Game & Web Hiện Đại</Title>

      {/* HERO SECTION */}
      <section class="home-hero">
        <div class="home-hero-glow" />
        <div class="home-hero-badge">
          <span class="home-pulse-dot" />
          Nền tảng tri thức mã nguồn mở · Cập nhật liên tục
        </div>

        <h1 class="home-hero-title">
          Chinh Phục Đỉnh Cao
          <br />
          <span class="home-title-gradient">Lập Trình Game & Web</span>
        </h1>

        <p class="home-hero-desc">
          Lộ trình học tập bài bản, tài liệu kỹ thuật chuyên sâu và ví dụ thực chiến mã nguồn mở.
          Làm chủ Godot 4, Raylib, SolidJS và kiến trúc phần mềm hiện đại hoàn toàn miễn phí.
        </p>

        <div class="home-hero-actions">
          <A href="/docs/godot-4/bai-01-cai-dat" class="home-btn-primary">
            🚀 Bắt đầu học ngay
          </A>
          <A href="/about" class="home-btn-secondary">
            Về DevPool &rarr;
          </A>
        </div>

        {/* Tech Stack Pills */}
        <div class="home-tech-pills">
          <span class="tech-pill">🎮 Godot 4</span>
          <span class="tech-pill">🕹️ Raylib</span>
          <span class="tech-pill">⚡ SolidJS</span>
          <span class="tech-pill">🚀 Vite 8</span>
          <span class="tech-pill">💾 Turso SQLite</span>
          <span class="tech-pill">🌐 Nitro SSR</span>
        </div>
      </section>

      {/* LEARNING TRACKS CARDS */}
      <section class="home-tracks-section">
        <div class="home-section-header">
          <span class="home-section-tag">Lộ Trình Đào Tạo</span>
          <h2 class="home-section-title">Các Chủ Đề Nổi Bật</h2>
          <p class="home-section-desc">Chọn chủ đề bạn quan tâm để truy cập chuỗi bài giảng có hệ thống</p>
        </div>

        <div class="home-tracks-grid">
          {/* Card 1: Game Dev */}
          <div class="home-track-card game-track">
            <div class="track-card-icon">🎮</div>
            <span class="track-card-badge">Game Development</span>
            <h3 class="track-card-title">Godot 4 & Raylib Engine</h3>
            <p class="track-card-desc">
              Học thiết kế game 2D/3D từ cơ bản đến nâng cao. Xử lý Physics 2D, State Machine, Tilemap, Animation và Shaders.
            </p>
            <ul class="track-card-topics">
              <li>✓ Cài đặt & Làm quen Node Tree</li>
              <li>✓ Điều khiển CharacterBody2D mượt mà</li>
              <li>✓ Xây dựng Map & Tilemap Collision</li>
              <li>✓ Tối ưu hóa hiệu năng render</li>
            </ul>
            <A href="/docs" class="track-card-link">
              Khám phá bài học &rarr;
            </A>
          </div>

          {/* Card 2: Modern Web */}
          <div class="home-track-card web-track">
            <div class="track-card-icon">⚡</div>
            <span class="track-card-badge">Modern Web</span>
            <h3 class="track-card-title">SolidJS, Vite & Fullstack</h3>
            <p class="track-card-desc">
              Xây dựng ứng dụng Web siêu tốc với Fine-grained Reactivity, Server Actions, Nitro Engine và Edge SQLite.
            </p>
            <ul class="track-card-topics">
              <li>✓ Reactive Primitives (Signals, Memos)</li>
              <li>✓ Server-Side Rendering (SSR) với Nitro</li>
              <li>✓ Quản lý Dữ liệu Turso & Drizzle ORM</li>
              <li>✓ Tối ưu hóa Web Vitals 100/100</li>
            </ul>
            <A href="/docs" class="track-card-link">
              Khám phá bài học &rarr;
            </A>
          </div>

          {/* Card 3: System & Optimization */}
          <div class="home-track-card sys-track">
            <div class="track-card-icon">🧠</div>
            <span class="track-card-badge">Architecture</span>
            <h3 class="track-card-title">Kiến Trúc & Tối Ưu Hệ Thống</h3>
            <p class="track-card-desc">
              Tư duy thiết kế phần mềm sạch, Design Patterns, Caching Strategies và tối ưu hóa bộ nhớ cho hệ thống tải cao.
            </p>
            <ul class="track-card-topics">
              <li>✓ Clean Architecture & Modular Code</li>
              <li>✓ Multi-tier Caching & Low Latency</li>
              <li>✓ Tối ưu RAM & Garbage Collection</li>
              <li>✓ Triển khai Edge Deployment an toàn</li>
            </ul>
            <A href="/docs" class="track-card-link">
              Khám phá bài học &rarr;
            </A>
          </div>
        </div>
      </section>

      {/* CORE PLATFORM FEATURES */}
      <section class="home-features-section">
        <div class="home-section-header">
          <span class="home-section-tag">Trải Nghiệm Học Tập</span>
          <h2 class="home-section-title">Tại Sao Nên Chọn DevPool?</h2>
        </div>

        <div class="home-features-grid">
          <div class="home-feature-box">
            <div class="feature-box-icon">⚡</div>
            <h4 class="feature-box-title">Độ Trễ Cực Thấp (Instant Load)</h4>
            <p class="feature-box-desc">
              Nhờ bộ nhớ đệm In-Memory thông minh và Edge SQLite, các bài viết tải gần như tức thì mà không có độ trễ.
            </p>
          </div>

          <div class="home-feature-box">
            <div class="feature-box-icon">🔍</div>
            <h4 class="feature-box-title">Tra Cứu Nhanh Chóng (Ctrl + K)</h4>
            <p class="feature-box-desc">
              Tìm kiếm toàn diện bất kỳ bài viết hay đoạn mã nào chỉ với vài ký tự bằng phím tắt tìm kiếm toàn cục.
            </p>
          </div>

          <div class="home-feature-box">
            <div class="feature-box-icon">🎨</div>
            <h4 class="feature-box-title">Trình Đọc Dracula Dark Theme</h4>
            <p class="feature-box-desc">
              Giao diện tối dịu mắt, làm nổi bật mã nguồn lập trình với bảng màu Dracula chuẩn mực và zoom ảnh một chạm.
            </p>
          </div>

          <div class="home-feature-box">
            <div class="feature-box-icon">📖</div>
            <h4 class="feature-box-title">100% Miễn Phí & Mã Nguồn Mở</h4>
            <p class="feature-box-desc">
              Toàn bộ bài giảng và tài liệu được biên soạn phi lợi nhuận nhằm hỗ trợ cộng đồng lập trình viên Việt Nam.
            </p>
          </div>
        </div>
      </section>

      {/* CTA FOOTER STRIP */}
      <section class="home-cta-strip">
        <div class="cta-inner">
          <h3 class="cta-title">Sẵn sàng nâng tầm kỹ năng lập trình của bạn?</h3>
          <p class="cta-desc">Truy cập ngay kho bài viết hoặc tìm kiếm chủ đề bạn muốn tìm hiểu hôm nay.</p>
          <A href="/docs" class="home-btn-primary">
            🚀 Mở kho tài liệu ngay
          </A>
        </div>
      </section>
    </div>
  );
}
