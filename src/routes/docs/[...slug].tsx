import { useParams, query, createAsync, A } from "@solidjs/router";
import { Show, Suspense, createEffect, onCleanup } from "solid-js";
import { Title, Meta } from "@solidjs/meta";
import { usePageTitle } from "~/contexts/TitleContext";
import { docService } from "~/server/services/doc.service";
import { authService } from "~/server/services/auth.service";
import "highlight.js/styles/base16/dracula.min.css";
import "viewerjs/dist/viewer.css";
import gsap from "gsap";

const getArticleServer = query(async (slugId: string) => {
  "use server";
  if (!slugId) return null;
  const isAdmin = await authService.isAuthenticated();
  return await docService.getDocBySlug(slugId, isAdmin);
}, "doc-detail");

export default function DocPage() {
  const params = useParams();
  const article = createAsync(() => getArticleServer(params.slug || ""));
  const [, setPageTitle] = usePageTitle();

  let viewerInstance: any = null;
  let articleContainerRef: HTMLElement | undefined;
  let animationTimer: any = null;
  let viewerTimer: any = null;
  let mermaidTimer: any = null;

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
        clearTimeout(animationTimer);
        animationTimer = setTimeout(() => {
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
                  Array.from(children).slice(0, 15),
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

      clearTimeout(viewerTimer);
      viewerTimer = setTimeout(async () => {
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

      // MERMAID DIAGRAMS RENDERING
      clearTimeout(mermaidTimer);
      mermaidTimer = setTimeout(async () => {
        const proseContainer = document.querySelector(".prose");
        if (proseContainer) {
          const mermaidElements = proseContainer.querySelectorAll(".mermaid");
          if (mermaidElements.length > 0) {
            try {
              const mermaid = (await import("mermaid")).default;
              mermaid.initialize({
                startOnLoad: false,
                theme: "dark",
                securityLevel: "loose",
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                flowchart: {
                  useMaxWidth: false,
                  htmlLabels: true,
                  curve: "basis",
                },
                themeVariables: {
                  darkMode: true,
                  background: "#0b1324",
                  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                },
              });
              await mermaid.run({
                nodes: Array.from(mermaidElements) as HTMLElement[],
              });
            } catch (err) {
              console.warn("Lỗi khi render sơ đồ Mermaid:", err);
            }
          }
        }
      }, 50);
    }
  });

  onCleanup(() => {
    setPageTitle("DevPool");
    clearTimeout(animationTimer);
    clearTimeout(viewerTimer);
    clearTimeout(mermaidTimer);
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

          {/* ARTICLE CONTAINER */}
          <article ref={articleContainerRef} class="doc-article-container">
            {/* BREADCRUMB TRAIL */}
            <nav class="doc-breadcrumbs">
              <A href="/" class="crumb-link">
                🏠 Trang chủ
              </A>
              <span class="crumb-sep">/</span>
              <span class="crumb-group">{article()?.groupName}</span>
              <span class="crumb-sep">/</span>
              <span class="crumb-cat">{article()?.catName || article()?.categoryName}</span>
              <span class="crumb-sep">/</span>
              <span class="crumb-chap">{article()?.chapName || article()?.chapterName}</span>
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
                when={article()?.prev || article()?.prevArticle}
                fallback={<div class="doc-pag-placeholder" />}
              >
                {(() => {
                  const prevItem = article()?.prev || article()?.prevArticle;
                  return (
                    <A href={`/docs/${prevItem?.slug}`} class="doc-pag-card pag-prev">
                      <span class="pag-sub">← Bài trước đó</span>
                      <span class="pag-title">{prevItem?.title}</span>
                    </A>
                  );
                })()}
              </Show>

              <Show
                when={article()?.next || article()?.nextArticle}
                fallback={<div class="doc-pag-placeholder" />}
              >
                {(() => {
                  const nextItem = article()?.next || article()?.nextArticle;
                  return (
                    <A href={`/docs/${nextItem?.slug}`} class="doc-pag-card pag-next">
                      <span class="pag-sub">Bài kế tiếp →</span>
                      <span class="pag-title">{nextItem?.title}</span>
                    </A>
                  );
                })()}
              </Show>
            </nav>
          </article>
        </Show>
      </Suspense>
    </div>
  );
}
