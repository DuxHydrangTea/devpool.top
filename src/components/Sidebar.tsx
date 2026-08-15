import { For, Show, createSignal, createMemo, onMount, createEffect } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import gsap from "gsap";

export interface Category {
  id: number;
  name: string;
  type: string;
  parentId: number | null;
  order: number;
  slug: string;
}

export interface Article {
  id: number;
  title: string;
  chapterId: number;
  order: number;
  slug: string;
}

export interface SidebarData {
  categories: Category[];
  articles: Article[];
  isAdmin?: boolean;
}

// Recursive Chapter Node Component
function ChapterNode(props: {
  chapter: Category;
  categorySlug?: string;
  getChapters: (id: number) => Category[];
  getArticles: (id: number) => Article[];
  filterText: string;
  onClose?: () => void;
}) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  let contentRef: HTMLDivElement | undefined;

  const subChapters = () => props.getChapters(props.chapter.id);
  const chapterArticles = () => props.getArticles(props.chapter.id);

  // Check if this chapter or any descendant has articles matching filter
  const hasContent = () => {
    if (!props.filterText) return true;
    if (chapterArticles().length > 0) return true;
    const checkSub = (sub: Category): boolean => {
      if (props.getArticles(sub.id).length > 0) return true;
      return props.getChapters(sub.id).some(checkSub);
    };
    return subChapters().some(checkSub);
  };

  const handleToggle = () => {
    const nextState = !isCollapsed();
    if (typeof window !== "undefined" && contentRef) {
      if (nextState) {
        // Collapsing
        gsap.to(contentRef, {
          height: 0,
          opacity: 0,
          duration: 0.22,
          ease: "power2.inOut",
          onComplete: () => setIsCollapsed(true),
        });
      } else {
        // Expanding
        setIsCollapsed(false);
        gsap.fromTo(
          contentRef,
          { height: 0, opacity: 0 },
          { height: "auto", opacity: 1, duration: 0.28, ease: "power2.out" }
        );
      }
    } else {
      setIsCollapsed(nextState);
    }
  };

  return (
    <Show when={hasContent()}>
      <div class="sidebar-chap-block">
        {/* Chapter Header */}
        <button
          class="sidebar-chap-header"
          onClick={handleToggle}
        >
          <span class="sidebar-chap-title">
            <span class="sidebar-mini-chevron">{isCollapsed() ? "▸" : "▾"}</span>
            <span class="chap-icon">📑</span>
            <span class="chap-name-text">{props.chapter.name}</span>
          </span>
          <Show when={chapterArticles().length > 0}>
            <span class="sidebar-art-count">{chapterArticles().length}</span>
          </Show>
        </button>

        {/* Chapter Articles & Subchapters */}
        <Show when={!isCollapsed()}>
          <div ref={contentRef} class="sidebar-chap-content">
            {/* Direct articles in this chapter */}
            <Show when={chapterArticles().length > 0}>
              <ul class="sidebar-art-list">
                <For each={chapterArticles()}>
                  {(art) => {
                    const path = props.categorySlug ? `/docs/${props.categorySlug}/${art.slug}` : `/docs/${art.slug}`;
                    const isActive = location.pathname === path || location.pathname.endsWith(`/${art.slug}`);

                    const handleMouseEnter = (e: MouseEvent) => {
                      if (typeof window === "undefined") return;
                      const target = e.currentTarget as HTMLElement;
                      const bullet = target.querySelector(".art-bullet");
                      gsap.to(target, { x: 4, duration: 0.18, ease: "power2.out" });
                      if (bullet) gsap.to(bullet, { scale: 1.4, color: "#34d399", duration: 0.18 });
                    };

                    const handleMouseLeave = (e: MouseEvent) => {
                      if (typeof window === "undefined") return;
                      const target = e.currentTarget as HTMLElement;
                      const bullet = target.querySelector(".art-bullet");
                      gsap.to(target, { x: 0, duration: 0.22, ease: "power2.inOut" });
                      if (bullet) gsap.to(bullet, { scale: 1, color: "inherit", duration: 0.22 });
                    };

                    return (
                      <li>
                        <A
                          href={path}
                          class={`sidebar-art-link ${isActive ? "active" : ""}`}
                          onMouseEnter={handleMouseEnter}
                          onMouseLeave={handleMouseLeave}
                          onClick={() => {
                            if (props.onClose) props.onClose();
                          }}
                        >
                          <span class="art-bullet">•</span>
                          <span class="art-title-text">{art.title}</span>
                        </A>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </Show>

            {/* Recursive Sub-chapters */}
            <Show when={subChapters().length > 0}>
              <div class="sidebar-subchapters-list">
                <For each={subChapters()}>
                  {(sub) => (
                    <ChapterNode
                      chapter={sub}
                      categorySlug={props.categorySlug}
                      getChapters={props.getChapters}
                      getArticles={props.getArticles}
                      filterText={props.filterText}
                      onClose={props.onClose}
                    />
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  );
}

export default function Sidebar(props: {
  isOpen: boolean;
  onClose: () => void;
  data?: SidebarData;
  activeGroupId: number | null;
  setActiveGroupId: (id: number) => void;
  activeCategoryId: number | null;
  setActiveCategoryId: (id: number) => void;
}) {
  const location = useLocation();
  const [filterText, setFilterText] = createSignal("");
  const [collapsedCats, setCollapsedCats] = createSignal<Record<number, boolean>>({});
  let listContainerRef: HTMLDivElement | undefined;
  let trackLabelRef: HTMLDivElement | undefined;

  const toggleCategory = (catId: number) => {
    setCollapsedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const categories = () => props.data?.categories || [];
  const articles = () => props.data?.articles || [];

  // Groups (Level 1)
  const groups = createMemo(() => categories().filter((c) => c.type === "group"));
  const activeGroup = createMemo(() => {
    if (props.activeGroupId) {
      const found = groups().find((g) => g.id === props.activeGroupId);
      if (found) return found;
    }
    return groups()[0];
  });

  // Categories under active group (Level 2)
  const activeCategories = createMemo(() => {
    const grp = activeGroup();
    if (!grp) {
      return categories().filter((c) => c.type === "category" && c.parentId === null);
    }
    return categories().filter((c) => c.type === "category" && c.parentId === grp.id);
  });

  // Get child chapters or child sub-categories under any parent category/chapter
  const getChapters = (parentId: number) => {
    return categories().filter(
      (c) => (c.type === "chapter" || c.type === "category") && c.parentId === parentId
    );
  };

  // Get direct articles assigned to a chapter or category ID
  const getArticles = (chapterOrCatId: number) => {
    const arts = articles().filter((a) => a.chapterId === chapterOrCatId);
    const filter = filterText().toLowerCase().trim();
    if (!filter) return arts;
    return arts.filter(
      (a) => a.title.toLowerCase().includes(filter) || a.slug.toLowerCase().includes(filter)
    );
  };

  // GSAP: Animate category blocks ONLY on actual track change (different group ID)
  let lastAnimatedGroupId: number | null = null;
  createEffect(() => {
    const currentGroupId = props.activeGroupId;
    if (currentGroupId === null || currentGroupId === undefined) return;

    // Only run stagger animation if the user actually switched to a DIFFERENT group
    if (currentGroupId !== lastAnimatedGroupId) {
      lastAnimatedGroupId = currentGroupId;

      if (typeof window !== "undefined" && listContainerRef) {
        // Animate track badge
        if (trackLabelRef) {
          gsap.fromTo(
            trackLabelRef,
            { opacity: 0, x: -8 },
            { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
          );
        }

        // Animate category blocks stagger
        const blocks = listContainerRef.querySelectorAll(".sidebar-cat-block");
        if (blocks.length > 0) {
          gsap.fromTo(
            blocks,
            { opacity: 0, y: 12, scale: 0.98 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.35,
              stagger: 0.04,
              ease: "power2.out",
            }
          );
        }
      }
    }
  });

  // GSAP: Animate filtered articles on search input
  createEffect(() => {
    const filter = filterText();
    if (typeof window !== "undefined" && listContainerRef && filter) {
      const items = listContainerRef.querySelectorAll(".sidebar-art-link");
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, x: -6 },
          { opacity: 1, x: 0, duration: 0.22, stagger: 0.02, ease: "power1.out" }
        );
      }
    }
  });

  return (
    <aside class={`client-sidebar ${props.isOpen ? "open" : ""}`}>
      {/* Sidebar Header with Track Picker & Search */}
      <div class="sidebar-top-section">
        {/* Category Group Selector (Mobile & Quick Switcher) */}
        <Show when={groups().length > 1}>
          <div class="sidebar-groups-switcher">
            <div class="sidebar-groups-label-row">
              <span class="sidebar-groups-label">CHỦ ĐỀ ĐANG CHỌN</span>
              <span class="sidebar-groups-active-badge">{activeGroup()?.name}</span>
            </div>
            <div class="sidebar-groups-track">
              <For each={groups()}>
                {(group) => {
                  const isActive = () => activeGroup()?.id === group.id;

                  return (
                    <button
                      type="button"
                      class={`sidebar-group-chip ${isActive() ? "active" : ""}`}
                      onClick={() => {
                        props.setActiveGroupId?.(group.id);
                      }}
                      title={`Chuyển sang chủ đề ${group.name}`}
                    >
                      <span class="sidebar-chip-dot" />
                      <span class="sidebar-chip-name">{group.name}</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

        <Show when={groups().length <= 1}>
          {/* Fallback Single Track Label */}
          <div ref={trackLabelRef} class="sidebar-track-label">
            <span class="track-icon">📚</span>
            <span class="track-name">{activeGroup()?.name || "Tài liệu lập trình"}</span>
          </div>
        </Show>

        {/* Live Filter in Sidebar */}
        <div class="sidebar-filter-wrapper">
          <svg class="sidebar-filter-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            class="sidebar-filter-input"
            placeholder="Lọc bài viết trong mục này..."
            value={filterText()}
            onInput={(e) => setFilterText(e.currentTarget.value)}
          />
          <Show when={filterText()}>
            <button class="sidebar-filter-clear" onClick={() => setFilterText("")}>
              &times;
            </button>
          </Show>
        </div>
      </div>

      {/* Tree Content */}
      <div class="sidebar-scroll-area">
        <Show
          when={activeCategories().length > 0}
          fallback={
            <div class="sidebar-empty-state">
              <p class="text-xs text-slate-500">Chưa có chuyên mục nào trong nhóm này.</p>
            </div>
          }
        >
          <div ref={listContainerRef} class="sidebar-category-list">
            <For each={activeCategories()}>
              {(cat) => {
                const chaps = getChapters(cat.id);
                const directArticles = getArticles(cat.id);
                const isCollapsed = () => !!collapsedCats()[cat.id];

                // Total articles count across category and its chapters
                const totalArticlesCount = () => {
                  let total = directArticles.length;
                  const countSub = (cId: number) => {
                    const subArts = getArticles(cId);
                    total += subArts.length;
                    getChapters(cId).forEach((sub) => countSub(sub.id));
                  };
                  chaps.forEach((ch) => countSub(ch.id));
                  return total;
                };

                return (
                  <div class="sidebar-cat-block">
                    {/* Category Header (Collapsible) */}
                    <button
                      class="sidebar-cat-header"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <span class="sidebar-cat-title">
                        <span class="sidebar-chevron">{isCollapsed() ? "▶" : "▼"}</span>
                        <span>{cat.name}</span>
                      </span>
                      <Show when={totalArticlesCount() > 0}>
                        <span class="sidebar-cat-count">{totalArticlesCount()}</span>
                      </Show>
                    </button>

                    {/* Category Content: Direct Articles & Chapters */}
                    <Show when={!isCollapsed()}>
                      <div class="sidebar-chapters-wrapper">
                        {/* 1. Direct Articles in Category */}
                        <Show when={directArticles.length > 0}>
                          <ul class="sidebar-art-list">
                            <For each={directArticles}>
                              {(art) => {
                                const path = cat.slug ? `/docs/${cat.slug}/${art.slug}` : `/docs/${art.slug}`;
                                const isActive =
                                  location.pathname === path || location.pathname.endsWith(`/${art.slug}`);

                                const handleMouseEnter = (e: MouseEvent) => {
                                  if (typeof window === "undefined") return;
                                  const target = e.currentTarget as HTMLElement;
                                  const bullet = target.querySelector(".art-bullet");
                                  gsap.to(target, { x: 4, duration: 0.18, ease: "power2.out" });
                                  if (bullet) gsap.to(bullet, { scale: 1.4, color: "#34d399", duration: 0.18 });
                                };

                                const handleMouseLeave = (e: MouseEvent) => {
                                  if (typeof window === "undefined") return;
                                  const target = e.currentTarget as HTMLElement;
                                  const bullet = target.querySelector(".art-bullet");
                                  gsap.to(target, { x: 0, duration: 0.22, ease: "power2.inOut" });
                                  if (bullet) gsap.to(bullet, { scale: 1, color: "inherit", duration: 0.22 });
                                };

                                return (
                                  <li>
                                    <A
                                      href={path}
                                      class={`sidebar-art-link ${isActive ? "active" : ""}`}
                                      onMouseEnter={handleMouseEnter}
                                      onMouseLeave={handleMouseLeave}
                                      onClick={() => {
                                        if (props.onClose) props.onClose();
                                      }}
                                    >
                                      <span class="art-bullet">•</span>
                                      <span class="art-title-text">{art.title}</span>
                                    </A>
                                  </li>
                                );
                              }}
                            </For>
                          </ul>
                        </Show>

                        {/* 2. Recursive Chapters */}
                        <Show when={chaps.length > 0}>
                          <For each={chaps}>
                            {(chap) => (
                              <ChapterNode
                                chapter={chap}
                                categorySlug={cat.slug}
                                getChapters={getChapters}
                                getArticles={getArticles}
                                filterText={filterText()}
                                onClose={props.onClose}
                              />
                            )}
                          </For>
                        </Show>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </aside>
  );
}
