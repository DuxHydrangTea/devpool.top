import { createSignal, Show, For, onMount, onCleanup, createMemo, createEffect } from "solid-js";
import { A, useSearchParams, query, action, createAsync, useAction, revalidate } from "@solidjs/router";
import { parseMarkdown } from "~/lib/markdown";
import CustomSelect from "~/components/CustomSelect";
import { authService } from "~/server/services/auth.service";
import { articleService } from "~/server/services/article.service";
import { categoryService } from "~/server/services/category.service";
import { aiService } from "~/server/services/ai.service";
import { ArticleMeta } from "~/types/article.types";
import { Category } from "~/types/category.types";
import { generateSlug } from "~/utils/slug";
import type EasyMDE from "easymde";
import "easymde/dist/easymde.min.css";

// =======================
// SERVER FUNCTIONS
// =======================
const getCategoriesServer = query(async () => {
  "use server";
  await authService.requireAuth();
  return await categoryService.getAllCategories();
}, "categories-list");

const getArticlesServer = query(async (filterChapterId?: number) => {
  "use server";
  await authService.requireAuth();
  return await articleService.getArticles(filterChapterId);
}, "articles-list");

const getArticleContentServer = action(async (id: number) => {
  "use server";
  await authService.requireAuth();
  return await articleService.getArticleContent(id);
});

const addArticleServer = action(
  async (data: { title: string; contentMd: string; chapterId: number; order: number; isHidden: number }) => {
    "use server";
    await authService.requireAuth();
    await articleService.createArticle(data);
  }
);

const deleteArticleServer = action(async (id: number) => {
  "use server";
  await authService.requireAuth();
  await articleService.deleteArticle(id);
});

const updateArticleServer = action(
  async (data: { id: number; title: string; contentMd: string; chapterId: number; order: number; isHidden: number }) => {
    "use server";
    await authService.requireAuth();
    await articleService.updateArticle(data);
  }
);

const toggleArticleVisibilityServer = action(
  async (data: { id: number; isHidden: number }) => {
    "use server";
    await authService.requireAuth();
    await articleService.toggleArticleVisibility(data.id, data.isHidden);
  }
);

const clearAllCacheServer = action(async () => {
  "use server";
  await authService.requireAuth();
  return await articleService.clearAllSystemCache();
});

const generateExaContentServer = action(async (prompt: string) => {
  "use server";
  await authService.requireAuth();
  return await aiService.generateTechnicalArticle(prompt);
});

