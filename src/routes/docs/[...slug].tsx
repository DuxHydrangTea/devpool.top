import { useParams, query, createAsync, A } from "@solidjs/router";
import { Show, Suspense, createEffect, onCleanup } from "solid-js";
import { Title, Meta } from "@solidjs/meta";
import { parseMarkdown } from "~/lib/markdown";
import { db } from "~/lib/turso";
import { articles as articlesSchema, categories as categoriesSchema } from "~/db/schema";
import { eq, asc } from "drizzle-orm";
import "highlight.js/styles/base16/dracula.min.css";
import { usePageTitle } from "~/contexts/TitleContext";
import { articleCache } from "~/lib/cache";
import { getAuthCookie, verifyToken } from "~/lib/auth";
import "viewerjs/dist/viewer.css";
import gsap from "gsap";

const getArticleServer = query(async (slugId: string) => {
  "use server";
  if (!slugId) return null;

  const token = getAuthCookie();
  let isAdmin = false;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) isAdmin = true;
  }

  const slugParts = slugId.split("/");
  const articleSlug = slugParts[slugParts.length - 1];

  if (articleCache.has(articleSlug)) {
    const cached = articleCache.get(articleSlug);
    if (cached.contentMd !== undefined) {
      return { ...cached, isAdmin };
    }
  }

  const results = await db.select().from(articlesSchema).where(eq(articlesSchema.slug, articleSlug));

  if (results.length > 0) {
    const data = results[0];
    const htmlContent = await parseMarkdown(data.contentMd || "");

    const allCategories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
    const allArticles = await db.select().from(articlesSchema).orderBy(asc(articlesSchema.order));

    const flatArticles: typeof allArticles = [];
    const groups = allCategories.filter((c) => c.type === "group");
    for (const group of groups) {
      const cats = allCategories.filter((c) => c.type === "category" && c.parentId === group.id);
      for (const cat of cats) {
        const chaps = allCategories.filter((c) => c.type === "chapter" && c.parentId === cat.id);
        for (const chap of chaps) {
          const arts = allArticles.filter((a) => a.chapterId === chap.id);
          flatArticles.push(...arts);
        }
      }
    }

    const currentIndex = flatArticles.findIndex((a) => a.slug === articleSlug || a.slug === slugId);
    let prevResult = null;
    let nextResult = null;

    if (currentIndex > 0) {
      prevResult = flatArticles[currentIndex - 1];
    }
    if (currentIndex !== -1 && currentIndex < flatArticles.length - 1) {
      nextResult = flatArticles[currentIndex + 1];
    }

    const getArticlePath = (article: typeof data) => {
      const chapter = allCategories.find((c) => c.id === article.chapterId);
      let cat = null;
      if (chapter && chapter.type === "chapter") {
        cat = allCategories.find((c) => c.id === chapter.parentId);
      } else if (chapter && chapter.type === "category") {
        cat = chapter;
      }
      return cat && cat.slug ? `${cat.slug}/${article.slug}` : article.slug;
    };

    // Find parent chapter and category for breadcrumbs
    const currentChapter = allCategories.find((c) => c.id === data.chapterId);
    const currentCat = currentChapter ? allCategories.find((c) => c.id === currentChapter.parentId) : null;
    const currentGroup = currentCat ? allCategories.find((g) => g.id === currentCat.parentId) : null;

    const words = (data.contentMd || "").trim().split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.ceil(words / 220));

    const result = {
      id: data.id,
      title: data.title,
      slug: data.slug,
      contentMd: data.contentMd || "",
      content: htmlContent,
      words,
      readMinutes,
      groupName: currentGroup?.name || "Tài liệu",
      catName: currentCat?.name || "Chuyên mục",
      chapName: currentChapter?.name || "Chương",
      prev: prevResult ? { title: prevResult.title, slug: getArticlePath(prevResult) } : null,
      next: nextResult ? { title: nextResult.title, slug: getArticlePath(nextResult) } : null,
    };

    articleCache.set(articleSlug, result);
    return { ...result, isAdmin };
  }

  return {
    id: 0,
    title: "Không tìm thấy bài viết",
    slug: "",
    contentMd: "",
    content: "<h1>Bài viết không tồn tại</h1><p>Vui lòng kiểm tra lại đường dẫn hoặc chọn bài viết từ danh mục bên trái.</p>",
    words: 0,
    readMinutes: 0,
    groupName: "Tài liệu",
    catName: "Chuyên mục",
    chapName: "Chương",
    isAdmin,
    prev: null,
    next: null,
  };
}, "doc-article");

