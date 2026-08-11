import { For, Show, createSignal } from "solid-js";
import { A, useLocation, useAction, revalidate } from "@solidjs/router";
import { updateCategoryNameServer, updateArticleTitleServer } from "~/app";

export interface Category { id: number; name: string; type: string; parentId: number | null; order: number; slug: string; }
export interface Article { id: number; title: string; chapterId: number; order: number; slug: string; }
export interface SidebarData { categories: Category[]; articles: Article[]; isAdmin?: boolean; }

const ChapterNode = (props: {
  chapter: Category,
  getChapters: (id: number) => Category[],
  getArticles: (id: number) => Article[],
  location: any,
  onClose?: () => void,
  categorySlug?: string,
  isAdmin?: boolean,
  editingId?: number | null,
  editingName?: string,
  onStartEdit?: (category: Category) => void,
  onCancelEdit?: () => void,
  onSaveEdit?: (id: number) => void,
  onSetEditingName?: (val: string) => void,
  editingArticleId?: number | null,
  editingArticleTitle?: string,
  onStartEditArticle?: (article: Article) => void,
  onCancelEditArticle?: () => void,
  onSaveEditArticle?: (id: number) => void,
  onSetEditingArticleTitle?: (val: string) => void,
}) => {
  return (
    <div style={{"margin-bottom": "0.5rem"}}>
      <div class="chapter-title flex justify-between items-center" style={{ "user-select": "none", "margin-bottom": "0.25rem" }}>
        <Show
          when={props.editingId === props.chapter.id}
          fallback={
            <div class="flex items-center gap-2">
              <i class={`fas fa-folder-open chapter-icon`}></i>
              <span>{props.chapter.name}</span>
              <Show when={props.isAdmin}>
                <button
                  class="cat-edit-btn"
                  title="Sửa tên chương"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onStartEdit?.(props.chapter);
                  }}
                >
                  <i class="fas fa-pencil-alt"></i>
                </button>
              </Show>
            </div>
          }
        >
          <div class="inline-edit-box" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              class="inline-edit-input"
              value={props.editingName}
              onInput={(e) => props.onSetEditingName?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") props.onSaveEdit?.(props.chapter.id);
                if (e.key === "Escape") props.onCancelEdit?.();
              }}
              ref={(el) => setTimeout(() => el?.focus(), 10)}
            />
            <button onClick={() => props.onSaveEdit?.(props.chapter.id)} class="cat-save-btn" title="Lưu">
              <i class="fas fa-check"></i>
            </button>
            <button onClick={() => props.onCancelEdit?.()} class="cat-cancel-btn" title="Hủy">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </Show>
      </div>
      <ul class="article-list-container" style={{ "margin-left": "0.5rem", "border-left": "1px solid var(--border-color)", "padding-left": "0.5rem" }}>
        <For each={props.getChapters(props.chapter.id)}>
          {(sub) => (
            <ChapterNode
              chapter={sub}
              getChapters={props.getChapters}
              getArticles={props.getArticles}
              location={props.location}
              onClose={props.onClose}
              categorySlug={props.categorySlug}
              isAdmin={props.isAdmin}
              editingId={props.editingId}
              editingName={props.editingName}
              onStartEdit={props.onStartEdit}
              onCancelEdit={props.onCancelEdit}
              onSaveEdit={props.onSaveEdit}
              onSetEditingName={props.onSetEditingName}
              editingArticleId={props.editingArticleId}
              editingArticleTitle={props.editingArticleTitle}
              onStartEditArticle={props.onStartEditArticle}
              onCancelEditArticle={props.onCancelEditArticle}
              onSaveEditArticle={props.onSaveEditArticle}
              onSetEditingArticleTitle={props.onSetEditingArticleTitle}
            />
          )}
        </For>
        <For each={props.getArticles(props.chapter.id)}>
          {(article) => {
            const path = props.categorySlug ? `/docs/${props.categorySlug}/${article.slug}` : `/docs/${article.slug}`;
            const isActive = props.location.pathname === path || props.location.pathname.endsWith(`/${article.slug}`);
            return (
              <li>
                <Show
                  when={props.editingArticleId === article.id}
                  fallback={
                    <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", width: "100%" }}>
                      <A
                        href={path}
                        class={`article-link ${isActive ? "active" : ""}`}
                        onClick={() => {
                          if (props.onClose) props.onClose();
                        }}
                        style={{ flex: "1" }}
                      >
                        {article.title}
                      </A>
                      <Show when={props.isAdmin}>
                        <button
                          class="cat-edit-btn"
                          title="Sửa tiêu đề bài viết"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            props.onStartEditArticle?.(article);
                          }}
                        >
                          <i class="fas fa-pencil-alt"></i>
                        </button>
                      </Show>
                    </div>
                  }
                >
                  <div class="inline-edit-box" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      class="inline-edit-input"
                      value={props.editingArticleTitle}
                      onInput={(e) => props.onSetEditingArticleTitle?.(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") props.onSaveEditArticle?.(article.id);
                        if (e.key === "Escape") props.onCancelEditArticle?.();
                      }}
                      ref={(el) => setTimeout(() => el?.focus(), 10)}
                    />
                    <button onClick={() => props.onSaveEditArticle?.(article.id)} class="cat-save-btn" title="Lưu">
                      <i class="fas fa-check"></i>
                    </button>
                    <button onClick={() => props.onCancelEditArticle?.()} class="cat-cancel-btn" title="Hủy">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </Show>
              </li>
            );
          }}
        </For>
      </ul>
    </div>
  );
};

