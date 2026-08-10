import { useParams } from "@solidjs/router";
import { Show, Suspense } from "solid-js";
import { query, createAsync, A } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { parseMarkdown } from "~/lib/markdown";
import { db } from "~/lib/turso";
import { articles as articlesSchema, categories as categoriesSchema } from "~/db/schema";
import { eq, lt, gt, asc, desc } from "drizzle-orm";
import "highlight.js/styles/base16/dracula.min.css";
import { usePageTitle } from "~/contexts/TitleContext";
import { createEffect, onCleanup } from "solid-js";
import { articleCache } from "~/lib/cache";
import "viewerjs/dist/viewer.css";

const getArticleServer = query(async (slugId: string) => {
  "use server";
  if (!slugId) return null;
  
  // fullSlug có thể chứa category-slug/article-slug
  const slugParts = slugId.split('/');
  const articleSlug = slugParts[slugParts.length - 1];
  
  // Trả về luôn dữ liệu trong RAM nếu đã được cache
  if (articleCache.has(articleSlug)) {
    return articleCache.get(articleSlug);
  }

  const results = await db.select().from(articlesSchema).where(eq(articlesSchema.slug, articleSlug));

  if (results.length > 0) {
    const data = results[0];
    const htmlContent = await parseMarkdown(data.contentMd || "");

    const allCategories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
    const allArticles = await db.select().from(articlesSchema).orderBy(asc(articlesSchema.order));

    const flatArticles: typeof allArticles = [];
    const groups = allCategories.filter(c => c.type === "group");
    for (const group of groups) {
      const cats = allCategories.filter(c => c.type === "category" && c.parentId === group.id);
      for (const cat of cats) {
        const chaps = allCategories.filter(c => c.type === "chapter" && c.parentId === cat.id);
        for (const chap of chaps) {
          const arts = allArticles.filter(a => a.chapterId === chap.id);
          flatArticles.push(...arts);
        }
      }
    }

    const currentIndex = flatArticles.findIndex(a => a.slug === slugId);
    let prevResult = null;
    let nextResult = null;

    if (currentIndex > 0) {
      prevResult = flatArticles[currentIndex - 1];
    }
    if (currentIndex !== -1 && currentIndex < flatArticles.length - 1) {
      nextResult = flatArticles[currentIndex + 1];
    }

    const getArticlePath = (article: typeof data) => {
      const chapter = allCategories.find(c => c.id === article.chapterId);
      let cat = null;
      if (chapter && chapter.type === "chapter") {
         cat = allCategories.find(c => c.id === chapter.parentId);
      } else if (chapter && chapter.type === "category") {
         cat = chapter;
      }
      return cat && cat.slug ? `${cat.slug}/${article.slug}` : article.slug;
    };

    const result = {
      title: data.title,
      content: htmlContent,
      prev: prevResult ? { title: prevResult.title, slug: getArticlePath(prevResult) } : null,
      next: nextResult ? { title: nextResult.title, slug: getArticlePath(nextResult) } : null
    };
    
    // Lưu vào bộ nhớ đệm (Cache) trên Server bằng articleSlug để đảm bảo ID duy nhất
    articleCache.set(articleSlug, result);
    return result;
  }

  return {
    title: "Không tìm thấy",
    content: "<h1>Bài viết không tồn tại</h1><p>Vui lòng kiểm tra lại đường dẫn.</p>"
  };
}, "doc-article");

export default function DocPage() {
  const params = useParams();
  const article = createAsync(() => getArticleServer(params.slug || ""));
  const [, setPageTitle] = usePageTitle();
  let viewerInstance: any = null;

  createEffect(() => {
    const data = article();
    if (data?.title) {
      setPageTitle(data.title);
      
      // Tự động cuộn lên đầu trang
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      
      // Cleanup previous viewer instance
      if (viewerInstance) {
        viewerInstance.destroy();
        viewerInstance = null;
      }
      
      // Initialize image zoom viewer after DOM update
      setTimeout(async () => {
        const Viewer = (await import('viewerjs')).default;
        const proseContainer = document.querySelector('.prose');
        if (proseContainer) {
          const images = proseContainer.querySelectorAll('img');
          if (images.length > 0) {
            viewerInstance = new Viewer(proseContainer as HTMLElement, {
              navbar: false, // Hide thumbnail navbar for cleaner UI
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
              // Thêm con trỏ chuột Kính lúp vào ảnh
              ready() {
                images.forEach(img => {
                  (img as HTMLElement).style.cursor = 'zoom-in';
                });
              }
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
    <div class="doc-page">
      <Suspense fallback={
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Đang tải tài liệu...</p>
        </div>
      }>
        <Show when={article()}>
          <Title>{article()?.title} - Raylib Odin (SQL)</Title>
          <Meta name="description" content={`Đọc bài viết: ${article()?.title}`} />

          <div
            class="prose"
            innerHTML={article()?.content as string}
          />

          <div style={{ display: "flex", "justify-content": "space-between", gap: "1rem", "margin-top": "3rem", "padding-top": "2rem", "border-top": "1px solid var(--border-color)", "flex-wrap": "wrap" }}>
            <Show when={article()?.prev} fallback={<div />}>
              <A href={`/docs/${article()?.prev?.slug}`} class="btn btn-back" style={{ display: "flex", "flex-direction": "column", "align-items": "flex-start", gap: "0.25rem", padding: "0.75rem 1.25rem", flex: "1", "min-width": "120px" }}>
                <span style={{ "font-size": "0.7rem", color: "var(--text-muted)", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>Bài trước</span>
                <span style={{ "font-weight": 600 }}>« {article()?.prev?.title}</span>
              </A>
            </Show>
            <Show when={article()?.next} fallback={<div />}>
              <A href={`/docs/${article()?.next?.slug}`} class="btn btn-primary" style={{ display: "flex", "flex-direction": "column", "align-items": "flex-end", gap: "0.25rem", padding: "0.75rem 1.25rem", flex: "1", "min-width": "120px" }}>
                <span style={{ "font-size": "0.7rem", color: "rgba(255,255,255,0.8)", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>Bài tiếp theo</span>
                <span style={{ "font-weight": 600 }}>{article()?.next?.title} »</span>
              </A>
            </Show>
          </div>
        </Show>
      </Suspense>
    </div>
  );
}