// =======================
// COMPONENT
// =======================
export default function AdminArticles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterChapterId = () => (searchParams.chapterId ? parseInt(searchParams.chapterId as string, 10) : undefined);

  const categories = createAsync(() => getCategoriesServer());
  const articlesData = createAsync(() => getArticlesServer(filterChapterId()));

  const addArticle = useAction(addArticleServer);
  const deleteArticle = useAction(deleteArticleServer);
  const updateArticle = useAction(updateArticleServer);
  const toggleVisibility = useAction(toggleArticleVisibilityServer);
  const getArticleContent = useAction(getArticleContentServer);
  const clearAllCache = useAction(clearAllCacheServer);
  const generateExaContent = useAction(generateExaContentServer);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [title, setTitle] = createSignal("");
  const [contentMd, setContentMd] = createSignal("");
  const [chapterId, setChapterId] = createSignal<number | null>(filterChapterId() || null);
  const [order, setOrder] = createSignal(0);
  const [isHidden, setIsHidden] = createSignal(0);
  const [exaPrompt, setExaPrompt] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isLoadingContent, setIsLoadingContent] = createSignal(false);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [copiedSlug, setCopiedSlug] = createSignal<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(25);

  let textareaRef: HTMLTextAreaElement | undefined;
  let easymde: EasyMDE | undefined;

  const initEasyMDE = async () => {
    if (textareaRef) {
      if (easymde) {
        easymde.toTextArea();
        easymde = undefined;
      }
      const EasyMDEClass = (await import("easymde")).default;
      easymde = new EasyMDEClass({
        element: textareaRef,
        initialValue: contentMd(),
        spellChecker: false,
        maxHeight: "380px",
        previewRender: (plainText) => {
          return `<div class="prose" style="padding: 1rem;">${parseMarkdown(plainText)}</div>`;
        },
      });
      easymde.codemirror.on("change", () => {
        setContentMd(easymde!.value());
      });
    }
  };

  createEffect(() => {
    if (isModalOpen()) {
      setTimeout(() => {
        initEasyMDE();
      }, 80);
    } else {
      if (easymde) {
        easymde.toTextArea();
        easymde = undefined;
      }
    }
  });

  onCleanup(() => {
    if (easymde) {
      easymde.toTextArea();
      easymde = undefined;
    }
  });

  // Reset page to 1 when search or chapter filter changes
  createEffect(() => {
    searchQuery();
    filterChapterId();
    setCurrentPage(1);
  });

  // Fast map to check if a chapter's category or group is hidden
  const hiddenChapterMap = createMemo(() => {
    const all = categories() || [];
    const catMap = new Map<number, Category>(all.map((c) => [c.id, c]));
    const result = new Map<number, boolean>();

    const checkHidden = (catId: number | null): boolean => {
      if (catId === null || !catMap.has(catId)) return false;
      const cat = catMap.get(catId)!;
      if (cat.isHidden === 1) return true;
      return checkHidden(cat.parentId);
    };

    for (const cat of all) {
      result.set(cat.id, checkHidden(cat.id));
    }
    return result;
  });

  // Select options for filter toolbar
  const chapterFilterOptions = createMemo(() => {
    const allCats = categories() || [];
    const opts: Array<{ value: string | number; label: string; group?: string; icon?: string }> = [
      { value: "", label: "Tất cả các chương", icon: "🌐" },
    ];
    const catList = allCats.filter((c) => c.type === "category");
    for (const cat of catList) {
      const parentGroup = allCats.find((g) => g.id === cat.parentId);
      const groupName = `${parentGroup?.name || "Mục"} › ${cat.name}`;
      const chaps = allCats.filter((ch) => ch.type === "chapter" && ch.parentId === cat.id);
      for (const ch of chaps) {
        opts.push({
          value: ch.id,
          label: ch.name,
          group: groupName,
          icon: "📑",
        });
      }
    }
    return opts;
  });

  // Select options for create/edit article form
  const chapterFormOptions = createMemo(() => {
    const allCats = categories() || [];
    const opts: Array<{ value: string | number; label: string; group?: string; icon?: string }> = [];
    const catList = allCats.filter((c) => c.type === "category");
    for (const cat of catList) {
      const parentGroup = allCats.find((g) => g.id === cat.parentId);
      const groupName = `${parentGroup?.name || "Mục"} › ${cat.name}`;
      opts.push({
        value: cat.id,
        label: `[Chuyên mục chính] ${cat.name}`,
        group: groupName,
        icon: "📂",
      });
      const chaps = allCats.filter((ch) => ch.parentId === cat.id);
      for (const ch of chaps) {
        opts.push({
          value: ch.id,
          label: ch.name,
          group: groupName,
          icon: "📑",
        });
      }
    }
    return opts;
  });

  const openNewArticleModal = () => {
    setEditingId(null);
    setTitle("");
    setContentMd("");
    setOrder(0);
    setIsHidden(0);
    setExaPrompt("");
    if (filterChapterId()) {
      setChapterId(filterChapterId() || null);
    }
    setIsModalOpen(true);
  };

  const handleEdit = async (article: ArticleMeta) => {
    setEditingId(article.id);
    setTitle(article.title);
    setContentMd("");
    setChapterId(article.chapterId);
    setOrder(article.order);
    setIsHidden(article.isHidden || 0);
    setIsLoadingContent(true);
    setIsModalOpen(true);

    try {
      const md = await getArticleContent(article.id);
      setContentMd(md || "");
      if (easymde) {
        easymde.value(md || "");
      }
    } catch (err) {
      console.error("Lỗi khi tải nội dung bài viết:", err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setTitle("");
    setContentMd("");
    setOrder(0);
    setIsHidden(0);
    setExaPrompt("");
    setIsLoadingContent(false);
  };

  const handleToggleHide = async (article: ArticleMeta) => {
    const nextHidden = article.isHidden === 1 ? 0 : 1;
    try {
      await toggleVisibility({ id: article.id, isHidden: nextHidden });
      revalidate("articles-list");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi chuyển trạng thái ẩn/hiện bài viết");
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!title().trim() || !chapterId()) return alert("Vui lòng nhập tiêu đề và chọn chương chứa bài");

    setIsSubmitting(true);
    try {
      if (editingId()) {
        await updateArticle({
          id: editingId()!,
          title: title().trim(),
          contentMd: contentMd(),
          chapterId: Number(chapterId()),
          order: Number(order()),
          isHidden: isHidden(),
        });
      } else {
        await addArticle({
          title: title().trim(),
          contentMd: contentMd(),
          chapterId: Number(chapterId()),
          order: Number(order()),
          isHidden: isHidden(),
        });
      }

      closeModal();
      revalidate("articles-list");
    } catch (error) {
      console.error(error);
      alert(editingId() ? "Lỗi khi cập nhật bài viết" : "Lỗi khi thêm bài viết");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number, articleTitle: string) => {
    if (!confirm(`Bạn có chắc muốn xóa bài viết "${articleTitle}"?`)) return;
    try {
      await deleteArticle(id);
      revalidate("articles-list");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa bài viết");
    }
  };

  const handleClearAllCache = async () => {
    if (!confirm("Hành động này sẽ xóa sạch cache L1 RAM và L2 Upstash Redis. Tiếp tục?")) return;
    try {
      const res = await clearAllCache();
      if (res?.success) {
        alert("✅ Đã làm mới toàn bộ bộ nhớ đệm RAM & Upstash Redis!");
      } else {
        alert("⚠️ Đã làm mới RAM cache, kiểm tra log Redis.");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi dọn dẹp cache");
    }
  };

  const handleGenerateExa = async () => {
    const prompt = exaPrompt().trim() || title().trim();
    if (!prompt) return alert("Vui lòng nhập câu lệnh hoặc tiêu đề để AI sinh bài viết");

    setIsGenerating(true);
    try {
      const generatedMd = await generateExaContent(prompt);
      if (generatedMd) {
        setContentMd(generatedMd);
        if (easymde) {
          easymde.value(generatedMd);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi sinh nội dung từ EXA AI. Vui lòng kiểm tra API Key.");
    }
    setIsGenerating(false);
  };

  // Helper to build friendly path for article
  const getChapterPath = (cId: number) => {
    const all = categories() || [];
    const chap = all.find((c) => c.id === cId);
    if (!chap) return "Chưa gán";

    const cat = all.find((c) => c.id === chap.parentId);
    const grp = cat ? all.find((c) => c.id === cat.parentId) : null;

    return `${grp?.name || "Nhóm"} › ${cat?.name || "Mục"} › ${chap.name}`;
  };

  const getArticleDocUrl = (article: ArticleMeta) => {
    const all = categories() || [];
    const chapter = all.find((c) => c.id === article.chapterId);
    let catSlug = "";
    if (chapter) {
      if (chapter.type === "chapter" && chapter.parentId) {
        const cat = all.find((c) => c.id === chapter.parentId);
        if (cat?.slug) catSlug = cat.slug;
      } else if (chapter.slug) {
        catSlug = chapter.slug;
      }
    }
    return catSlug ? `/docs/${catSlug}/${article.slug}` : `/docs/${article.slug}`;
  };

  const copyDocLink = (slug: string, fullUrl: string) => {
    if (typeof window !== "undefined") {
      const completeUrl = `${window.location.origin}${fullUrl}`;
      navigator.clipboard.writeText(completeUrl);
      setCopiedSlug(slug);
      setTimeout(() => {
        setCopiedSlug(null);
      }, 2000);
    }
  };

  const previewSlug = () => generateSlug(title() || "tieu-de-bai-viet");

  // Filtered full list
  const filteredArticles = createMemo(() => {
    const list = articlesData() || [];
    const query = searchQuery().toLowerCase().trim();
    if (!query) return list;

    return list.filter(
      (a) => a.title.toLowerCase().includes(query) || a.slug.toLowerCase().includes(query)
    );
  });

  // Pagination Calculations
  const totalArticlesCount = () => filteredArticles().length;
  const totalPages = () => Math.max(1, Math.ceil(totalArticlesCount() / pageSize()));

  const paginatedArticles = createMemo(() => {
    const list = filteredArticles();
    const page = currentPage();
    const size = pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  const pageNumbers = createMemo(() => {
    const total = totalPages();
    const current = currentPage();
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    const pages: Array<number | string> = [];
    pages.push(1);

    if (range.length > 0 && range[0] > 2) {
      pages.push("...");
    }

    for (const p of range) {
      pages.push(p);
    }

    if (range.length > 0 && range[range.length - 1] < total - 1) {
      pages.push("...");
    }

    if (total > 1) {
      pages.push(total);
    }

    return pages;
  });

  return (
    <div class="dash-root">
      {/* 1. HERO BAR */}
      <header class="dash-hero-bar">
        <div class="dash-hero-main">
          <div class="dash-badge-row">
            <span class="dash-live-badge">
              <span class="dash-pulse-dot" />
              Kho Dữ Liệu Bài Viết
            </span>
            <span class="dash-meta-badge">{totalArticlesCount()} bài viết</span>
            <span class="dash-meta-badge">⚡ Lazy-loaded Payload</span>
          </div>
          <h1 class="dash-heading">Quản lý Bài viết & Nội dung</h1>
          <p class="dash-subheading">
            Biên tập tài liệu Markdown siêu tốc, phân trang mượt mà và hỗ trợ viết bài với EXA AI.
          </p>
        </div>

        <div class="dash-actions-cluster">
          <button
            type="button"
            class="dash-btn dash-btn-outline"
            onClick={handleClearAllCache}
            title="Làm mới bộ nhớ đệm RAM & Upstash Redis"
          >
            ⚡ Xóa Toàn Bộ Cache
          </button>

          <button
            type="button"
            class="dash-btn dash-btn-primary"
            onClick={openNewArticleModal}
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Tạo bài viết mới
          </button>
        </div>
      </header>

      {/* 2. SEARCH & FILTER TOOLBAR WITH CUSTOM SELECT */}
      <div class="dash-card" style={{ padding: "0.85rem 1.25rem", position: "relative", "z-index": 40 }}>
        <div class="dash-toolbar-row">
          <div class="dash-search-box flex-1">
            <svg class="dash-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              class="dash-search-input"
              placeholder="Tìm kiếm bài viết theo tiêu đề, slug..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
            <Show when={searchQuery()}>
              <button class="dash-clear-btn" onClick={() => setSearchQuery("")}>
                &times;
              </button>
            </Show>
          </div>

          <div class="dash-select-filter">
            <span class="dash-select-filter-label">Lọc chương:</span>
            <div style={{ flex: "1", "min-width": "220px" }}>
              <CustomSelect
                options={chapterFilterOptions()}
                value={filterChapterId() || ""}
                onChange={(val) => {
                  if (val && String(val).trim() !== "") {
                    setSearchParams({ chapterId: String(val) });
                  } else {
                    setSearchParams({ chapterId: undefined });
                  }
                }}
                placeholder="-- Tất cả các chương --"
                searchable={true}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. FULL-WIDTH ARTICLES DATA TABLE */}
      <div class="dash-card table-card" style={{ padding: "0", position: "relative", "z-index": 10 }}>
        <Show
          when={totalArticlesCount() > 0}
          fallback={
            <div class="dash-empty-state">
              <div class="text-4xl mb-2">📝</div>
              <h3 class="dash-empty-title">Chưa có bài viết nào</h3>
              <p class="dash-empty-desc">Bắt đầu tạo bài viết đầu tiên bằng cách nhấn nút dưới đây.</p>
              <button class="dash-btn dash-btn-primary mt-4" onClick={openNewArticleModal}>
                + Thêm bài viết mới
              </button>
            </div>
          }
        >
          <div class="admin-table-container">
            <table class="admin-data-table">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>STT</th>
                  <th>Tiêu đề & Chuyên mục</th>
                  <th style={{ width: "130px" }}>Trạng thái</th>
                  <th style={{ width: "280px" }}>Slug URL</th>
                  <th style={{ width: "210px", "text-align": "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedArticles()}>
                  {(article) => {
                    const docUrl = getArticleDocUrl(article);
                    const isCopied = () => copiedSlug() === article.slug;
                    const isParentHidden = () => hiddenChapterMap().get(article.chapterId) === true;

                    return (
                      <tr class={`admin-table-row ${article.isHidden === 1 || isParentHidden() ? "opacity-75" : ""}`}>
                        <td>
                          <span class="admin-order-badge">#{article.order}</span>
                        </td>
                        <td>
                          <div class="admin-art-cell">
                            <span class="admin-art-title font-semibold">{article.title}</span>
                            <div class="admin-art-path">
                              <span>📁 {getChapterPath(article.chapterId)}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Show when={isParentHidden()}>
                            <span class="text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Chương hoặc chuyên mục cha của bài này đang bị ẩn">
                              ⚠️ Mục cha ẩn
                            </span>
                          </Show>
                          <Show when={!isParentHidden() && article.isHidden === 1}>
                            <span class="text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              🚫 Đang ẩn
                            </span>
                          </Show>
                          <Show when={!isParentHidden() && article.isHidden !== 1}>
                            <span class="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              👁️ Hiển thị
                            </span>
                          </Show>
                        </td>
                        <td>
                          <button
                            type="button"
                            class="admin-slug-pill"
                            onClick={() => copyDocLink(article.slug, docUrl)}
                            title="Nhấp để copy link bài viết"
                          >
                            <span class="admin-slug-text">/{article.slug}</span>
                            <span class="admin-copy-icon">{isCopied() ? "✓ Đã chép" : "📋"}</span>
                          </button>
                        </td>
                        <td style={{ "text-align": "right" }}>
                          <div class="admin-action-row">
                            {/* Quick Visibility Toggle Button */}
                            <button
                              type="button"
                              class={`admin-action-btn ${article.isHidden === 1 ? "text-amber-400" : "text-slate-400"}`}
                              onClick={() => handleToggleHide(article)}
                              title={article.isHidden === 1 ? "Bấm để MỞ HIỂN THỊ bài viết" : "Bấm để ẨN bài viết khỏi client"}
                            >
                              {article.isHidden === 1 ? "👁️ Mở" : "🚫 Ẩn"}
                            </button>
                            <A
                              href={docUrl}
                              target="_blank"
                              class="admin-action-btn view"
                              title="Xem bài viết trên client docs"
                            >
                              ↗
                            </A>
                            <button
                              type="button"
                              class="admin-action-btn edit"
                              onClick={() => handleEdit(article)}
                              title="Chỉnh sửa bài viết"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              class="admin-action-btn delete"
                              onClick={() => handleDelete(article.id, article.title)}
                              title="Xóa bài viết"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>

          {/* 4. MODERN PAGINATION BAR */}
          <div class="admin-pagination-bar">
            <div class="admin-pagination-info">
              Hiển thị <span class="font-semibold text-slate-200">{(currentPage() - 1) * pageSize() + 1}</span> -{" "}
              <span class="font-semibold text-slate-200">
                {Math.min(currentPage() * pageSize(), totalArticlesCount())}
              </span>{" "}
              trên tổng số <span class="font-semibold text-sky-400">{totalArticlesCount()}</span> bài viết
            </div>

            <div class="flex items-center gap-5">
              {/* Page size dropdown */}
              <div class="flex items-center gap-2 text-xs text-slate-400">
                <span>Số bài:</span>
                <select
                  class="admin-page-size-select"
                  value={pageSize()}
                  onChange={(e) => {
                    setPageSize(Number(e.currentTarget.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="25">25 / trang</option>
                  <option value="50">50 / trang</option>
                  <option value="100">100 / trang</option>
                </select>
              </div>

              {/* Page navigation controls */}
              <div class="admin-pagination-controls">
                <button
                  type="button"
                  class="admin-page-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage() === 1}
                  title="Về trang đầu"
                >
                  «
                </button>
                <button
                  type="button"
                  class="admin-page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage() === 1}
                  title="Trang trước"
                >
                  ‹
                </button>

                <For each={pageNumbers()}>
                  {(p) => {
                    if (p === "...") {
                      return <span class="admin-page-ellipsis">...</span>;
                    }
                    const isCurrent = () => currentPage() === p;
                    return (
                      <button
                        type="button"
                        class={`admin-page-btn ${isCurrent() ? "active" : ""}`}
                        onClick={() => setCurrentPage(Number(p))}
                      >
                        {p}
                      </button>
                    );
                  }}
                </For>

                <button
                  type="button"
                  class="admin-page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages(), p + 1))}
                  disabled={currentPage() === totalPages()}
                  title="Trang sau"
                >
                  ›
                </button>
                <button
                  type="button"
                  class="admin-page-btn"
                  onClick={() => setCurrentPage(totalPages())}
                  disabled={currentPage() === totalPages()}
                  title="Đến trang cuối"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* 5. POPUP MODAL: ADD / EDIT ARTICLE WITH CUSTOM SELECT */}
      <Show when={isModalOpen()}>
        <div class="admin-modal-backdrop" onClick={closeModal}>
          <div class="admin-modal-dialog" style={{ "max-width": "860px" }} onClick={(e) => e.stopPropagation()}>
            {/* MODAL HEADER */}
            <div class="admin-modal-header">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">{editingId() ? "✏️" : "✨"}</span>
                <div>
                  <h3 class="admin-modal-title">
                    {editingId() ? `Chỉnh sửa: "${title()}"` : "Tạo Bài Viết Mới"}
                  </h3>
                  <p class="admin-modal-subtitle">
                    Soạn thảo định dạng Markdown, phân nhóm chương, trạng thái ẩn/hiện và hỗ trợ EXA AI
                  </p>
                </div>
              </div>
              <button class="admin-modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            {/* MODAL FORM BODY */}
            <form onSubmit={handleSubmit} class="admin-modal-body">
              {/* TOP FORM ROW: CHAPTER (CUSTOM SELECT) & ORDER */}
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="md:col-span-2">
                  <label class="form-label font-semibold">Chương trực thuộc *</label>
                  <CustomSelect
                    options={chapterFormOptions()}
                    value={chapterId() || ""}
                    onChange={(val) => setChapterId(val ? Number(val) : null)}
                    placeholder="-- Chọn Chương / Chuyên mục chứa bài --"
                    searchable={true}
                    size="md"
                  />
                </div>

                <div>
                  <label class="form-label font-semibold">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    class="form-input"
                    value={order()}
                    onInput={(e) => setOrder(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* TITLE & SLUG */}
              <div>
                <label class="form-label font-semibold">Tiêu đề bài viết *</label>
                <input
                  type="text"
                  class="form-input text-base"
                  value={title()}
                  onInput={(e) => setTitle(e.target.value)}
                  placeholder="VD: Hướng dẫn cấu hình CharacterBody2D trong Godot 4..."
                  required
                />
                <div class="text-[11px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                  <span>Đường dẫn xem bài:</span>
                  <span class="text-sky-400 font-semibold">/{previewSlug()}</span>
                </div>
              </div>

              {/* VISIBILITY TOGGLE */}
              <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div class="text-xs font-semibold text-slate-200">Ẩn bài viết khỏi giao diện người dùng (Client)</div>
                  <div class="text-[11px] text-slate-400">
                    Khi bật, bài viết sẽ không xuất hiện trong Sidebar, Tìm kiếm và khách đọc không thể truy cập.
                  </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHidden() === 1}
                    onChange={(e) => setIsHidden(e.currentTarget.checked ? 1 : 0)}
                    class="sr-only peer"
                  />
                  <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* EXA AI ASSISTANT PANEL */}
              <div class="admin-ai-panel">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <span class="text-sm">⚡</span>
                    Trợ lý AI Tự Động (EXA AI Assistant)
                  </div>
                  <span class="dash-pill-info text-[10px]">Markdown Auto-Gen</span>
                </div>

                <div class="flex gap-2">
                  <input
                    type="text"
                    class="form-input flex-1 text-xs"
                    placeholder="Nhập chủ đề cần sinh bài viết mẫu (VD: Cách dùng Tilemap trong Godot 4)..."
                    value={exaPrompt()}
                    onInput={(e) => setExaPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGenerateExa();
                      }
                    }}
                  />
                  <button
                    type="button"
                    class="dash-btn dash-btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                    onClick={handleGenerateExa}
                    disabled={isGenerating()}
                  >
                    {isGenerating() ? "⏳ Đang tạo..." : "✨ Tạo bài với AI"}
                  </button>
                </div>
              </div>

              {/* MARKDOWN EDITOR (EasyMDE) */}
              <div>
                <label class="form-label font-semibold flex items-center justify-between">
                  <span>Nội dung bài viết (Markdown)</span>
                  <Show
                    when={!isLoadingContent()}
                    fallback={<span class="text-xs text-sky-400 animate-pulse font-medium">⏳ Đang tải nội dung...</span>}
                  >
                    <span class="text-[11px] font-normal text-slate-400">Hỗ trợ đầy đủ cú pháp Markdown & Preview</span>
                  </Show>
                </label>
                <div class="admin-easymde-wrap">
                  <textarea
                    ref={(el) => (textareaRef = el)}
                    class="form-input hidden"
                    placeholder="Nhập nội dung bài viết..."
                  />
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div class="admin-modal-footer">
                <button
                  type="button"
                  class="dash-btn dash-btn-outline"
                  onClick={closeModal}
                  disabled={isSubmitting()}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  class="dash-btn dash-btn-primary px-6"
                  disabled={isSubmitting() || isLoadingContent()}
                >
                  {isSubmitting() ? "Đang lưu..." : editingId() ? "Lưu thay đổi" : "Tạo bài viết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
