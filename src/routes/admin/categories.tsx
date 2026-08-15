import { createSignal, createMemo, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, action, query, useAction, createAsync, revalidate } from "@solidjs/router";
import CustomSelect from "~/components/CustomSelect";
import { authService } from "~/server/services/auth.service";
import { categoryService } from "~/server/services/category.service";
import { Category, CategoryType } from "~/types/category.types";
import { generateSlug } from "~/utils/slug";

// =======================
// SERVER FUNCTIONS
// =======================
const getCategoriesServer = query(async () => {
  "use server";
  await authService.requireAuth();
  return await categoryService.getAllCategories();
}, "categories-list");

const addCategoryServer = action(
  async (data: { name: string; type: string; parentId: number | null; order: number }) => {
    "use server";
    await authService.requireAuth();
    await categoryService.createCategory({
      name: data.name,
      type: data.type as CategoryType,
      parentId: data.parentId,
      order: data.order,
    });
  }
);

const deleteCategoryServer = action(async (id: number) => {
  "use server";
  await authService.requireAuth();
  await categoryService.deleteCategory(id);
});

const updateCategoryServer = action(
  async (data: { id: number; name: string; type: string; parentId: number | null; order: number }) => {
    "use server";
    await authService.requireAuth();
    await categoryService.updateCategory({
      id: data.id,
      name: data.name,
      type: data.type as CategoryType,
      parentId: data.parentId,
      order: data.order,
    });
  }
);