export default function DocPage() {
  const params = useParams();
  const article = createAsync(() => getArticleServer(params.slug || ""));
  const [, setPageTitle] = usePageTitle();

  let viewerInstance: any = null;
  let articleContainerRef: HTMLElement | undefined;

  createEffect(() => {
    const data = article();
    if (data?.title) {
      setPageTitle(data.title);

      if (typeof window !== "undefined") {
        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
          mainContent.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }

        // GSAP: Animate rendered Markdown content and article header
        setTimeout(() => {
          if (articleContainerRef) {
            // 1. Breadcrumbs & Header Card
            const header = articleContainerRef.querySelector(".doc-header-card");
            const breadcrumbs = articleContainerRef.querySelector(".doc-breadcrumbs");
            if (breadcrumbs) {
              gsap.fromTo(
                breadcrumbs,
                { opacity: 0, x: -10 },
                { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }
              );
            }
            if (header) {
              gsap.fromTo(
                header,
                { opacity: 0, y: 14 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", delay: 0.05 }
              );
            }

            // 2. Prose Markdown Elements Cascade Stagger
            const prose = articleContainerRef.querySelector(".prose");
            if (prose) {
              const children = prose.children;
              if (children.length > 0) {
                gsap.fromTo(
                  Array.from(children).slice(0, 15), // animate top 15 elements smoothly
                  { opacity: 0, y: 16 },
                  {
                    opacity: 1,
                    y: 0,
                    duration: 0.45,
                    stagger: 0.035,
                    ease: "power2.out",
                    delay: 0.1,
                  }
                );
              }
            }

            // 3. Prev / Next Navigation Cards
            const navCards = articleContainerRef.querySelectorAll(".doc-pag-card");
            if (navCards.length > 0) {
              gsap.fromTo(
                navCards,
                { opacity: 0, y: 18 },
                {
                  opacity: 1,
                  y: 0,
                  duration: 0.4,
                  stagger: 0.08,
                  ease: "back.out(1.2)",
                  delay: 0.2,
                }
              );
            }
          }
        }, 30);
      }

      if (viewerInstance) {
        viewerInstance.destroy();
        viewerInstance = null;
      }

      setTimeout(async () => {
        const Viewer = (await import("viewerjs")).default;
        const proseContainer = document.querySelector(".prose");
        if (proseContainer) {
          const images = proseContainer.querySelectorAll("img");
          if (images.length > 0) {
            viewerInstance = new Viewer(proseContainer as HTMLElement, {
              navbar: false,
              title: false,
              toolbar: {
                zoomIn: 4,
                zoomOut: 4,
                oneToOne: 4,
                reset: 4,
                prev: 0,
                play: 0,
                next: 0,
                rotateLeft: 0,
                rotateRight: 0,
                flipHorizontal: 0,
                flipVertical: 0,
              },
              ready() {
                images.forEach((img) => {
                  (img as HTMLElement).style.cursor = "zoom-in";
                });
              },
            });
          }
        }
      }, 100);
    }
  });

  onCleanup(() => {
    setPageTitle("DevPool");
    if (viewerInstance) {
      viewerInstance.destroy();
    }
  });

  return (
    <div class="doc-page-wrapper">
      <Suspense
        fallback={
          <div class="doc-skeleton-placeholder">
            <div class="doc-skeleton-crumb skeleton-shimmer" />
            <div class="doc-skeleton-header skeleton-shimmer" />
            <div class="doc-skeleton-lines">
              <div class="skeleton-line skeleton-shimmer w-3/4" />
              <div class="skeleton-line skeleton-shimmer w-full" />
              <div class="skeleton-line skeleton-shimmer w-5/6" />
              <div class="skeleton-line skeleton-shimmer w-2/3" />
            </div>
          </div>
        }
      >
        <Show when={article()}>
          <Title>{article()?.title} - DevPool Learning</Title>
          <Meta name="description" content={`Đọc bài viết: ${article()?.title}`} />

          {/* ARTICLE ARTICLE CONTAINER */}
          <article ref={articleContainerRef} class="doc-article-container">
            {/* BREADCRUMB TRAIL */}
            <nav class="doc-breadcrumbs">
              <A href="/" class="crumb-link">
                🏠 Trang chủ
              </A>
              <span class="crumb-sep">/</span>
              <span class="crumb-group">{article()?.groupName}</span>
              <span class="crumb-sep">/</span>
              <span class="crumb-cat">{article()?.catName}</span>
              <span class="crumb-sep">/</span>
              <span class="crumb-chap">{article()?.chapName}</span>
            </nav>

            {/* ARTICLE HEADER BAR */}
            <header class="doc-header-card">
              <h1 class="doc-main-title">{article()?.title}</h1>

              <div class="doc-meta-row">
                <div class="doc-meta-pills">
                  <span class="meta-pill">
                    <svg class="meta-pill-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>~{article()?.readMinutes} phút đọc</span>
                  </span>
                  <span class="meta-pill">
                    <svg class="meta-pill-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{article()?.words} từ</span>
                  </span>
                </div>

                <Show when={article()?.isAdmin}>
                  <A
                    href={`/admin/articles`}
                    class="doc-admin-edit-link"
                    title="Mở trong bảng điều khiển Admin"
                  >
                    ✏️ Chỉnh sửa trong Admin
                  </A>
                </Show>
              </div>
            </header>

            {/* PROSE CONTENT */}
            <div class="doc-prose-body">
              <div class="prose" innerHTML={article()?.content as string} />
            </div>

            {/* PREV / NEXT NAVIGATION CARDS */}
            <nav class="doc-pagination-cards">
              <Show
                when={article()?.prev}
                fallback={<div class="doc-pag-placeholder" />}
              >
                <A href={`/docs/${article()?.prev?.slug}`} class="doc-pag-card pag-prev">
                  <span class="pag-sub">← Bài trước đó</span>
                  <span class="pag-title">{article()?.prev?.title}</span>
                </A>
              </Show>

              <Show
                when={article()?.next}
                fallback={<div class="doc-pag-placeholder" />}
              >
                <A href={`/docs/${article()?.next?.slug}`} class="doc-pag-card pag-next">
                  <span class="pag-sub">Bài kế tiếp →</span>
                  <span class="pag-title">{article()?.next?.title}</span>
                </A>
              </Show>
            </nav>
          </article>
        </Show>
      </Suspense>
    </div>
  );
}
