import { createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, action, query, useAction, createAsync, revalidate, useSearchParams } from "@solidjs/router";
import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { parseMarkdown } from "~/lib/markdown";
import { requireAuth } from "~/lib/auth";
import { articleCache } from "~/lib/cache";
import { onMount, onCleanup } from "solid-js";
import type EasyMDE from "easymde";
import "easymde/dist/easymde.min.css";
import "highlight.js/styles/base16/dracula.min.css";

interface Category {
  id: number;
  name: string;
  type: string;
  parentId: number | null;
  slug: string;
}

interface Article {
  id: number;
  title: string;
  chapterId: number;
  order: number;
}

// =======================
// SERVER FUNCTIONS
// =======================
const getCategoriesServer = query(async () => {
  "use server";
  const categories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
  return categories.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    parentId: c.parentId,
    slug: c.slug
  }));
}, "categories-list-arts");

const getArticlesServer = query(async (filterChapterId?: number) => {
  "use server";
  await requireAuth();
  
  let q = db.select({
    id: articlesSchema.id,
    title: articlesSchema.title,
    chapterId: articlesSchema.chapterId,
    order: articlesSchema.order,
    slug: articlesSchema.slug,
    contentMd: articlesSchema.contentMd
  }).from(articlesSchema);
  
  if (filterChapterId) {
    q = q.where(eq(articlesSchema.chapterId, filterChapterId));
  }
  
  const articles = await q.orderBy(asc(articlesSchema.order));
  
  return { articles, total: articles.length };
}, "articles-list");

function generateSlug(text: string) {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const addArticleServer = action(async (data: { title: string, content_md: string, chapterId: number, order: number }) => {
  "use server";
  await requireAuth();
  await db.insert(articlesSchema).values({
    title: data.title,
    contentMd: data.content_md,
    chapterId: data.chapterId,
    order: data.order,
    slug: generateSlug(data.title)
  });
});

const deleteArticleServer = action(async (id: number) => {
  "use server";
  await requireAuth();
  const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, id));
  if (target.length > 0) articleCache.delete(target[0].slug);
  await db.delete(articlesSchema).where(eq(articlesSchema.id, id));
});

const updateArticleServer = action(async (data: { id: number, title: string, content_md: string, chapterId: number, order: number }) => {
  "use server";
  await requireAuth();
  
  const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, data.id));
  if (target.length > 0) articleCache.delete(target[0].slug);

  await db.update(articlesSchema).set({
    title: data.title,
    contentMd: data.content_md,
    chapterId: data.chapterId,
    order: data.order,
    slug: generateSlug(data.title)
  }).where(eq(articlesSchema.id, data.id));
});

const clearAllCacheServer = action(async () => {
  "use server";
  await requireAuth();
  const count = articleCache.size;
  articleCache.clear();
  return count;
});

