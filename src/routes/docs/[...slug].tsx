import { useParams } from "@solidjs/router";
import { Show, Suspense } from "solid-js";
import { query, createAsync, A } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { parseMarkdown } from "~/lib/markdown";
import { db } from "~/lib/turso";
import { articles as articlesSchema } from "~/db/schema";
import { eq, lt, gt, asc, desc } from "drizzle-orm";
import "highlight.js/styles/base16/dracula.min.css";
import { usePageTitle } from "~/app";
import { createEffect, onCleanup } from "solid-js";

const getArticleServer = query(async (slugId: string) => {
  "use server";
  if (!slugId) return null;

  const results = await db.select().from(articlesSchema).where(eq(articlesSchema.slug, slugId));

  if (results.length > 0) {
    const data = results[0];
    const htmlContent = await parseMarkdown(data.contentMd || "");

    const prevResult = await db.select({ title: articlesSchema.title, slug: articlesSchema.slug })
      .from(articlesSchema)
      .where(lt(articlesSchema.order, data.order))
      .orderBy(desc(articlesSchema.order))
      .limit(1);

    const nextResult = await db.select({ title: articlesSchema.title, slug: articlesSchema.slug })
      .from(articlesSchema)
      .where(gt(articlesSchema.order, data.order))
      .orderBy(asc(articlesSchema.order))
      .limit(1);

    return {
      title: data.title,
      content: htmlContent,
      prev: prevResult.length > 0 ? prevResult[0] : null,
      next: nextResult.length > 0 ? nextResult[0] : null
    };
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
    }
  });

  onCleanup(() => {
    setPageTitle("DevPool");
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
