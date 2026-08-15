import { For, Show, onMount } from "solid-js";
import { A } from "@solidjs/router";
import gsap from "gsap";

interface Group {
  id: number;
  name: string;
}

export default function TopNav(props: {
  groups: Group[];
  activeGroupId: number | null;
  setActiveGroupId: (id: number) => void;
  pageTitle: string;
  isAdmin?: boolean;
  onOpenSearch?: () => void;
  onToggleSidebar?: () => void;
}) {
  let navHeaderRef: HTMLElement | undefined;

  onMount(() => {
    if (typeof window !== "undefined" && navHeaderRef) {
      // 1. Animate brand identity on entry
      gsap.fromTo(
        navHeaderRef.querySelector(".client-brand-group"),
        { opacity: 0, x: -14 },
        { opacity: 1, x: 0, duration: 0.45, ease: "power2.out" }
      );

      // 2. Animate navigation track tabs with spring stagger
      const tabs = navHeaderRef.querySelectorAll(".client-nav-tab");
      if (tabs.length > 0) {
        gsap.fromTo(
          tabs,
          { opacity: 0, y: -10, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.4,
            stagger: 0.05,
            ease: "back.out(1.4)",
            delay: 0.1,
          }
        );
      }

      // 3. Animate right-side actions cluster
      gsap.fromTo(
        navHeaderRef.querySelector(".client-nav-actions"),
        { opacity: 0, x: 14 },
        { opacity: 1, x: 0, duration: 0.45, ease: "power2.out", delay: 0.15 }
      );
    }
  });

  const handleTabClick = (e: MouseEvent, groupId: number) => {
    props.setActiveGroupId(groupId);
    if (typeof window !== "undefined") {
      const target = e.currentTarget as HTMLElement;
      gsap.fromTo(
        target,
        { scale: 0.93 },
        { scale: 1, duration: 0.3, ease: "back.out(2)" }
      );
    }
  };

  return (
    <header ref={navHeaderRef} class="client-top-nav">
      <div class="client-nav-inner">
        {/* Left: Mobile hamburger & Brand */}
        <div class="client-brand-group">
          <Show when={props.onToggleSidebar}>
            <button
              type="button"
              class="client-hamburger-btn"
              onClick={props.onToggleSidebar}
              title="Mở menu danh mục"
              aria-label="Mở menu danh mục"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </Show>

          <A href="/" class="client-brand-link">
            <span class="client-brand-badge">⚡</span>
            <span class="client-brand-title">DevPool</span>
          </A>

          <span class="client-brand-subtag">Learning Hub</span>
        </div>

        {/* Center: Learning Track Tabs with GSAP interaction */}
        <nav class="client-tabs-container">
          <For each={props.groups}>
            {(group) => (
              <button
                classList={{
                  "client-nav-tab": true,
                  active: props.activeGroupId === group.id,
                }}
                onClick={(e) => handleTabClick(e, group.id)}
              >
                <span class="client-tab-dot" />
                <span>{group.name}</span>
              </button>
            )}
          </For>
        </nav>

        {/* Right: Quick Search Button & Links */}
        <div class="client-nav-actions">
          {/* Quick Search Trigger */}
          <button
            class="client-search-trigger"
            onClick={props.onOpenSearch}
            title="Tìm kiếm tài liệu (Ctrl + K)"
          >
            <svg class="client-search-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="client-search-text">Tìm kiếm tài liệu...</span>
            <kbd class="client-kbd-hint">Ctrl K</kbd>
          </button>

          {/* About Link */}
          <A href="/about" class="client-nav-link" title="Giới thiệu">
            Về chúng tôi
          </A>

          {/* Admin link */}
          <Show
            when={props.isAdmin}
            fallback={
              <A href="/login" class="client-admin-link" title="Dành cho Quản trị viên">
                Admin
              </A>
            }
          >
            <A href="/admin" class="client-admin-badge" title="Mở trang Quản trị">
              ⚙️ Admin
            </A>
          </Show>
        </div>
      </div>
    </header>
  );
}
