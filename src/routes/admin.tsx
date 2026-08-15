import { Show, Suspense } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { verifyToken } from "~/lib/auth";
import { redirect, query, createAsync, A, useLocation, action, useAction } from "@solidjs/router";

function getCookie(name: string) {
  const event = getRequestEvent();
  if (!event) return null;
  const cookieHeader = event.request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

const checkAuth = query(async () => {
  "use server";
  const token = getCookie("admin_token");
  if (!token) {
    throw redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload) {
    throw redirect("/login");
  }

  return payload;
}, "check-auth");

const logoutServer = action(async () => {
  "use server";
  const event = getRequestEvent();
  if (event) {
    event.response.headers.append(
      "Set-Cookie",
      "admin_token=; HttpOnly; Path=/; Max-Age=0"
    );
  }
  throw redirect("/login");
}, "logout-action");

export default function AdminLayout(props: any) {
  const user = createAsync(() => checkAuth());
  const location = useLocation();
  const logout = useAction(logoutServer);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin" || location.pathname === "/admin/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Show
      when={user()}
      fallback={
        <div class="dash-root" style={{ padding: "3rem 1.5rem" }}>
          <div class="doc-skeleton-header skeleton-shimmer" />
          <div class="doc-skeleton-lines mt-4">
            <div class="skeleton-line skeleton-shimmer w-1/2" />
            <div class="skeleton-line skeleton-shimmer w-3/4" />
          </div>
        </div>
      }
    >
      <div class="admin-shell">
        {/* DEDICATED ADMIN TOP NAVIGATION BAR */}
        <header class="admin-topbar">
          <div class="admin-topbar-inner">
            {/* Left: Brand Identity */}
            <div class="admin-brand-cluster">
              <A href="/admin" class="admin-brand-link">
                <span class="admin-brand-logo">⚡</span>
                <span class="admin-brand-text">DEVPOOL</span>
                <span class="admin-brand-tag">ADMIN</span>
              </A>
              <span class="admin-version-badge">v2.4</span>
            </div>

            {/* Middle: Navigation Tabs */}
            <nav class="admin-nav-links">
              <A
                href="/admin"
                class={`admin-nav-item ${isActive("/admin") && !isActive("/admin/categories") && !isActive("/admin/articles") ? "active" : ""}`}
              >
                <svg class="admin-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Tổng quan</span>
              </A>

              <A
                href="/admin/categories"
                class={`admin-nav-item ${isActive("/admin/categories") ? "active" : ""}`}
              >
                <svg class="admin-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Cấu trúc & Phân cấp</span>
              </A>

              <A
                href="/admin/articles"
                class={`admin-nav-item ${isActive("/admin/articles") ? "active" : ""}`}
              >
                <svg class="admin-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Quản lý Bài viết</span>
              </A>
            </nav>

            {/* Right: Quick Links & User Actions */}
            <div class="admin-user-cluster">
              <A href="/" target="_blank" class="admin-preview-btn" title="Xem trang tài liệu Client">
                <span>Docs</span>
                <svg class="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </A>

              <div class="admin-user-pill">
                <span class="admin-user-avatar">A</span>
                <span class="admin-user-name">{user()?.username || "Admin"}</span>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                class="admin-logout-btn"
                title="Đăng xuất"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* ADMIN MAIN CONTENT AREA */}
        <main class="admin-main-viewport">
          <Suspense fallback={<div class="p-8 text-center text-slate-400">Đang tải nội dung...</div>}>
            {props.children}
          </Suspense>
        </main>
      </div>
    </Show>
  );
}
