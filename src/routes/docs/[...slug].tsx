import { useParams } from "@solidjs/router";
import { Show, Suspense } from "solid-js";
import { query, createAsync } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { parseMarkdown } from "~/lib/markdown";
import { db } from "~/lib/turso";
import { articles as articlesSchema } from "~/db/schema";
import { eq } from "drizzle-orm";
import "highlight.js/styles/base16/dracula.min.css";

const getArticleServer = query(async (slugId: string) => {
  "use server";
  if (!slugId) return null;

  const results = await db.select().from(articlesSchema).where(eq(articlesSchema.slug, slugId));

  if (results.length > 0) {
    const data = results[0];
    const htmlContent = await parseMarkdown(data.contentMd || "");
    return {
      title: data.title,
      content: htmlContent
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
        </Show>
      </Suspense>
    </div>
  );
}
