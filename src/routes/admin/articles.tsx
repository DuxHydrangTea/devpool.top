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
    parentId: c.parentId
  }));
}, "categories-list-arts");

const getArticlesServer = query(async (page: number, limit: number) => {
  "use server";
  await requireAuth();
  
  const offset = (page - 1) * limit;
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(articlesSchema);
  
  const articles = await db.select({
    id: articlesSchema.id,
    title: articlesSchema.title,
    chapterId: articlesSchema.chapterId,
    order: articlesSchema.order,
    slug: articlesSchema.slug,
    contentMd: articlesSchema.contentMd
  }).from(articlesSchema).orderBy(asc(articlesSchema.order)).limit(limit).offset(offset);
  
  return { articles, total: Number(count) };
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

// =======================
// COMPONENT
// =======================
export default function AdminArticles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = () => parseInt(searchParams.page || "1", 10);
  const limit = 15;

  const categories = createAsync(() => getCategoriesServer());
  const articlesData = createAsync(() => getArticlesServer(page(), limit));

  const addArticle = useAction(addArticleServer);
  const deleteArticle = useAction(deleteArticleServer);
  const clearAllCache = useAction(clearAllCacheServer);

  // Form state
  const [title, setTitle] = createSignal("");
  const [contentMd, setContentMd] = createSignal("");
  const [chapterId, setChapterId] = createSignal<number | null>(null);
  const [order, setOrder] = createSignal(0);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

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
          <Show when={!articlesData()}>
            <div class="pulse-text mb-4">Đang tải dữ liệu SQL...</div>
          </Show>

          <div class="article-list">
            <For each={articlesData()?.articles || []}>
              {(article) => {
                const chap = chapters().find(c => c.id === article.chapterId);
                return (
                  <div class="article-item">
                    <div class="flex justify-between">
                      <div>
                        <h3 class="article-item-title">[{article.order}] {article.title}</h3>
                        <div class="article-item-path">/docs/{article.slug || article.id}</div>
                      </div>
                      <div class="flex gap-2 items-center">
                        <A href={`/docs/${article.slug || article.id}`} target="_blank" class="badge-info text-center flex-1">Xem</A>
                        <button onClick={() => handleEdit(article)} class="badge-info text-center flex-1">Sửa</button>
                        <button onClick={() => handleDelete(article.id + "")} class="badge-danger text-center flex-1">Xóa</button>
                      </div>
                    </div>
                  </div>
                )
              }}
            </For>
          </div>

          <Show when={articlesData()}>
            {(data) => {
              const totalPages = Math.ceil(data().total / limit);
              return (
                <div class="flex justify-center items-center gap-4 mt-6">
                  <button 
                    disabled={page() <= 1}
                    onClick={() => setSearchParams({ page: page() - 1 })}
                    class="btn btn-secondary px-4 py-2"
                  >
                    &larr; Trước
                  </button>
                  <span class="text-sm text-gray-400">
                    Trang {page()} / {totalPages} (Tổng {data().total})
                  </span>
                  <button 
                    disabled={page() >= totalPages}
                    onClick={() => setSearchParams({ page: page() + 1 })}
                    class="btn btn-secondary px-4 py-2"
                  >
                    Sau &rarr;
                  </button>
                </div>
              );
            }}
          </Show>
        </div>

      </div>
    </div>
  );
}
