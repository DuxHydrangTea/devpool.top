import { For, Show, onMount, onCleanup, createSignal, createMemo, createEffect } from "solid-js";
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
  let tabsContainerRef: HTMLElement | undefined;
  let moreMenuRef: HTMLDivElement | undefined;

  const [visibleCount, setVisibleCount] = createSignal(props.groups.length);
  const [isMoreOpen, setIsMoreOpen] = createSignal(false);
  const [dropdownPos, setDropdownPos] = createSignal<{ top: number; left: number }>({ top: 0, left: 0 });

  // Map to cache intrinsic width of each tab by group id
  const tabWidthCache = new Map<number, number>();

  // Prioritize active group so the currently selected track is ALWAYS visible in full
  const prioritizedGroups = createMemo(() => {
    const list = [...props.groups];
    const activeId = props.activeGroupId;
    if (!activeId || list.length <= 1) return list;

    const vCount = visibleCount();
    const activeIdx = list.findIndex((g) => g.id === activeId);

    // If active group would be hidden in overflow, promote it into the visible slots
    if (activeIdx >= vCount && vCount > 0) {
      const [activeItem] = list.splice(activeIdx, 1);
      // Place it right before the overflow cut
      list.splice(vCount - 1, 0, activeItem);
    }

    return list;
  });

  // Split prioritized groups into visible tabs and overflow dropdown items
  const visibleGroups = createMemo(() => {
    return prioritizedGroups().slice(0, visibleCount());
  });

  const overflowGroups = createMemo(() => {
    return prioritizedGroups().slice(visibleCount());
  });

  // Accurate priority tabs calculation
  const calculateVisibleTabs = () => {
    if (!tabsContainerRef || props.groups.length === 0) return;

    // Cache measured widths of any currently rendered tabs
    const renderedTabs = tabsContainerRef.querySelectorAll<HTMLElement>(".client-nav-tab:not(.client-nav-more-btn)");
    renderedTabs.forEach((el) => {
      const gId = Number(el.dataset.groupId);
      if (gId) {
        tabWidthCache.set(gId, el.getBoundingClientRect().width);
      }
    });

    const containerWidth = tabsContainerRef.clientWidth;
    if (containerWidth <= 120) {
      setVisibleCount(1);
      return;
    }

    const gap = 8;
    const moreBtnWidth = 78; // fixed compact width of "+N ▾"

    // Estimate width of a tab if not yet measured
    const getTabWidth = (group: Group) => {
      return tabWidthCache.get(group.id) || (group.name.length * 8.5 + 44);
    };

    // Calculate total width if ALL tabs were shown
    let totalAllWidth = 0;
    props.groups.forEach((g, i) => {
      totalAllWidth += getTabWidth(g) + (i > 0 ? gap : 0);
    });

    // If all tabs fit comfortably inside available space
    if (totalAllWidth <= containerWidth) {
      setVisibleCount(props.groups.length);
      return;
    }

    // Need more button: calculate how many fit with moreBtnWidth reserved
    const maxAllowedWidth = containerWidth - moreBtnWidth - gap;
    let accumulatedWidth = 0;
    let count = 0;

    for (let i = 0; i < props.groups.length; i++) {
      const g = props.groups[i];
      const w = getTabWidth(g) + (i > 0 ? gap : 0);
      if (accumulatedWidth + w <= maxAllowedWidth) {
        accumulatedWidth += w;
        count++;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(1, count));
  };

  const toggleMoreMenu = (e: MouseEvent) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: Math.max(16, Math.min(window.innerWidth - 260, rect.left)),
      });
    }
    setIsMoreOpen(!isMoreOpen());
  };

  onMount(() => {
    if (typeof window !== "undefined") {
      // 1. Initial measurement & ResizeObserver
      if (tabsContainerRef) {
        calculateVisibleTabs();
        const ro = new ResizeObserver(() => {
          calculateVisibleTabs();
        });
        ro.observe(tabsContainerRef);

        onCleanup(() => ro.disconnect());
      }

      // 2. Click outside & Escape handlers
      const handleClickOutside = (e: MouseEvent) => {
        if (isMoreOpen() && moreMenuRef && !moreMenuRef.contains(e.target as Node)) {
          setIsMoreOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isMoreOpen()) {
          setIsMoreOpen(false);
        }
      };

      const handleScroll = () => {
        if (isMoreOpen()) setIsMoreOpen(false);
      };

      document.addEventListener("pointerdown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      window.addEventListener("scroll", handleScroll, { passive: true });

      onCleanup(() => {
        document.removeEventListener("pointerdown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
        window.removeEventListener("scroll", handleScroll);
      });
    }
  });

  // Re-calculate when groups prop or activeGroupId changes
  createEffect(() => {
    if (props.groups.length > 0) {
      setTimeout(() => calculateVisibleTabs(), 30);
    }
  });

  // GSAP animation on dropdown open
  createEffect(() => {
    if (isMoreOpen() && moreMenuRef) {
      gsap.fromTo(
        moreMenuRef,
        { opacity: 0, y: -6, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" }
      );
    }
  });

  const handleTabClick = (e: MouseEvent, groupId: number) => {
    props.setActiveGroupId(groupId);
    setIsMoreOpen(false);
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

        {/* Center: Dynamic Priority+ Navigation (No Text Truncation, No Overflow Collision) */}
        <nav ref={tabsContainerRef} class="client-tabs-container">
          <For each={visibleGroups()}>
            {(group) => (
              <button
                type="button"
                data-group-id={group.id}
                classList={{
                  "client-nav-tab": true,
                  active: props.activeGroupId === group.id,
                }}
                onClick={(e) => handleTabClick(e, group.id)}
                title={`Chuyển sang ${group.name}`}
              >
                <span class="client-tab-dot" />
                <span>{group.name}</span>
              </button>
            )}
          </For>

          {/* Priority+ Overflow Dropdown Trigger Button - Always Compact & Clean */}
          <Show when={overflowGroups().length > 0}>
            <div class="client-nav-more-wrapper">
              <button
                type="button"
                class={`client-nav-tab client-nav-more-btn ${isMoreOpen() ? "open" : ""}`}
                onClick={toggleMoreMenu}
                title="Xem các chủ đề khác"
                aria-expanded={isMoreOpen()}
              >
                <svg
                  class="client-more-icon"
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>+{overflowGroups().length}</span>
                <span class="client-more-chevron">{isMoreOpen() ? "▴" : "▾"}</span>
              </button>
            </div>
          </Show>
        </nav>

        {/* Fixed Dropdown Menu (Portal Style) */}
        <Show when={isMoreOpen() && overflowGroups().length > 0}>
          <div
            ref={moreMenuRef}
            class="client-nav-overflow-menu fixed-menu"
            style={{
              position: "fixed",
              top: `${dropdownPos().top}px`,
              left: `${dropdownPos().left}px`,
            }}
          >
            <div class="client-overflow-header">
              <span class="client-overflow-title">CHỦ ĐỀ KHÁC</span>
              <span class="client-overflow-count">{overflowGroups().length} môn học</span>
            </div>
            <div class="client-overflow-list">
              <For each={overflowGroups()}>
                {(group) => {
                  const isActive = () => props.activeGroupId === group.id;
                  return (
                    <button
                      type="button"
                      class={`client-overflow-item ${isActive() ? "active" : ""}`}
                      onClick={(e) => handleTabClick(e, group.id)}
                    >
                      <span class={`client-overflow-dot ${isActive() ? "active" : ""}`} />
                      <span class="client-overflow-name">{group.name}</span>
                      <Show when={isActive()}>
                        <span class="client-overflow-check">✓</span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

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
