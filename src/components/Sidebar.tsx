import { createSignal, For, Show, createEffect, untrack } from "solid-js";
import { A, useLocation, query, createAsync } from "@solidjs/router";
import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { asc } from "drizzle-orm";

interface Category { id: number; name: string; type: string; parentId: number | null; order: number; }
interface Article { id: number; title: string; chapterId: number; order: number; slug: string; }

const getSidebarDataServer = query(async () => {
  "use server";
  const categories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
  const articles = await db.select({
    id: articlesSchema.id,
    title: articlesSchema.title,
    chapterId: articlesSchema.chapterId,
    order: articlesSchema.order,
    slug: articlesSchema.slug
  }).from(articlesSchema).orderBy(asc(articlesSchema.order));

  return { categories, articles };
}, "sidebar-data");

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

export default function Sidebar(props: { isOpen?: boolean; onClose?: () => void }) {
  const data = createAsync(() => getSidebarDataServer());
  const [activeGroupId, setActiveGroupId] = createSignal<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = createSignal<number | null>(null);

  const location = useLocation();

  const groups = () => data()?.categories.filter(c => c.type === "group") || [];
  const getCategories = (groupId: number) => data()?.categories.filter(c => c.type === "category" && c.parentId === groupId) || [];
  const getChapters = (catId: number) => data()?.categories.filter(c => c.type === "chapter" && c.parentId === catId) || [];
  const getArticles = (chapId: number) => data()?.articles.filter(a => a.chapterId === chapId) || [];

  // Effect 1: Sync active tabs with the current URL route
  createEffect(() => {
    const currentPath = location.pathname;
    const currentData = data();
    if (currentData) {
      untrack(() => {
        const activeArticle = currentData.articles.find(a => `/docs/${a.slug}` === currentPath);
        if (activeArticle) {
          let currentParent = currentData.categories.find(c => c.id === activeArticle.chapterId);
          let categoryId = null;
          let groupId = null;
          
          while (currentParent) {
            if (currentParent.type === "category") {
              categoryId = currentParent.id;
              groupId = currentParent.parentId;
              break;
            } else if (currentParent.type === "group") {
              groupId = currentParent.id;
              break;
            }
            // Traverse up
            if (currentParent.parentId) {
              currentParent = currentData.categories.find(c => c.id === currentParent!.parentId);
            } else {
              break;
            }
          }

          if (groupId && categoryId) {
            setActiveGroupId(groupId);
            setActiveCategoryId(categoryId);
          }
        } else {
          if (!activeGroupId() && groups().length > 0) {
            setActiveGroupId(groups()[0].id);
          }
        }
      });
    }
  });

  // Effect 2: Auto-select the first Category when Group Tab changes
  createEffect(() => {
    const groupId = activeGroupId();
    const currentData = data();
    if (groupId && currentData) {
      untrack(() => {
        const cats = getCategories(groupId);
        if (cats.length > 0 && !cats.find(c => c.id === activeCategoryId())) {
          setActiveCategoryId(cats[0].id);
        }
      });
    }
  });

  return (
    <nav class={`sidebar ${props.isOpen ? 'open' : ''}`}>
      <div class="sidebar-header" style={{ display: "flex", "justify-content": "space-between", "align-items": "center" }}>
        <A href="/" class="sidebar-brand">
          DEVPOOL.TOP
        </A>
        <button 
          onClick={() => {
            if ('caches' in window) {
              caches.keys().then(names => names.forEach(name => caches.delete(name)));
            }
            window.location.reload();
          }}
          title="Tải lại trang (Xóa cache)"
          style={{ color: "var(--text-muted)", "font-size": "1rem", padding: "0.25rem", transition: "color 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-primary)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>

      <Show when={!data()}>
        <div class="p-6 text-emerald-400 text-sm animate-pulse text-center">Loading data...</div>
      </Show>

      <Show when={data()}>
        <div style={{ position: "sticky", top: "77px", "z-index": 40 }}>
          {/* TABS (Groups) */}
          <div class="sidebar-tabs" style={{ position: "static", border: "none" }}>
            <For each={groups()}>
              {(group) => (
                <button
                  class={`sidebar-tab ${activeGroupId() === group.id ? "active" : ""}`}
                  onClick={() => setActiveGroupId(group.id)}
                >
                  {group.name}
                </button>
              )}
            </For>
          </div>

          {/* SUB-TABS (Categories) */}
          <Show when={activeGroupId()}>
            {(groupId) => (
              <div class="sidebar-tabs sub-tabs" style={{ position: "static", "background-color": "rgba(15, 23, 42, 0.98)", "padding-top": "0.25rem" }}>
                <div style={{ width: "100%", "font-size": "0.6rem", "text-transform": "uppercase", "letter-spacing": "0.05em", color: "var(--text-muted)", "margin-bottom": "0.25rem", "padding-left": "0.25rem", display: "flex", "align-items": "center", gap: "0.25rem" }}>
                  <i class="fas fa-level-down-alt"></i>
                  <span>Chuyên mục</span>
                </div>
                <For each={getCategories(groupId())}>
                  {(category) => (
                    <button
                      class={`sidebar-tab sub-tab ${activeCategoryId() === category.id ? "active" : ""}`}
                      onClick={() => setActiveCategoryId(category.id)}
                      style={{ "font-size": "0.7rem", padding: "0.25rem" }}
                    >
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
          <Show when={activeCategoryId()}>
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
