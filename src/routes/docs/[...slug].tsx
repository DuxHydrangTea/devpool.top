import { useParams, useAction, revalidate, query, createAsync, A } from "@solidjs/router";
import { Show, Suspense, createSignal, createEffect, onCleanup } from "solid-js";
import { Title, Meta } from "@solidjs/meta";
import { parseMarkdown } from "~/lib/markdown";
import { db } from "~/lib/turso";
import { articles as articlesSchema, categories as categoriesSchema } from "~/db/schema";
import { eq, asc } from "drizzle-orm";
import "highlight.js/styles/base16/dracula.min.css";
import { usePageTitle } from "~/contexts/TitleContext";
import { articleCache } from "~/lib/cache";
import { getAuthCookie, verifyToken } from "~/lib/auth";
import { updateArticleTitleServer, updateArticleContentServer } from "~/app";
import type EasyMDE from "easymde";
import "easymde/dist/easymde.min.css";
import "viewerjs/dist/viewer.css";

const getArticleServer = query(async (slugId: string) => {
  "use server";
  if (!slugId) return null;

  const token = getAuthCookie();
  let isAdmin = false;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) isAdmin = true;
  }
  
  // fullSlug có thể chứa category-slug/article-slug
  const slugParts = slugId.split('/');
  const articleSlug = slugParts[slugParts.length - 1];
  
  // Trả về luôn dữ liệu trong RAM nếu đã được cache (chỉ trả về khi không cần cập nhật cache)
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
      id: data.id,
      title: data.title,
      contentMd: data.contentMd || "",
      content: htmlContent,
      prev: prevResult ? { title: prevResult.title, slug: getArticlePath(prevResult) } : null,
      next: nextResult ? { title: nextResult.title, slug: getArticlePath(nextResult) } : null
    };
    
    // Lưu vào bộ nhớ đệm (Cache) trên Server bằng articleSlug để đảm bảo ID duy nhất
    articleCache.set(articleSlug, result);
    return { ...result, isAdmin };
  }

  return {
    id: 0,
    title: "Không tìm thấy",
    contentMd: "",
    content: "<h1>Bài viết không tồn tại</h1><p>Vui lòng kiểm tra lại đường dẫn.</p>",
    isAdmin,
    prev: null,
    next: null
  };
}, "doc-article");

