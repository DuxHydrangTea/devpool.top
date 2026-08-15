import { Router, useIsRouting, useLocation, query, action, createAsync } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, createSignal, Show, createEffect, onCleanup, createMemo, onMount } from "solid-js";
import { MetaProvider } from "@solidjs/meta";
import { TitleContext } from "~/contexts/TitleContext";
import Sidebar from "~/components/Sidebar";
import TopNav from "~/components/TopNav";
import SearchModal, { SearchArticleItem } from "~/components/SearchModal";
import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { asc, eq } from "drizzle-orm";
import { getAuthCookie, verifyToken, requireAuth } from "~/lib/auth";
import { articleCache } from "~/lib/cache";
import "./app.css";

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const updateCategoryNameServer = action(async (data: { id: number; name: string }) => {
  "use server";
  await requireAuth();
  if (!data.name || !data.name.trim()) return;
  const newName = data.name.trim();
  const slug = generateSlug(newName);
  await db
    .update(categoriesSchema)
    .set({
      name: newName,
      slug: slug,
    })
    .where(eq(categoriesSchema.id, data.id));
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

  await db
    .update(articlesSchema)
    .set({
      title: newTitle,
      slug: slug,
    })
    .where(eq(articlesSchema.id, data.id));
}, "update-article-title");

export const updateArticleContentServer = action(async (data: { id: number; contentMd: string }) => {
  "use server";
  await requireAuth();
  const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, data.id));
  if (target.length > 0) {
    articleCache.delete(target[0].slug);
  }

  await db
    .update(articlesSchema)
    .set({
      contentMd: data.contentMd,
    })
    .where(eq(articlesSchema.id, data.id));
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
  const articles = await db
    .select({
      id: articlesSchema.id,
      title: articlesSchema.title,
      chapterId: articlesSchema.chapterId,
      order: articlesSchema.order,
      slug: articlesSchema.slug,
    })
    .from(articlesSchema)
    .orderBy(asc(articlesSchema.order));

  return { categories, articles, isAdmin };
}, "sidebar-data");

import gsap from "gsap";

function GlobalProgressBar() {
  const isRouting = useIsRouting();
  let barRef: HTMLDivElement | undefined;
  let tween: gsap.core.Tween | null = null;

  createEffect(() => {
    const routing = isRouting();
    if (typeof window === "undefined" || !barRef) return;

    if (routing) {
      if (tween) tween.kill();
      gsap.set(barRef, { width: "0%", opacity: 1 });
      tween = gsap.to(barRef, {
        width: "75%",
        duration: 1.8,
        ease: "power1.out",
      });
    } else {
      if (tween) tween.kill();
      gsap.to(barRef, {
        width: "100%",
        duration: 0.2,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(barRef, {
            opacity: 0,
            duration: 0.22,
            onComplete: () => {
              gsap.set(barRef, { width: "0%" });
            },
          });
        },
      });
    }
  });

  return (
    <div class="global-progress-track">
      <div ref={barRef} class="global-progress-bar" />
    </div>
  );
}

