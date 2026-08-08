import { For, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";

export interface Category { id: number; name: string; type: string; parentId: number | null; order: number; }
export interface Article { id: number; title: string; chapterId: number; order: number; slug: string; }
export interface SidebarData { categories: Category[]; articles: Article[]; }

const ChapterNode = (props: { chapter: Category, getChapters: (id: number) => Category[], getArticles: (id: number) => Article[], location: any, onClose?: () => void }) => {
  return (
    <div style={{"margin-bottom": "0.5rem"}}>
      <div class="chapter-title flex justify-between items-center" style={{ "user-select": "none", "margin-bottom": "0.25rem" }}>
        <div class="flex items-center gap-2">
          <i class={`fas fa-folder-open chapter-icon`}></i>
          {props.chapter.name}
        </div>
      </div>
      <ul class="article-list-container" style={{ "margin-left": "0.5rem", "border-left": "1px solid var(--border-color)", "padding-left": "0.5rem" }}>
        <For each={props.getChapters(props.chapter.id)}>
          {(sub) => <ChapterNode chapter={sub} getChapters={props.getChapters} getArticles={props.getArticles} location={props.location} onClose={props.onClose} />}
        </For>
        <For each={props.getArticles(props.chapter.id)}>
          {(article) => {
            const path = `/docs/${article.slug}`;
            const isActive = props.location.pathname === path;
            return (
              <li>
                <A
                  href={path}
                  class={`article-link ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (props.onClose) props.onClose();
                  }}
                >
                  {article.title}
                </A>
              </li>
            );
          }}
        </For>
      </ul>
    </div>
  );
};

export default function Sidebar(props: { 
  isOpen?: boolean; 
  onClose?: () => void;
  data: SidebarData | undefined;
  activeGroupId: number | null;
  setActiveGroupId: (id: number) => void;
  activeCategoryId: number | null;
  setActiveCategoryId: (id: number) => void;
}) {
  const location = useLocation();

  const getCategories = (groupId: number) => props.data?.categories.filter(c => c.type === "category" && c.parentId === groupId) || [];
  const getChapters = (catId: number) => props.data?.categories.filter(c => c.type === "chapter" && c.parentId === catId) || [];
  const getArticles = (chapId: number) => props.data?.articles.filter(a => a.chapterId === chapId) || [];

  return (
    <nav class={`sidebar ${props.isOpen ? 'open' : ''}`}>
      <Show when={!props.data}>
        <div class="p-6 text-emerald-400 text-sm animate-pulse text-center">Loading data...</div>
      </Show>

      <Show when={props.data}>
        <div style={{ position: "sticky", top: "0", "z-index": 40, "background-color": "var(--bg-primary)" }}>
          {/* GROUP TABS - chỉ hiện trên mobile (ẩn bởi CSS trên desktop) */}
          <Show when={props.data?.categories.filter(c => c.type === "group").length}>
            <div class="sidebar-group-tabs mobile-group-selector">
              <For each={props.data!.categories.filter(c => c.type === "group")}>
                {(group) => (
                  <button
                    class={`sidebar-tab ${props.activeGroupId === group.id ? "active" : ""}`}
                    onClick={() => props.setActiveGroupId(group.id)}
                    style={{ "font-size": "0.75rem" }}
                  >
                    {group.name}
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* SUB-TABS (Categories) */}
          <Show when={props.activeGroupId}>
            {(groupId) => (
              <div class="sidebar-tabs sub-tabs" style={{ position: "static", "background-color": "rgba(15, 23, 42, 0.98)", "padding-top": "0.5rem", "border-bottom": "1px solid var(--border-color)" }}>
                <div style={{ width: "100%", "font-size": "0.6rem", "text-transform": "uppercase", "letter-spacing": "0.05em", color: "var(--text-muted)", "margin-bottom": "0.25rem", "padding-left": "0.25rem", display: "flex", "align-items": "center", gap: "0.25rem" }}>
                  <i class="fas fa-level-down-alt"></i>
                  <span>Chuyên mục</span>
                </div>
                <For each={getCategories(groupId())}>
                  {(category, index) => (
                    <button
                      class={`sidebar-tab sub-tab ${props.activeCategoryId === category.id ? "active" : ""}`}
                      onClick={() => props.setActiveCategoryId(category.id)}
                      style={{ "font-size": "0.7rem", padding: "0.25rem" }}
                    >
                      <span style={{ "font-family": "var(--font-mono)", opacity: 0.5, "font-size": "0.8em", "margin-right": "0.2em" }}>{index() + 1}.</span>
                      {category.name}
                    </button>
                  )}
                </For>
              </div>
            )}
          </Show>
        </div>

        {/* CÂY THƯ MỤC */}
        <div class="sidebar-tree pt-2">
          <Show when={props.activeCategoryId}>
            {(categoryId) => (
              <div class="category-group" style={{ "padding-top": "0" }}>
                <div class="chapter-group">
                  {/* Render các bài viết trực tiếp thuộc Category (không nằm trong Chapter nào) */}
                  <ul class="article-list-container">
                    <For each={getArticles(categoryId())}>
                      {(article) => {
                        const path = `/docs/${article.slug}`;
                        const isActive = location.pathname === path;
                        return (
                          <li>
                            <A
                              href={path}
                              class={`article-link ${isActive ? "active" : ""}`}
                              onClick={() => {
                                if (props.onClose) props.onClose();
                              }}
                            >
                              <i class="far fa-file-alt" style={{ "margin-right": "0.5rem", "font-size": "0.8em", opacity: 0.7 }}></i>
                              {article.title}
                            </A>
                          </li>
                        );
                      }}
                    </For>
                  </ul>

                  {/* Render các thư mục con đệ quy */}
                  <For each={getChapters(categoryId())}>
                    {(chapter) => <ChapterNode chapter={chapter} getChapters={getChapters} getArticles={getArticles} location={location} onClose={props.onClose} />}
                  </For>
                </div>
              </div>
            )}
          </Show>
        </div>
      </Show>

      {/* FOOTER ĐÓNG SIDEBAR TRÊN MOBILE */}
      <div class="sidebar-footer mobile-only" style={{ "margin-top": "auto", "border-top": "1px solid var(--border-color)", padding: "1rem", "background-color": "var(--bg-primary)", position: "sticky", bottom: "0", "z-index": 40 }}>
        <button 
          onClick={() => {
            if (props.onClose) props.onClose();
          }}
          style={{ width: "100%", padding: "0.75rem", "background-color": "var(--bg-secondary)", color: "var(--text-primary)", "border-radius": "0.375rem", display: "flex", "align-items": "center", "justify-content": "center", gap: "0.5rem", "font-weight": "600", "font-size": "0.875rem" }}
        >
          <i class="fas fa-times"></i> Đóng Menu
        </button>
      </div>
    </nav>
  );
}