export default function DocPage() {
  const params = useParams();
  const article = createAsync(() => getArticleServer(params.slug || ""));
  const [, setPageTitle] = usePageTitle();
  const updateArticleTitle = useAction(updateArticleTitleServer);
  const updateArticleContent = useAction(updateArticleContentServer);

  const [isEditingTitle, setIsEditingTitle] = createSignal(false);
  const [editingTitle, setEditingTitle] = createSignal("");

  const [isEditingContent, setIsEditingContent] = createSignal(false);
  const [editingContentMd, setEditingContentMd] = createSignal("");
  const [isSavingContent, setIsSavingContent] = createSignal(false);

  let viewerInstance: any = null;
  let textareaRef: HTMLTextAreaElement | undefined;
  let easymde: EasyMDE | undefined;

  const handleSaveTitle = async () => {
    const art = article();
    if (!art || !art.id || !editingTitle().trim()) return;
    try {
      await updateArticleTitle({ id: art.id, title: editingTitle().trim() });
      revalidate("doc-article");
      revalidate("sidebar-data");
      setIsEditingTitle(false);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật tiêu đề bài viết!");
    }
  };

  const handleSaveContent = async () => {
    const art = article();
    if (!art || !art.id) return;
    const contentToSave = easymde ? easymde.value() : editingContentMd();
    setIsSavingContent(true);
    try {
      await updateArticleContent({ id: art.id, contentMd: contentToSave });
      revalidate("doc-article");
      if (easymde) {
        easymde.toTextArea();
        easymde = undefined;
      }
      setIsEditingContent(false);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật nội dung bài viết!");
    }
    setIsSavingContent(false);
  };

  const handleCancelContent = () => {
    if (easymde) {
      easymde.toTextArea();
      easymde = undefined;
    }
    setIsEditingContent(false);
  };

  createEffect(() => {
    if (isEditingContent()) {
      const md = article()?.contentMd || "";
      setEditingContentMd(md);

      setTimeout(async () => {
        if (textareaRef && !easymde) {
          const EasyMDEClass = (await import("easymde")).default;
          easymde = new EasyMDEClass({
            element: textareaRef,
            initialValue: md,
            spellChecker: false,
            maxHeight: "550px",
            previewRender: (plainText) => {
              return `<div class="prose" style="padding: 1rem;">${parseMarkdown(plainText)}</div>`;
            }
          });
          easymde.codemirror.on("change", () => {
            setEditingContentMd(easymde!.value());
          });
        } else if (easymde) {
          easymde.value(md);
        }
      }, 30);
    } else {
      if (easymde) {
        easymde.toTextArea();
        easymde = undefined;
      }
    }
  });

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
    if (easymde) {
      easymde.toTextArea();
      easymde = undefined;
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

          <Show when={article()?.isAdmin && article()?.id}>
            <div style={{ "margin-bottom": "1.5rem", padding: "0.75rem 1rem", background: "var(--bg-secondary)", "border-radius": "var(--radius-lg)", border: "1px solid var(--border-color)", display: "flex", "align-items": "center", "justify-content": "space-between", "flex-wrap": "wrap", gap: "0.5rem" }}>
              <Show
                when={isEditingTitle()}
                fallback={
                  <div style={{ display: "flex", "align-items": "center", gap: "0.75rem", flex: "1", "flex-wrap": "wrap", "justify-content": "space-between" }}>
                    <h1 style={{ "font-size": "1.25rem", "font-weight": 700, margin: 0, color: "var(--text-primary)" }}>{article()?.title}</h1>
                    <div style={{ display: "flex", gap: "0.5rem", "align-items": "center" }}>
                      <button
                        class="cat-edit-btn"
                        style={{ "font-size": "0.85rem", padding: "0.3rem 0.6rem" }}
                        title="Sửa tiêu đề bài viết"
                        onClick={() => {
                          setIsEditingTitle(true);
                          setEditingTitle(article()?.title || "");
                        }}
                      >
                        <i class="fas fa-pencil-alt"></i> Sửa tiêu đề
                      </button>
                      <button
                        class="cat-edit-btn"
                        style={{ "font-size": "0.85rem", padding: "0.3rem 0.6rem", color: "var(--accent-primary)", "border-color": "var(--accent-primary)" }}
                        title="Sửa nội dung Markdown"
                        onClick={() => {
                          const nextState = !isEditingContent();
                          if (!nextState && easymde) {
                            easymde.toTextArea();
                            easymde = undefined;
                          }
                          setIsEditingContent(nextState);
                        }}
                      >
                        <i class={`fas ${isEditingContent() ? 'fa-eye' : 'fa-edit'}`}></i> {isEditingContent() ? "Xem giao diện" : "Sửa nội dung (EasyMDE)"}
                      </button>
                    </div>
                  </div>
                }
              >
                <div class="inline-edit-box" style={{ width: "100%" }}>
                  <input
                    type="text"
                    class="inline-edit-input"
                    style={{ flex: 1, "font-size": "1.1rem", padding: "0.4rem 0.6rem" }}
                    value={editingTitle()}
                    onInput={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    ref={(el) => setTimeout(() => el?.focus(), 10)}
                  />
                  <button onClick={handleSaveTitle} class="cat-save-btn" style={{ padding: "0.4rem 0.8rem" }} title="Lưu">
                    <i class="fas fa-check"></i> Lưu
                  </button>
                  <button onClick={() => setIsEditingTitle(false)} class="cat-cancel-btn" style={{ padding: "0.4rem 0.8rem" }} title="Hủy">
                    <i class="fas fa-times"></i> Hủy
                  </button>
                </div>
              </Show>
            </div>
          </Show>

          <Show
            when={isEditingContent()}
            fallback={
              <div
                class="prose"
                innerHTML={article()?.content as string}
              />
            }
          >
            <div class="markdown-editor-container" style={{ "margin-bottom": "2rem" }}>
              <div style={{ display: "flex", "justify-content": "space-between", "align-items": "center", "margin-bottom": "0.75rem" }}>
                <label style={{ "font-weight": 600, color: "var(--accent-primary)", "font-size": "0.95rem", display: "flex", "align-items": "center", gap: "0.5rem" }}>
                  <i class="fas fa-edit"></i> Trình soạn thảo EasyMDE (Markdown)
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={handleSaveContent}
                    class="btn btn-primary"
                    style={{ padding: "0.4rem 1rem", "font-size": "0.85rem", display: "flex", "align-items": "center", gap: "0.4rem" }}
                    disabled={isSavingContent()}
                  >
                    <i class="fas fa-save"></i> {isSavingContent() ? "Đang lưu..." : "Lưu nội dung"}
                  </button>
                  <button
                    onClick={handleCancelContent}
                    class="btn btn-secondary"
                    style={{ padding: "0.4rem 1rem", "font-size": "0.85rem", display: "flex", "align-items": "center", gap: "0.4rem" }}
                  >
                    <i class="fas fa-times"></i> Hủy
                  </button>
                </div>
              </div>
              <textarea
                ref={(el) => (textareaRef = el)}
                class="form-input"
                placeholder="Nhập nội dung bài viết dưới dạng Markdown..."
              />
            </div>
          </Show>

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