// =======================
// COMPONENT
// =======================
export default function AdminCategories() {
  const categories = createAsync(() => getCategoriesServer());
  const addCategory = useAction(addCategoryServer);
  const deleteCategory = useAction(deleteCategoryServer);
  const updateCategory = useAction(updateCategoryServer);

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [name, setName] = createSignal("");
  const [type, setType] = createSignal<CategoryType>("group");
  const [parentId, setParentId] = createSignal<number | null>(null);
  const [order, setOrder] = createSignal(0);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [searchFilter, setSearchFilter] = createSignal("");
  const [expandedGroups, setExpandedGroups] = createSignal<Record<number, boolean>>({});

  const groups = createMemo(() => categories()?.filter((c) => c.type === "group") || []);
  const getCategoriesList = (groupId: number) =>
    categories()?.filter((c) => c.type === "category" && c.parentId === groupId) || [];
  const getChapters = (catId: number) =>
    categories()?.filter((c) => c.type === "chapter" && c.parentId === catId) || [];

  // Options for parent selector in form
  const parentOptions = createMemo(() => {
    const allCats = categories() || [];
    const t = type();
    if (t === "category") {
      return groups().map((g) => ({
        value: g.id,
        label: g.name,
        icon: "📁",
        badge: "Nhóm",
      }));
    } else if (t === "chapter") {
      const cats = allCats.filter((c) => c.type === "category");
      return cats.map((cat) => {
        const pGrp = groups().find((g) => g.id === cat.parentId);
        return {
          value: cat.id,
          label: cat.name,
          group: pGrp?.name ? `📁 Nhóm: ${pGrp.name}` : undefined,
          icon: "📂",
          badge: "Chuyên mục",
        };
      });
    }
    return [];
  });

  const openNewCategoryModal = (defaultType: CategoryType = "group", defaultParentId: number | null = null) => {
    setEditingId(null);
    setName("");
    setType(defaultType);
    setParentId(defaultParentId);
    setOrder(0);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setType(category.type);
    setParentId(category.parentId);
    setOrder(category.order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setName("");
    setType("group");
    setParentId(null);
    setOrder(0);
  };

  const handleQuickAddChild = (parentType: "group" | "category", pId: number) => {
    if (parentType === "group") {
      const existing = getCategoriesList(pId);
      openNewCategoryModal("category", pId);
      setOrder(existing.length + 1);
    } else {
      const existing = getChapters(pId);
      openNewCategoryModal("chapter", pId);
      setOrder(existing.length + 1);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name().trim()) return alert("Tên không được để trống");
    if (type() !== "group" && !parentId()) return alert("Vui lòng chọn cấp cha trực thuộc");

    setIsSubmitting(true);
    try {
      if (editingId()) {
        await updateCategory({
          id: editingId()!,
          name: name().trim(),
          type: type(),
          parentId: type() === "group" ? null : parentId(),
          order: Number(order()),
        });
      } else {
        await addCategory({
          name: name().trim(),
          type: type(),
          parentId: type() === "group" ? null : parentId(),
          order: Number(order()),
        });
      }

      closeModal();
      revalidate("categories-list");
    } catch (error) {
      console.error(error);
      alert(editingId() ? "Lỗi khi cập nhật danh mục" : "Lỗi khi thêm danh mục");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number, catName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa "${catName}"? Các mục con sẽ bị mồ côi nếu có.`)) return;
    try {
      await deleteCategory(id);
      if (editingId() === id) closeModal();
      revalidate("categories-list");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa danh mục");
    }
  };

  const previewSlug = () => generateSlug(name() || "ten-danh-muc");

  return (
    <div class="dash-root">
      <Title>Admin - Cấu trúc & Phân Cấp</Title>

      {/* 1. HERO BAR */}
      <header class="dash-hero-bar">
        <div class="dash-hero-main">
          <div class="dash-badge-row">
            <span class="dash-live-badge">
              <span class="dash-pulse-dot" />
              Kiến trúc Cây Phân Cấp
            </span>
            <span class="dash-meta-badge">{categories()?.length || 0} mục</span>
            <span class="dash-meta-badge">{groups().length} nhóm đề tài</span>
          </div>
          <h1 class="dash-heading">Cấu trúc & Cây Phân Cấp</h1>
          <p class="dash-subheading">
            Thiết kế kiến trúc 3 tầng: [1. Nhóm đề tài] › [2. Chuyên mục] › [3. Chương bài giảng].
          </p>
        </div>

        <div class="dash-actions-cluster">
          <button
            type="button"
            class="dash-btn dash-btn-primary"
            onClick={() => openNewCategoryModal("group")}
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Thêm Nhóm Đề Tài
          </button>
        </div>
      </header>

      {/* 2. SEARCH & CONTROLS TOOLBAR */}
      <div class="dash-card" style={{ padding: "0.85rem 1.25rem" }}>
        <div class="dash-toolbar-row">
          <div class="dash-search-box flex-1">
            <svg class="dash-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              class="dash-search-input"
              placeholder="Lọc nhanh danh mục, chuyên mục, chương..."
              value={searchFilter()}
              onInput={(e) => setSearchFilter(e.currentTarget.value)}
            />
            <Show when={searchFilter()}>
              <button class="dash-clear-btn" onClick={() => setSearchFilter("")}>
                &times;
              </button>
            </Show>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="dash-btn dash-btn-outline text-xs py-1.5 px-3"
              onClick={() => openNewCategoryModal("category")}
            >
              + Chuyên mục con
            </button>
            <button
              type="button"
              class="dash-btn dash-btn-outline text-xs py-1.5 px-3"
              onClick={() => openNewCategoryModal("chapter")}
            >
              + Chương bài giảng
            </button>
          </div>
        </div>
      </div>

      {/* 3. FULL-WIDTH TREE VIEW CARD */}
      <div class="dash-card">
        <Show
          when={groups().length > 0}
          fallback={
            <div class="dash-empty-state">
              <div class="text-4xl mb-2">🌳</div>
              <h3 class="dash-empty-title">Chưa có cây phân cấp nào</h3>
              <p class="dash-empty-desc">Hãy tạo Nhóm đề tài đầu tiên (VD: Game Development, Web Fullstack...).</p>
              <button
                class="dash-btn dash-btn-primary mt-4"
                onClick={() => openNewCategoryModal("group")}
              >
                + Thêm Nhóm Đề Tài Đầu Tiên
              </button>
            </div>
          }
        >
          <div class="cat-tree-root">
            <For each={groups()}>
              {(group) => {
                const groupCats = getCategoriesList(group.id);
                const isGroupExpanded = () => expandedGroups()[group.id] !== false;

                const toggleGroupExpand = () => {
                  setExpandedGroups((prev) => ({
                    ...prev,
                    [group.id]: !isGroupExpanded(),
                  }));
                };

                return (
                  <div class="cat-group-card">
                    {/* TIER 1: GROUP HEADER */}
                    <div class="cat-group-header">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          class="cat-chevron-btn"
                          onClick={toggleGroupExpand}
                          title={isGroupExpanded() ? "Thu gọn" : "Mở rộng"}
                        >
                          {isGroupExpanded() ? "▼" : "▶"}
                        </button>
                        <span class="cat-type-pill group">Tier 1: Nhóm</span>
                        <h3 class="cat-node-title font-bold text-slate-100">{group.name}</h3>
                        <span class="cat-order-pill font-mono">#{group.order}</span>
                      </div>

                      <div class="flex items-center gap-1.5">
                        <button
                          class="cat-action-btn primary"
                          onClick={() => handleQuickAddChild("group", group.id)}
                          title="Thêm Chuyên mục vào nhóm này"
                        >
                          + Chuyên mục
                        </button>
                        <button
                          class="cat-action-btn"
                          onClick={() => handleEdit(group)}
                          title="Chỉnh sửa nhóm"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          class="cat-action-btn danger"
                          onClick={() => handleDelete(group.id, group.name)}
                          title="Xóa nhóm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* TIER 2 & 3: CATEGORIES & CHAPTERS */}
                    <Show when={isGroupExpanded()}>
                      <div class="cat-group-content">
                        <Show
                          when={groupCats.length > 0}
                          fallback={
                            <div class="cat-empty-node">
                              <p>Chưa có chuyên mục con trong nhóm này.</p>
                              <button
                                class="text-xs text-sky-400 hover:underline mt-1"
                                onClick={() => handleQuickAddChild("group", group.id)}
                              >
                                + Thêm chuyên mục ngay
                              </button>
                            </div>
                          }
                        >
                          <div class="cat-categories-list">
                            <For each={groupCats}>
                              {(cat) => {
                                const catChapters = getChapters(cat.id);

                                return (
                                  <div class="cat-item-card">
                                    {/* CATEGORY HEADER */}
                                    <div class="cat-item-header">
                                      <div class="flex items-center gap-2 flex-1 min-w-0">
                                        <span class="cat-type-pill category">Tier 2: Chuyên mục</span>
                                        <h4 class="cat-node-title font-semibold text-sky-300">
                                          {cat.name}
                                        </h4>
                                        <span class="cat-slug-text">/{cat.slug}</span>
                                        <span class="cat-order-pill font-mono">#{cat.order}</span>
                                      </div>

                                      <div class="flex items-center gap-1.5">
                                        <button
                                          class="cat-action-btn primary text-xs"
                                          onClick={() => handleQuickAddChild("category", cat.id)}
                                          title="Thêm Chương bài giảng vào chuyên mục này"
                                        >
                                          + Chương
                                        </button>
                                        <button
                                          class="cat-action-btn text-xs"
                                          onClick={() => handleEdit(cat)}
                                          title="Sửa chuyên mục"
                                        >
                                          ✏️ Sửa
                                        </button>
                                        <button
                                          class="cat-action-btn danger text-xs"
                                          onClick={() => handleDelete(cat.id, cat.name)}
                                          title="Xóa chuyên mục"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>

                                    {/* CHAPTERS LIST */}
                                    <Show when={catChapters.length > 0}>
                                      <div class="cat-chapters-list">
                                        <For each={catChapters}>
                                          {(chap) => (
                                            <div class="cat-chapter-row">
                                              <div class="flex items-center gap-2 flex-1 min-w-0">
                                                <span class="cat-type-pill chapter">Tier 3: Chương</span>
                                                <span class="cat-chap-name font-medium text-slate-200">
                                                  {chap.name}
                                                </span>
                                                <span class="cat-order-pill font-mono">#{chap.order}</span>
                                              </div>

                                              <div class="flex items-center gap-1">
                                                <A
                                                  href={`/admin/articles?chapterId=${chap.id}`}
                                                  class="cat-action-btn text-[11px] text-emerald-400"
                                                  title="Xem danh sách bài viết trong chương này"
                                                >
                                                  📝 Bài viết
                                                </A>
                                                <button
                                                  class="cat-action-btn text-[11px]"
                                                  onClick={() => handleEdit(chap)}
                                                  title="Sửa chương"
                                                >
                                                  ✏️ Sửa
                                                </button>
                                                <button
                                                  class="cat-action-btn danger text-[11px]"
                                                  onClick={() => handleDelete(chap.id, chap.name)}
                                                  title="Xóa chương"
                                                >
                                                  🗑️
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </For>
                                      </div>
                                    </Show>
                                  </div>
                                );
                              }}
                            </For>
                          </div>
                        </Show>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>

      {/* 4. POPUP MODAL: ADD / EDIT CATEGORY WITH CUSTOM SELECT */}
      <Show when={isModalOpen()}>
        <div class="admin-modal-backdrop" onClick={closeModal}>
          <div class="admin-modal-dialog" style={{ "max-width": "540px" }} onClick={(e) => e.stopPropagation()}>
            {/* MODAL HEADER */}
            <div class="admin-modal-header">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">{editingId() ? "✏️" : "📂"}</span>
                <div>
                  <h3 class="admin-modal-title">
                    {editingId() ? `Chỉnh sửa: "${name()}"` : "Thêm Mục Phân Cấp"}
                  </h3>
                  <p class="admin-modal-subtitle">
                    Thiết lập phân cấp, chuyên mục cha và thứ tự sắp xếp
                  </p>
                </div>
              </div>
              <button class="admin-modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            {/* MODAL FORM BODY */}
            <form onSubmit={handleSubmit} class="admin-modal-body">
              {/* TIER SEGMENTED SELECTOR */}
              <div>
                <label class="form-label font-semibold">Cấp bậc phân cấp (Tier) *</label>
                <div class="cat-tier-selector">
                  <button
                    type="button"
                    class={`cat-tier-btn ${type() === "group" ? "active" : ""}`}
                    onClick={() => {
                      setType("group");
                      setParentId(null);
                    }}
                  >
                    1. Nhóm (Group)
                  </button>
                  <button
                    type="button"
                    class={`cat-tier-btn ${type() === "category" ? "active" : ""}`}
                    onClick={() => setType("category")}
                  >
                    2. Chuyên mục
                  </button>
                  <button
                    type="button"
                    class={`cat-tier-btn ${type() === "chapter" ? "active" : ""}`}
                    onClick={() => setType("chapter")}
                  >
                    3. Chương (Chapter)
                  </button>
                </div>
              </div>

              {/* PARENT SELECTOR (CUSTOM SELECT) */}
              <Show when={type() !== "group"}>
                <div>
                  <label class="form-label font-semibold">
                    {type() === "category" ? "Trực thuộc Nhóm Đề Tài *" : "Trực thuộc Chuyên Mục *"}
                  </label>
                  <CustomSelect
                    options={parentOptions()}
                    value={parentId() || ""}
                    onChange={(val) => setParentId(val ? Number(val) : null)}
                    placeholder={type() === "category" ? "-- Chọn Nhóm cha --" : "-- Chọn Chuyên mục cha --"}
                    searchable={true}
                    size="md"
                  />
                </div>
              </Show>

              {/* NAME & ORDER */}
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-2">
                  <label class="form-label font-semibold">Tên mục phân cấp *</label>
                  <input
                    type="text"
                    class="form-input"
                    value={name()}
                    onInput={(e) => setName(e.target.value)}
                    placeholder="VD: Godot 4 2D, Raylib..."
                    required
                  />
                  <div class="text-[11px] text-slate-400 mt-1 font-mono">
                    Slug: <span class="text-sky-400 font-semibold">/{previewSlug()}</span>
                  </div>
                </div>

                <div>
                  <label class="form-label font-semibold">Thứ tự (#)</label>
                  <input
                    type="number"
                    class="form-input"
                    value={order()}
                    onInput={(e) => setOrder(Number(e.target.value))}
                    required
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
                  disabled={isSubmitting()}
                >
                  {isSubmitting() ? "Đang lưu..." : editingId() ? "Lưu thay đổi" : "Tạo mục mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
