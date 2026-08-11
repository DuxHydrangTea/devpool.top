import { Router, useIsRouting, useLocation, query, action, createAsync } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, createSignal, Show, createEffect, untrack } from "solid-js";
import { MetaProvider } from "@solidjs/meta";
import { TitleContext } from "~/contexts/TitleContext";
import Sidebar from "~/components/Sidebar";
import TopNav from "~/components/TopNav";
import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { asc, eq } from "drizzle-orm";
import { getAuthCookie, verifyToken, requireAuth } from "~/lib/auth";
import { articleCache } from "~/lib/cache";
import "./app.css";

function generateSlug(text: string) {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const updateCategoryNameServer = action(async (data: { id: number; name: string }) => {
  "use server";
  await requireAuth();
  if (!data.name || !data.name.trim()) return;
  const newName = data.name.trim();
  const slug = generateSlug(newName);
  await db.update(categoriesSchema).set({
    name: newName,
    slug: slug
  }).where(eq(categoriesSchema.id, data.id));
}, "update-category-name");

export const updateArticleTitleServer = action(async (data: { id: number; title: string }) => {
  "use server";
  await requireAuth();
  if (!data.title || !data.title.trim()) return;
  const newTitle = data.title.trim();
  const slug = generateSlug(newTitle);

  const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, data.id));
  if (target.length > 0) {
    articleCache.delete(target[0].slug);
  }
  articleCache.delete(slug);

  await db.update(articlesSchema).set({
    title: newTitle,
    slug: slug
  }).where(eq(articlesSchema.id, data.id));
}, "update-article-title");

export const updateArticleContentServer = action(async (data: { id: number; contentMd: string }) => {
  "use server";
  await requireAuth();
  const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, data.id));
  if (target.length > 0) {
    articleCache.delete(target[0].slug);
  }

  await db.update(articlesSchema).set({
    contentMd: data.contentMd
  }).where(eq(articlesSchema.id, data.id));
}, "update-article-content");

const getSidebarDataServer = query(async () => {
  "use server";
  const token = getAuthCookie();
  let isAdmin = false;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) isAdmin = true;
  }

  const categories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
  const articles = await db.select({
    id: articlesSchema.id,
    title: articlesSchema.title,
    chapterId: articlesSchema.chapterId,
    order: articlesSchema.order,
    slug: articlesSchema.slug
  }).from(articlesSchema).orderBy(asc(articlesSchema.order));

  return { categories, articles, isAdmin };
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
  
  const [selectedGroupId, setSelectedGroupId] = createSignal<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = createSignal<number | null>(null);

  const location = useLocation();

  const groups = () => data()?.categories.filter(c => c.type === "group") || [];

  // Compute active IDs synchronously based on current URL and data
  const derivedActiveIds = () => {
    const currentData = data();
    const currentPath = location.pathname;
    let groupId: number | null = null;
    let categoryId: number | null = null;

    if (currentData) {
      const activeArticle = currentData.articles.find(a => currentPath.endsWith(`/${a.slug}`));
      if (activeArticle) {
        let currentParent = currentData.categories.find(c => c.id === activeArticle.chapterId);
        
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
      }
    }
    return { groupId, categoryId };
  };

  // Final active Group ID
  const activeGroupId = () => {
    if (selectedGroupId() !== null) return selectedGroupId()!;
    const derived = derivedActiveIds().groupId;
    if (derived !== null) return derived;
    return groups().length > 0 ? groups()[0].id : null;
  };

  // Final active Category ID
  const activeCategoryId = () => {
    const currentGroupId = activeGroupId();
    if (!currentGroupId) return null;
    const currentData = data();

    // 1. If user selected a category, check if it belongs to the active group
    if (selectedCategoryId() !== null && currentData) {
      const cat = currentData.categories.find(c => c.id === selectedCategoryId());
      if (cat && cat.parentId === currentGroupId) {
        return selectedCategoryId()!;
      }
    }
    
    // 2. Fallback to derived category from URL (if it belongs to active group)
    const derived = derivedActiveIds();
    if (derived.groupId === currentGroupId && derived.categoryId) {
      return derived.categoryId;
    }
    
    // 3. Fallback to the first category in the active group
    if (currentData) {
      const cats = currentData.categories.filter(c => c.type === "category" && c.parentId === currentGroupId);
      if (cats.length > 0) return cats[0].id;
    }
    
    return null;
  };

  const setActiveGroupId = (id: number) => {
    setSelectedGroupId(id);
    setSelectedCategoryId(null); // Reset category selection when group changes
  };

  const setActiveCategoryId = (id: number) => {
    setSelectedCategoryId(id);
  };

  return (
    <MetaProvider>
      <TitleContext.Provider value={[pageTitle, setPageTitle]}>
        <GlobalLoader />
        
        <div class="app-container">
          <Suspense>
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
                {props.children}
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
          </Suspense>
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
