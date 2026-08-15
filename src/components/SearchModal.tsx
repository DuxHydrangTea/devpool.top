import { createSignal, createMemo, Show, For, onMount, onCleanup, createEffect } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import gsap from "gsap";

export interface SearchArticleItem {
  id: number;
  title: string;
  slug: string;
  chapterName?: string;
  categoryName?: string;
  groupName?: string;
  categorySlug?: string;
}

export default function SearchModal(props: {
  isOpen: boolean;
  onClose: () => void;
  articles: SearchArticleItem[];
}) {
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const navigate = useNavigate();
  let inputRef: HTMLInputElement | undefined;
  let backdropRef: HTMLDivElement | undefined;
  let boxRef: HTMLDivElement | undefined;
  let resultsContainerRef: HTMLDivElement | undefined;

  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!q) return props.articles.slice(0, 8);

    return props.articles
      .filter((a) => {
        return (
          a.title.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          (a.chapterName && a.chapterName.toLowerCase().includes(q)) ||
          (a.categoryName && a.categoryName.toLowerCase().includes(q)) ||
          (a.groupName && a.groupName.toLowerCase().includes(q))
        );
      })
      .slice(0, 10);
  });

  const animateClose = () => {
    if (typeof window !== "undefined" && boxRef && backdropRef) {
      gsap.to(boxRef, {
        opacity: 0,
        scale: 0.95,
        y: -14,
        duration: 0.18,
        ease: "power2.in",
        onComplete: () => props.onClose(),
      });
      gsap.to(backdropRef, {
        opacity: 0,
        duration: 0.18,
        ease: "power2.in",
      });
    } else {
      props.onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;

    if (e.key === "Escape") {
      animateClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered().length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered().length) % Math.max(1, filtered().length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered()[selectedIndex()];
      if (item) {
        const path = item.categorySlug ? `/docs/${item.categorySlug}/${item.slug}` : `/docs/${item.slug}`;
        navigate(path);
        props.onClose();
      }
    }
  };

  // GSAP: Animate modal opening
  createEffect(() => {
    if (props.isOpen) {
      setTimeout(() => {
        if (typeof window !== "undefined") {
          if (backdropRef) {
            gsap.fromTo(
              backdropRef,
              { opacity: 0 },
              { opacity: 1, duration: 0.25, ease: "power2.out" }
            );
          }
          if (boxRef) {
            gsap.fromTo(
              boxRef,
              { opacity: 0, scale: 0.92, y: -20 },
              { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: "back.out(1.4)" }
            );
          }
        }
      }, 10);
    }
  });

  // GSAP: Animate results list items stagger
  createEffect(() => {
    const list = filtered();
    if (typeof window !== "undefined" && resultsContainerRef && list.length > 0) {
      const items = resultsContainerRef.querySelectorAll(".search-modal-item");
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, x: -8 },
          { opacity: 1, x: 0, duration: 0.22, stagger: 0.025, ease: "power1.out" }
        );
      }
    }
  });

  onMount(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
    }
  });

  onCleanup(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", handleKeyDown);
    }
  });

  return (
    <Show when={props.isOpen}>
      <div ref={backdropRef} class="search-modal-backdrop" onClick={animateClose}>
        <div ref={boxRef} class="search-modal-box" onClick={(e) => e.stopPropagation()}>
          {/* TOP INPUT BAR */}
          <div class="search-modal-header">
            <div class="search-modal-input-wrap">
              <svg class="search-modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={(el) => {
                  inputRef = el;
                  setTimeout(() => el?.focus(), 50);
                }}
                type="text"
                class="search-modal-input"
                placeholder="Tìm kiếm bài viết, chuyên mục, tài liệu..."
                value={query()}
                onInput={(e) => {
                  setQuery(e.currentTarget.value);
                  setSelectedIndex(0);
                }}
              />
            </div>

            <div class="search-modal-actions">
              <Show when={query()}>
                <button
                  class="search-modal-clear"
                  onClick={() => {
                    setQuery("");
                    inputRef?.focus();
                  }}
                  title="Xoá tìm kiếm"
                >
                  &times;
                </button>
              </Show>
              <span class="search-modal-esc" onClick={animateClose}>
                ESC
              </span>
            </div>
          </div>

          {/* RESULTS LIST */}
          <div ref={resultsContainerRef} class="search-modal-results">
            <Show
              when={filtered().length > 0}
              fallback={
                <div class="search-modal-empty">
                  <div class="search-empty-icon">🔍</div>
                  <p class="search-modal-empty-title">Không tìm thấy tài liệu phù hợp</p>
                  <p class="search-modal-empty-desc">
                    Thử tìm kiếm với từ khóa khác như "Godot", "Raylib", "Physics", "Vite", "SolidJS"...
                  </p>
                </div>
              }
            >
              <div class="search-results-list">
                <For each={filtered()}>
                  {(item, idx) => {
                    const path = item.categorySlug ? `/docs/${item.categorySlug}/${item.slug}` : `/docs/${item.slug}`;
                    const isSelected = selectedIndex() === idx();

                    return (
                      <A
                        href={path}
                        class={`search-modal-item ${isSelected ? "selected" : ""}`}
                        onClick={props.onClose}
                        onMouseEnter={() => setSelectedIndex(idx())}
                      >
                        <div class="search-item-left">
                          <div class="search-item-tile">
                            <svg class="search-item-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>

                          <div class="search-item-text">
                            <h4 class="search-item-title">{item.title}</h4>
                            <div class="search-item-meta">
                              <Show when={item.groupName}>
                                <span class="search-tag-group">{item.groupName}</span>
                              </Show>
                              <Show when={item.categoryName}>
                                <span class="search-crumb-sep">›</span>
                                <span class="search-tag-cat">{item.categoryName}</span>
                              </Show>
                              <Show when={item.chapterName}>
                                <span class="search-crumb-sep">›</span>
                                <span class="search-tag-chap">{item.chapterName}</span>
                              </Show>
                            </div>
                          </div>
                        </div>

                        <div class="search-item-right">
                          <span class={`search-action-pill ${isSelected ? "visible" : ""}`}>
                            Mở bài ↵
                          </span>
                          <svg class="search-arrow-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </A>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>

          {/* BOTTOM COMMAND BAR */}
          <footer class="search-modal-footer">
            <div class="search-footer-left">
              <div class="search-footer-key">
                <kbd class="dash-kbd-pill">↑</kbd>
                <kbd class="dash-kbd-pill">↓</kbd>
                <span>Điều hướng</span>
              </div>
              <div class="search-footer-key">
                <kbd class="dash-kbd-pill">↵ Enter</kbd>
                <span>Mở tài liệu</span>
              </div>
              <div class="search-footer-key">
                <kbd class="dash-kbd-pill">Esc</kbd>
                <span>Đóng</span>
              </div>
            </div>

            <div class="search-footer-right">
              <span class="search-count-pill">{filtered().length} kết quả</span>
            </div>
          </footer>
        </div>
      </div>
    </Show>
  );
}
