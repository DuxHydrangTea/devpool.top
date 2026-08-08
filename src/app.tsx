import { Router, useIsRouting, useLocation, query, createAsync } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, createSignal, Show, createEffect, untrack } from "solid-js";
import { MetaProvider } from "@solidjs/meta";
import { TitleContext } from "~/contexts/TitleContext";
import Sidebar from "~/components/Sidebar";
import TopNav from "~/components/TopNav";
import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { asc } from "drizzle-orm";
import "./app.css";

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

function GlobalLoader() {
  const isRouting = useIsRouting();
  return (
    <Show when={isRouting()}>
      <div class="routing-overlay">
        <div class="spinner"></div>
      </div>
    </Show>
  );
}

function MainLayout(props: { children: any }) {
  const [isSidebarOpen, setSidebarOpen] = createSignal(false);
  const [pageTitle, setPageTitle] = createSignal("DevPool");
  const data = createAsync(() => getSidebarDataServer());
  
  const [activeGroupId, setActiveGroupId] = createSignal<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = createSignal<number | null>(null);

  const location = useLocation();

  const groups = () => data()?.categories.filter(c => c.type === "group") || [];

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
        const cats = currentData.categories.filter(c => c.type === "category" && c.parentId === groupId);
        if (cats.length > 0 && !cats.find(c => c.id === activeCategoryId())) {
          setActiveCategoryId(cats[0].id);
        }
      });
    }
  });

  return (
    <MetaProvider>
      <TitleContext.Provider value={[pageTitle, setPageTitle]}>
        <GlobalLoader />
        
        <div class="app-container">
          <TopNav 
            groups={groups()} 
            activeGroupId={activeGroupId()} 
            setActiveGroupId={setActiveGroupId}
            pageTitle={pageTitle()}
          />
          
          <div class="main-wrapper">
            <div 
              class={`sidebar-overlay ${isSidebarOpen() ? 'show' : ''}`}
              onClick={() => setSidebarOpen(false)}
            ></div>

            <Sidebar 
              isOpen={isSidebarOpen()} 
              onClose={() => setSidebarOpen(false)}
              data={data()}
              activeGroupId={activeGroupId()}
              setActiveGroupId={setActiveGroupId}
              activeCategoryId={activeCategoryId()}
              setActiveCategoryId={setActiveCategoryId}
            />
            
            <main class="main-content">
              <Suspense>{props.children}</Suspense>
            </main>
          </div>

          <div class="mobile-header">
            <button class="hamburger-btn" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <div class="mobile-brand">{pageTitle()}</div>
            <button 
              onClick={() => {
                if ('caches' in window) {
                  caches.keys().then(names => names.forEach(n => caches.delete(n)));
                }
                window.location.reload();
              }}
              title="Tải lại trang (Xóa cache)"
              style={{ color: "var(--text-muted)", "font-size": "1.1rem", padding: "0.25rem", display: "flex", "align-items": "center", "justify-content": "center" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
        </div>
      </TitleContext.Provider>
    </MetaProvider>
  );
}

export default function App() {
  return (
    <Router
      root={props => (
        <MainLayout>{props.children}</MainLayout>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