export default function Sidebar(props: { 
  isOpen?: boolean; 
  onClose?: () => void;
  data: SidebarData | undefined;
  activeGroupId: number | null;
  setActiveGroupId: (id: number) => void;
  activeCategoryId: number | null;
  setActiveCategoryId: (id: number) => void;
}) {
  const location = useLocation();
  const updateCategoryName = useAction(updateCategoryNameServer);
  const updateArticleTitle = useAction(updateArticleTitleServer);

  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [editingName, setEditingName] = createSignal<string>("");

  const [editingArticleId, setEditingArticleId] = createSignal<number | null>(null);
  const [editingArticleTitle, setEditingArticleTitle] = createSignal<string>("");

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSave = async (id: number) => {
    if (!editingName().trim()) return;
    try {
      await updateCategoryName({ id, name: editingName().trim() });
      revalidate("sidebar-data");
      cancelEdit();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật tên!");
    }
  };

  const startEditArticle = (article: Article) => {
    setEditingArticleId(article.id);
    setEditingArticleTitle(article.title);
  };

  const cancelEditArticle = () => {
    setEditingArticleId(null);
    setEditingArticleTitle("");
  };

  const handleSaveArticle = async (id: number) => {
    if (!editingArticleTitle().trim()) return;
    try {
      await updateArticleTitle({ id, title: editingArticleTitle().trim() });
      revalidate("sidebar-data");
      revalidate("doc-article");
      cancelEditArticle();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật tiêu đề bài viết!");
    }
  };

  const getCategories = (groupId: number) => props.data?.categories.filter(c => c.type === "category" && c.parentId === groupId) || [];
  const getChapters = (catId: number) => props.data?.categories.filter(c => c.type === "chapter" && c.parentId === catId) || [];
  const getArticles = (chapId: number) => props.data?.articles.filter(a => a.chapterId === chapId) || [];

  return (
    <nav class={`sidebar ${props.isOpen ? 'open' : ''}`}>
      <Show when={!props.data}>
        <div class="p-6 text-emerald-400 text-sm animate-pulse text-center">Loading data...</div>
      </Show>

      <Show when={props.data}>
        <div style={{ position: "sticky", top: "0", "z-index": 40, "background-color": "var(--bg-primary)" }}>
          {/* GROUP TABS - chỉ hiện trên mobile (ẩn bởi CSS trên desktop) */}
          <Show when={props.data?.categories.filter(c => c.type === "group").length}>
            <div class="sidebar-group-tabs mobile-group-selector">
              <For each={props.data!.categories.filter(c => c.type === "group")}>
                {(group) => (
                  <Show
                    when={editingId() === group.id}
                    fallback={
                      <div style={{ display: "inline-flex", "align-items": "center", gap: "0.2rem" }}>
                        <button
                          class={`sidebar-tab ${props.activeGroupId === group.id ? "active" : ""}`}
                          onClick={() => props.setActiveGroupId(group.id)}
                          style={{ "font-size": "0.75rem" }}
                        >
                          {group.name}
                        </button>
                        <Show when={props.data?.isAdmin}>
                          <button
                            class="cat-edit-btn"
                            title="Sửa tên nhóm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(group);
                            }}
                          >
                            <i class="fas fa-pencil-alt"></i>
                          </button>
                        </Show>
                      </div>
                    }
                  >
                    <div class="inline-edit-box" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        class="inline-edit-input"
                        value={editingName()}
                        onInput={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(group.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        ref={(el) => setTimeout(() => el?.focus(), 10)}
                      />
                      <button onClick={() => handleSave(group.id)} class="cat-save-btn" title="Lưu">
                        <i class="fas fa-check"></i>
                      </button>
                      <button onClick={cancelEdit} class="cat-cancel-btn" title="Hủy">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </Show>
                )}
              </For>
            </div>
          </Show>

          {/* SUB-TABS (Categories) */}
          <Show when={props.activeGroupId}>
            {(groupId) => (
              <div class="sidebar-tabs sub-tabs" style={{ position: "static", "background-color": "rgba(15, 23, 42, 0.98)", "padding-top": "0.5rem", "border-bottom": "1px solid var(--border-color)" }}>
                <div style={{ width: "100%", "font-size": "0.6rem", "text-transform": "uppercase", "letter-spacing": "0.05em", color: "var(--text-muted)", "margin-bottom": "0.25rem", "padding-left": "0.25rem", display: "flex", "align-items": "center", gap: "0.25rem" }}>
                  <i class="fas fa-level-down-alt"></i>
                  <span>Chuyên mục</span>
                </div>
                <For each={getCategories(groupId())}>
                  {(category, index) => (
                    <Show
                      when={editingId() === category.id}
                      fallback={
                        <div style={{ display: "inline-flex", "align-items": "center", gap: "0.2rem" }}>
                          <button
                            class={`sidebar-tab sub-tab ${props.activeCategoryId === category.id ? "active" : ""}`}
                            onClick={() => props.setActiveCategoryId(category.id)}
                            style={{ "font-size": "0.7rem", padding: "0.25rem" }}
                          >
                            <span style={{ "font-family": "var(--font-mono)", opacity: 0.5, "font-size": "0.8em", "margin-right": "0.2em" }}>{index() + 1}.</span>
                            {category.name}
                          </button>
                          <Show when={props.data?.isAdmin}>
                            <button
                              class="cat-edit-btn"
                              title="Sửa tên chuyên mục"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(category);
                              }}
                            >
                              <i class="fas fa-pencil-alt"></i>
                            </button>
                          </Show>
                        </div>
                      }
                    >
                      <div class="inline-edit-box" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          class="inline-edit-input"
                          value={editingName()}
                          onInput={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(category.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          ref={(el) => setTimeout(() => el?.focus(), 10)}
                        />
                        <button onClick={() => handleSave(category.id)} class="cat-save-btn" title="Lưu">
                          <i class="fas fa-check"></i>
                        </button>
                        <button onClick={cancelEdit} class="cat-cancel-btn" title="Hủy">
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    </Show>
                  )}
                </For>
              </div>
            )}
          </Show>
        </div>

        {/* CÂY THƯ MỤC */}
        <div class="sidebar-tree pt-2">
          <Show when={props.activeCategoryId}>
            {(categoryId) => (
              <div class="category-group" style={{ "padding-top": "0" }}>
                <div class="chapter-group">
                  {/* Render các bài viết trực tiếp thuộc Category (không nằm trong Chapter nào) */}
                  <ul class="article-list-container">
                    <For each={getArticles(categoryId())}>
                      {(article) => {
                        const catSlug = props.data?.categories.find(c => c.id === categoryId())?.slug;
                        const path = catSlug ? `/docs/${catSlug}/${article.slug}` : `/docs/${article.slug}`;
                        const isActive = location.pathname === path || location.pathname.endsWith(`/${article.slug}`);
                        return (
                          <li>
                            <Show
                              when={editingArticleId() === article.id}
                              fallback={
                                <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", width: "100%" }}>
                                  <A
                                    href={path}
                                    class={`article-link ${isActive ? "active" : ""}`}
                                    onClick={() => {
                                      if (props.onClose) props.onClose();
                                    }}
                                    style={{ flex: "1" }}
                                  >
                                    <i class="far fa-file-alt" style={{ "margin-right": "0.5rem", "font-size": "0.8em", opacity: 0.7 }}></i>
                                    {article.title}
                                  </A>
                                  <Show when={props.data?.isAdmin}>
                                    <button
                                      class="cat-edit-btn"
                                      title="Sửa tiêu đề bài viết"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        startEditArticle(article);
                                      }}
                                    >
                                      <i class="fas fa-pencil-alt"></i>
                                    </button>
                                  </Show>
                                </div>
                              }
                            >
                              <div class="inline-edit-box" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  class="inline-edit-input"
                                  value={editingArticleTitle()}
                                  onInput={(e) => setEditingArticleTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveArticle(article.id);
                                    if (e.key === "Escape") cancelEditArticle();
                                  }}
                                  ref={(el) => setTimeout(() => el?.focus(), 10)}
                                />
                                <button onClick={() => handleSaveArticle(article.id)} class="cat-save-btn" title="Lưu">
                                  <i class="fas fa-check"></i>
                                </button>
                                <button onClick={cancelEditArticle} class="cat-cancel-btn" title="Hủy">
                                  <i class="fas fa-times"></i>
                                </button>
                              </div>
                            </Show>
                          </li>
                        );
                      }}
                    </For>
                  </ul>

                  {/* Render các thư mục con đệ quy */}
                  <For each={getChapters(categoryId())}>
                    {(chapter) => (
                      <ChapterNode
                        chapter={chapter}
                        getChapters={getChapters}
                        getArticles={getArticles}
                        location={location}
                        onClose={props.onClose}
                        categorySlug={props.data?.categories.find(c => c.id === categoryId())?.slug}
                        isAdmin={props.data?.isAdmin}
                        editingId={editingId()}
                        editingName={editingName()}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={handleSave}
                        onSetEditingName={setEditingName}
                        editingArticleId={editingArticleId()}
                        editingArticleTitle={editingArticleTitle()}
                        onStartEditArticle={startEditArticle}
                        onCancelEditArticle={cancelEditArticle}
                        onSaveEditArticle={handleSaveArticle}
                        onSetEditingArticleTitle={setEditingArticleTitle}
                      />
                    )}
                  </For>
                </div>
              </div>
            )}
          </Show>
        </div>
      </Show>

      {/* FOOTER ĐÓNG SIDEBAR TRÊN MOBILE */}
      <div class="sidebar-footer mobile-only" style={{ "margin-top": "auto", "border-top": "1px solid var(--border-color)", padding: "1rem", "background-color": "var(--bg-primary)", position: "sticky", bottom: "0", "z-index": 40 }}>
        <button 
          onClick={() => {
            if (props.onClose) props.onClose();
          }}
          style={{ width: "100%", padding: "0.75rem", "background-color": "var(--bg-secondary)", color: "var(--text-primary)", "border-radius": "0.375rem", display: "flex", "align-items": "center", "justify-content": "center", gap: "0.5rem", "font-weight": "600", "font-size": "0.875rem" }}
        >
          <i class="fas fa-times"></i> Đóng Menu
        </button>
      </div>
    </nav>
  );
}