const generateExaContentServer = action(async (prompt: string) => {
  "use server";
  await requireAuth();
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("EXA_API_KEY is not set in .env");

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: prompt,
      type: "auto",
      systemPrompt: "You are an expert technical writer. Write a comprehensive, well-structured educational article in Markdown format (in Vietnamese) about the requested topic based on the search results. Include code examples if relevant.",
      outputSchema: {
        type: "object",
        properties: {
          article: {
            type: "string",
            description: "The full article formatted in Markdown"
          }
        },
        required: ["article"]
      },
      contents: {
        highlights: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Exa API error: ${errorText}`);
  }

  const data = await response.json();
  if (!data.output?.content?.article) {
    throw new Error("EXA API did not return article content.");
  }
  return data.output.content.article;
});

// =======================
// COMPONENT
// =======================
export default function AdminArticles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterChapterId = () => searchParams.chapterId ? parseInt(searchParams.chapterId, 10) : undefined;

  const categories = createAsync(() => getCategoriesServer());
  const articlesData = createAsync(() => getArticlesServer(filterChapterId()));

  const addArticle = useAction(addArticleServer);
  const deleteArticle = useAction(deleteArticleServer);
  const clearAllCache = useAction(clearAllCacheServer);
  const generateExaContent = useAction(generateExaContentServer);

  // Form state
  const [title, setTitle] = createSignal("");
  const [contentMd, setContentMd] = createSignal("");
  const [chapterId, setChapterId] = createSignal<number | null>(null);
  const [order, setOrder] = createSignal(0);
  const [exaPrompt, setExaPrompt] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isGenerating, setIsGenerating] = createSignal(false);

  let textareaRef: HTMLTextAreaElement | undefined;
  let easymde: EasyMDE | undefined;

  onMount(async () => {
    if (textareaRef) {
      const EasyMDEClass = (await import("easymde")).default;
      easymde = new EasyMDEClass({
        element: textareaRef,
        initialValue: contentMd(),
        spellChecker: false,
        maxHeight: "450px",
        previewRender: (plainText) => {
          return `<div class="prose" style="padding: 1rem;">${parseMarkdown(plainText)}</div>`;
        }
      });
      easymde.codemirror.on("change", () => {
        setContentMd(easymde!.value());
      });
    }
  });

  onCleanup(() => {
    if (easymde) {
      easymde.toTextArea();
      easymde = undefined;
    }
  });

  const updateArticle = useAction(updateArticleServer);
  const [editingId, setEditingId] = createSignal<number | null>(null);

  const handleEdit = (article: any) => {
    setEditingId(article.id);
    setTitle(article.title);
    const md = article.contentMd || "";
    setContentMd(md);
    if (easymde) easymde.value(md);
    setChapterId(article.chapterId);
    setOrder(article.order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setContentMd("");
    if (easymde) easymde.value("");
    setOrder(0);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!title().trim() || !chapterId()) return alert("Vui lòng điền đủ thông tin");

    setIsSubmitting(true);

    try {
      if (editingId()) {
        await updateArticle({
          id: editingId()!,
          title: title().trim(),
          content_md: contentMd(),
          chapterId: chapterId()!,
          order: Number(order())
        });
        alert("Cập nhật bài viết thành công!");
      } else {
        await addArticle({
          title: title().trim(),
          content_md: contentMd(),
          chapterId: chapterId()!,
          order: Number(order())
        });
        alert("Đã lưu bài viết (SQL) thành công!");
      }
      
      cancelEdit();
      revalidate("articles-list");
    } catch (error) {
      console.error(error);
      alert(editingId() ? "Lỗi khi cập nhật bài viết" : "Lỗi khi thêm bài viết");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await deleteArticle(Number(id));
      revalidate("articles-list");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa");
    }
  };

  const chapters = () => categories()?.filter(c => c.type === "chapter") || [];

  return (
    <div class="admin-container admin-container-lg">
      <Title>Admin - Quản lý Bài viết (Turso)</Title>

      <div class="admin-header">
        <h1 class="admin-title">Quản lý Bài Viết (SQL)</h1>
        <div class="flex gap-2">
          <button 
            type="button" 
            class="btn btn-secondary"
            onClick={async () => {
              const count = await clearAllCache();
              alert(`Đã xóa thành công ${count} bài viết trong RAM Cache!`);
            }}
          >
            🧹 Xóa RAM Cache
          </button>
          <A href="/admin" class="btn btn-back">
            &larr; Quay lại Danh mục
          </A>
        </div>
      </div>

      <div class="admin-grid admin-grid-lg">

        {/* FORM THÊM MỚI */}
        <div class="card" style={{ "align-self": "start", position: editingId() ? "sticky" : "static", top: "20px" }}>
          <h2 class="card-title mb-4">{editingId() ? "Sửa Bài Viết" : "Thêm Bài Viết Mới"}</h2>
          <form onSubmit={handleSubmit} class="flex-col gap-4">

            <div class="form-group">
              <label class="form-label">Chọn Chương chứa bài</label>
              <select
                class="form-input"
                value={chapterId() || ""}
                onChange={(e) => setChapterId(Number(e.target.value))}
                required
              >
                <option value="" disabled>-- Chọn Chương --</option>
                <For each={categories()?.filter(c => c.type === "category") || []}>
                  {(cat) => {
                    const parentGroup = categories()?.find(g => g.id === cat.parentId);
                    const catChapters = chapters().filter(ch => ch.parentId === cat.id);
                    if (catChapters.length === 0) return null;
                    return (
                      <optgroup label={`${parentGroup?.name || 'Mục'} ➔ ${cat.name}`}>
                        <For each={catChapters}>
                          {(chap) => <option value={chap.id}>{chap.name}</option>}
                        </For>
                      </optgroup>
                    );
                  }}
                </For>
              </select>
            </div>

            <div class="form-row">
              <div class="flex-1">
                <label class="form-label">Tiêu đề bài viết</label>
                <input
                  type="text"
                  class="form-input"
                  value={title()}
                  onInput={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div class="form-col-small">
                <label class="form-label">Thứ tự</label>
                <input
                  type="number"
                  class="form-input"
                  value={order()}
                  onInput={(e) => setOrder(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div class="form-group p-4 rounded" style={{ border: "1px solid var(--border-color, #444)", "background-color": "rgba(0,0,0,0.1)" }}>
              <label class="form-label mb-2 flex items-center justify-between">
                <span>🪄 Tạo nội dung tự động bằng EXA AI</span>
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="form-input flex-1"
                  placeholder="Nhập prompt hoặc chủ đề bài viết (vd: Hướng dẫn cơ bản về SolidJS...)"
                  value={exaPrompt()}
                  onInput={(e) => setExaPrompt(e.target.value)}
                />
                <button
                  type="button"
                  class="btn btn-secondary whitespace-nowrap"
                  disabled={isGenerating() || !exaPrompt().trim()}
                  onClick={async () => {
                    if (!exaPrompt().trim()) return;
                    setIsGenerating(true);
                    try {
                      const generated = await generateExaContent(exaPrompt().trim());
                      if (generated) {
                        setContentMd(generated);
                        if (easymde) easymde.value(generated);
                        alert("Đã tạo nội dung thành công!");
                      }
                    } catch (err: any) {
                      console.error(err);
                      alert(err.message || "Lỗi khi gọi EXA API");
                    }
                    setIsGenerating(false);
                  }}
                >
                  {isGenerating() ? "Đang tạo..." : "Tạo bằng EXA"}
                </button>
              </div>
            </div>

            <div class="form-group" style={{ "--color-text": "var(--text-primary)", "--color-bg": "var(--bg-primary)" } as any}>
              <label class="form-label mb-2 block">Nội dung Markdown (EasyMDE)</label>
              
              <div class="easymde-wrapper" style={{ "background-color": "var(--bg-primary)", color: "var(--text-primary)" }}>
                <textarea
                  ref={textareaRef}
                  class="form-input"
                  style={{ display: "none" }}
                ></textarea>
              </div>
            </div>

            <div class="flex items-center gap-2 mt-4">
              <button
                type="submit"
                disabled={isSubmitting()}
                class="btn btn-primary flex-1 p-3"
              >
                {isSubmitting() ? "Đang xử lý..." : (editingId() ? "Cập nhật Bài Viết" : "Lưu Bài Viết")}
              </button>
              <Show when={editingId()}>
                <button
                  type="button"
                  onClick={cancelEdit}
                  class="btn btn-secondary flex-1 p-3"
                >
                  Hủy Sửa
                </button>
              </Show>
            </div>
          </form>
        </div>

        {/* LIST ARTICLES */}
        <div class="card">
          <div class="flex justify-between items-center mb-6">
            <h2 class="card-title m-0">Danh sách Bài Viết</h2>
            <select
              class="form-input"
              style={{ width: "250px" }}
              value={filterChapterId() || ""}
              onChange={(e) => setSearchParams({ chapterId: e.target.value || undefined })}
            >
              <option value="">-- Tất cả Chương --</option>
              <For each={categories()?.filter(c => c.type === "category") || []}>
                {(cat) => {
                  const parentGroup = categories()?.find(g => g.id === cat.parentId);
                  const catChapters = chapters().filter(ch => ch.parentId === cat.id);
                  if (catChapters.length === 0) return null;
                  return (
                    <optgroup label={`${parentGroup?.name || 'Mục'} ➔ ${cat.name}`}>
                      <For each={catChapters}>
                        {(chap) => <option value={chap.id}>{chap.name}</option>}
                      </For>
                    </optgroup>
                  );
                }}
              </For>
            </select>
          </div>

          <Show when={!articlesData()}>
            <div class="pulse-text mb-4">Đang tải dữ liệu SQL...</div>
          </Show>

          <div class="article-list">
            <For each={chapters()}>
              {(chap) => {
                const chapArticles = articlesData()?.articles?.filter(a => a.chapterId === chap.id) || [];
                if (chapArticles.length === 0) return null;
                
                const parentCat = categories()?.find(c => c.id === chap.parentId);
                const parentGroup = categories()?.find(g => g.id === parentCat?.parentId);

                return (
                  <div class="mb-6">
                    <h4 class="text-md font-bold mb-3 pb-2 border-b border-gray-700" style={{ color: "var(--vivid-pink)" }}>
                      {parentGroup?.name} &rarr; {parentCat?.name} &rarr; {chap.name}
                    </h4>
                    <div class="flex flex-col gap-2">
                      <For each={chapArticles}>
                        {(article) => (
                          <div class="article-item" style={{ margin: "0" }}>
                            <div class="flex justify-between">
                              <div>
                                <h3 class="article-item-title">[{article.order}] {article.title}</h3>
                                <div class="article-item-path">/docs/{parentCat?.slug ? `${parentCat.slug}/` : ''}{article.slug || article.id}</div>
                              </div>
                              <div class="flex gap-2 items-center">
                                <A href={`/docs/${parentCat?.slug ? `${parentCat.slug}/` : ''}${article.slug || article.id}`} target="_blank" class="badge-info text-center flex-1">Xem</A>
                                <button onClick={() => handleEdit(article)} class="badge-info text-center flex-1">Sửa</button>
                                <button onClick={() => handleDelete(article.id + "")} class="badge-danger text-center flex-1">Xóa</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )
              }}
            </For>
          </div>
        </div>

      </div>
    </div>
  );
}
