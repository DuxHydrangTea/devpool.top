import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";

export default function About() {
  return (
    <div class="client-home-root about-page-root">
      <Title>Về DevPool - Nền Tảng Tri Thức Lập Trình & Kỹ Thuật Thực Chiến</Title>

      {/* HERO SECTION */}
      <section class="home-hero about-hero">
        <div class="home-hero-glow" />
        <div class="home-hero-badge">
          <span class="home-pulse-dot" />
          Sứ mệnh vì cộng đồng lập trình viên Việt Nam
        </div>

        <h1 class="home-hero-title">
          Về Chúng Tôi
          <br />
          <span class="home-title-gradient">DevPool Knowledge Hub</span>
        </h1>

        <p class="home-hero-desc">
          DevPool là nền tảng tài liệu kỹ thuật chuyên sâu và chia sẻ kinh nghiệm lập trình thực chiến.
          Chúng tôi hướng tới việc thu hẹp khoảng cách giữa lý thuyết cơ bản và những bài toán hóc búa trong các dự án doanh nghiệp thực tế.
        </p>

        <div class="home-hero-actions">
          <A href="/docs" class="home-btn-primary">
            🚀 Khám phá tài liệu ngay
          </A>
          <A href="/" class="home-btn-secondary">
            &larr; Về trang chủ
          </A>
        </div>
      </section>

      {/* 3 GIÁ TRỊ CỐT LÕI */}
      <section class="home-tracks-section">
        <div class="home-section-header">
          <span class="home-section-tag">Triết Lý Phát Triển</span>
          <h2 class="home-section-title">3 Trụ Cột Giá Trị Của DevPool</h2>
          <p class="home-section-desc">Mọi nội dung và dòng mã trên DevPool đều được xây dựng dựa trên 3 nguyên tắc cốt lõi</p>
        </div>

        <div class="home-tracks-grid">
          {/* Cột 1: Thực chiến */}
          <div class="home-track-card web-track">
            <div class="track-card-icon">🎯</div>
            <span class="track-card-badge">Production Focus</span>
            <h3 class="track-card-title">Thực Chiến & Chuyên Sâu</h3>
            <p class="track-card-desc">
              Không dừng lại ở cú pháp "Hello World" đơn giản, mọi giáo trình đều đi thẳng vào giải quyết vấn đề thực tế: Clean Architecture, Quản lý Transaction đa bảng, Caching đa tầng, Xử lý lỗi tập trung và bảo mật.
            </p>
            <ul class="track-card-topics">
              <li>✓ Code mẫu chuẩn Enterprise</li>
              <li>✓ Phân tích cạm bẫy (Pitfalls) thực tế</li>
              <li>✓ Kiểm tra cú pháp tự động 100%</li>
            </ul>
          </div>

          {/* Cột 2: Tốc độ */}
          <div class="home-track-card sys-track">
            <div class="track-card-icon">⚡</div>
            <span class="track-card-badge">Zero-Lag Experience</span>
            <h3 class="track-card-title">Tốc Độ & Trải Nghiệm</h3>
            <p class="track-card-desc">
              Được xây dựng trên nền tảng SolidJS, Nitro SSR, Edge SQLite và Upstash Redis, DevPool mang đến tốc độ phản hồi trang tức thì dưới 50ms, giúp quá trình tra cứu tài liệu mượt mà tuyệt đối.
            </p>
            <ul class="track-card-topics">
              <li>✓ Fine-grained Reactivity không Virtual DOM</li>
              <li>✓ L1 Memory Cache + L2 Edge Cache</li>
              <li>✓ Phím tắt tìm kiếm toàn cục Ctrl + K</li>
            </ul>
          </div>

          {/* Cột 3: Cộng đồng */}
          <div class="home-track-card game-track">
            <div class="track-card-icon">🌱</div>
            <span class="track-card-badge">Open Source</span>
            <h3 class="track-card-title">100% Mở & Phi Lợi Nhuận</h3>
            <p class="track-card-desc">
              Tri thức là để sẻ chia. Toàn bộ tài liệu, giáo trình, bài giảng và mã nguồn của nền tảng đều được cung cấp hoàn toàn miễn phí nhằm hỗ trợ thế hệ lập trình viên Việt Nam tự tin vươn ra thị trường quốc tế.
            </p>
            <ul class="track-card-topics">
              <li>✓ Miễn phí trọn đời cho cộng đồng</li>
              <li>✓ Luôn cập nhật phiên bản công nghệ mới nhất</li>
              <li>✓ Khuyến khích đóng góp mã nguồn mở</li>
            </ul>
          </div>
        </div>
      </section>

      {/* TECH STACK SHOWCASE */}
      <section class="home-features-section">
        <div class="home-section-header">
          <span class="home-section-tag">Dưới Nắp Ca-pô</span>
          <h2 class="home-section-title">Kiến Trúc Công Nghệ Của DevPool</h2>
          <p class="home-section-desc">DevPool chính là một dự án thực nghiệm áp dụng những công nghệ Web tiên tiến nhất hiện nay</p>
        </div>

        <div class="home-features-grid">
          <div class="home-feature-box">
            <div class="feature-box-icon">⚡</div>
            <h4 class="feature-box-title">SolidJS & SolidStart 2.0</h4>
            <p class="feature-box-desc">
              Framework giao diện phản ứng hạt mịn (Fine-grained Signals), không tiêu tốn tài nguyên Virtual DOM, tối ưu hóa kích thước JavaScript tải về mức tối thiểu.
            </p>
          </div>

          <div class="home-feature-box">
            <div class="feature-box-icon">🚀</div>
            <h4 class="feature-box-title">Nitro Engine & Vite 8</h4>
            <p class="feature-box-desc">
              Máy chủ Server-Side Rendering (SSR) thế hệ mới siêu nhanh, hỗ trợ Server Functions độc lập và build tối ưu hóa cấp cao.
            </p>
          </div>

          <div class="home-feature-box">
            <div class="feature-box-icon">💾</div>
            <h4 class="feature-box-title">Turso Edge SQLite & Drizzle ORM</h4>
            <p class="feature-box-desc">
              Cơ sở dữ liệu SQLite phân tán toàn cầu (Edge Database) kết hợp ORM Type-Safe Drizzle mang lại thời gian truy vấn gần như không độ trễ.
            </p>
          </div>

          <div class="home-feature-box">
            <div class="feature-box-icon">⚡</div>
            <h4 class="feature-box-title">Upstash Redis Multi-Tier Caching</h4>
            <p class="feature-box-desc">
              Hệ thống bộ nhớ đệm 2 tầng thông minh: L1 In-Memory phục vụ phản hồi nano-giây và L2 Edge Redis đảm bảo dữ liệu luôn sẵn sàng.
            </p>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section class="home-cta-strip">
        <div class="cta-inner">
          <h3 class="cta-title">Cùng Khám Phá & Nâng Tầm Tri Thức Lập Trình</h3>
          <p class="cta-desc">
            Bắt đầu hành trình học tập các công nghệ đỉnh cao như Golang Gin, Modern Angular, Godot 4 ngay hôm nay!
          </p>
          <div style={{ "display": "flex", "gap": "1rem", "justify-content": "center", "flex-wrap": "wrap", "margin-top": "1.5rem" }}>
            <A href="/docs" class="home-btn-primary">
              🚀 Vào kho tài liệu
            </A>
            <A href="/" class="home-btn-secondary">
              Về trang chủ
            </A>
          </div>
        </div>
      </section>
    </div>
  );
}