function MainLayout(props: { children: any }) {
  const [isSidebarOpen, setSidebarOpen] = createSignal(false);
  const [isSearchOpen, setSearchOpen] = createSignal(false);
  const [pageTitle, setPageTitle] = createSignal("DevPool");
  const data = createAsync(() => getSidebarDataServer());

  const [selectedGroupId, setSelectedGroupId] = createSignal<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = createSignal<number | null>(null);

  const location = useLocation();

  const groups = () => data()?.categories.filter((c) => c.type === "group") || [];

  // Compute active IDs synchronously based on current URL and data
  const derivedActiveIds = () => {
    const currentData = data();
    const currentPath = location.pathname;
    let groupId: number | null = null;
    let categoryId: number | null = null;

    if (currentData) {
      const activeArticle = currentData.articles.find((a) => currentPath.endsWith(`/${a.slug}`));
      if (activeArticle) {
        let currentParent = currentData.categories.find((c) => c.id === activeArticle.chapterId);

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
            currentParent = currentData.categories.find((c) => c.id === currentParent!.parentId);
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

    if (selectedCategoryId() !== null && currentData) {
      const cat = currentData.categories.find((c) => c.id === selectedCategoryId());
      if (cat && cat.parentId === currentGroupId) {
        return selectedCategoryId()!;
      }
    }

    const derived = derivedActiveIds();
    if (derived.groupId === currentGroupId && derived.categoryId) {
      return derived.categoryId;
    }

    if (currentData) {
      const cats = currentData.categories.filter((c) => c.type === "category" && c.parentId === currentGroupId);
      if (cats.length > 0) return cats[0].id;
    }

    return null;
  };

  const setActiveGroupId = (id: number) => {
    setSelectedGroupId(id);
    setSelectedCategoryId(null);
  };

  const setActiveCategoryId = (id: number) => {
    setSelectedCategoryId(id);
  };

  // Build items for Search Modal
  const searchArticles = createMemo<SearchArticleItem[]>(() => {
    const currentData = data();
    if (!currentData) return [];

    const catMap = new Map(currentData.categories.filter((c) => c.type === "category").map((c) => [c.id, c]));
    const grpMap = new Map(currentData.categories.filter((c) => c.type === "group").map((g) => [g.id, g]));
    const chapMap = new Map(currentData.categories.filter((c) => c.type === "chapter").map((ch) => [ch.id, ch]));

    return currentData.articles.map((art) => {
      const chap = chapMap.get(art.chapterId);
      const cat = chap?.parentId ? catMap.get(chap.parentId) : undefined;
      const grp = cat?.parentId ? grpMap.get(cat.parentId) : undefined;

      return {
        id: art.id,
        title: art.title,
        slug: art.slug,
        chapterName: chap?.name,
        categoryName: cat?.name,
        groupName: grp?.name,
        categorySlug: cat?.slug,
      };
    });
  });

  // Global Ctrl+K Shortcut
  onMount(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  const isAdminOrAuth = () => location.pathname.startsWith("/admin") || location.pathname.startsWith("/login");

  return (
    <MetaProvider>
      <TitleContext.Provider value={[pageTitle, setPageTitle]}>
        <GlobalProgressBar />

        <Show
          when={!isAdminOrAuth()}
          fallback={
            <Suspense fallback={null}>
              {props.children}
            </Suspense>
          }
        >
          <div class="app-container">
            <Suspense>
              {/* TOP NAVIGATION */}
              <TopNav
                groups={groups()}
                activeGroupId={activeGroupId()}
                setActiveGroupId={setActiveGroupId}
                pageTitle={pageTitle()}
                isAdmin={data()?.isAdmin}
                onOpenSearch={() => setSearchOpen(true)}
                onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
              />

              {/* MAIN BODY: SIDEBAR + CONTENT */}
              <div class="main-wrapper">
                <div
                  class={`sidebar-overlay ${isSidebarOpen() ? "show" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                />

                <Sidebar
                  isOpen={isSidebarOpen()}
                  onClose={() => setSidebarOpen(false)}
                  data={data()}
                  activeGroupId={activeGroupId()}
                  setActiveGroupId={setActiveGroupId}
                  activeCategoryId={activeCategoryId()}
                  setActiveCategoryId={setActiveCategoryId}
                />

                <main class="main-content">{props.children}</main>
              </div>

              {/* SEARCH PALETTE MODAL */}
              <SearchModal
                isOpen={isSearchOpen()}
                onClose={() => setSearchOpen(false)}
                articles={searchArticles()}
              />
            </Suspense>
          </div>
        </Show>
      </TitleContext.Provider>
    </MetaProvider>
  );
}

export default function App() {
  return (
    <Router root={(props) => <MainLayout>{props.children}</MainLayout>}>
      <FileRoutes />
    </Router>
  );
}
