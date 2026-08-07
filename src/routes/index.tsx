import { Title } from "@solidjs/meta";

export default function Home() {
  return (
    <div class="hero-container">
      <Title>DevPool - Nền tảng học lập trình</Title>
      <div class="hero-glow"></div>
      <div class="hero-content">
        <h1 class="hero-title">
          Chinh phục đỉnh cao<br /><span>Lập trình Game & Web</span>
        </h1>
        <p class="hero-subtitle">
          Khám phá lộ trình học tập bài bản, tài liệu chất lượng cao và hoàn toàn miễn phí. Bắt đầu hành trình của bạn ngay hôm nay bằng cách chọn chuyên mục ở menu bên trái.
        </p>
        
        <div class="hero-features">
          <div class="feature-card">
            <i class="fas fa-gamepad feature-icon"></i>
            <h3 class="feature-title">Lập trình Game</h3>
            <p class="feature-desc">Làm chủ Raylib, Godot 2D và xây dựng những tựa game đỉnh cao từ con số không.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-code feature-icon"></i>
            <h3 class="feature-title">Lập trình Web</h3>
            <p class="feature-desc">Nắm vững SolidJS, React, Next.js và các công nghệ Frontend hiện đại nhất.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-rocket feature-icon"></i>
            <h3 class="feature-title">Thực chiến</h3>
            <p class="feature-desc">Học qua các dự án thực tế, mã nguồn mở và hướng dẫn giải quyết lỗi chi tiết.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
