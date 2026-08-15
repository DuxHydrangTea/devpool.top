import { createSignal, createMemo, For, Show, createEffect } from "solid-js";
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
  return await categoryService.getAllCategoriesWithStats();
}, "categories-list");

const addCategoryServer = action(
  async (data: { name: string; type: string; parentId: number | null; order: number; isHidden: number }) => {
    "use server";
    await authService.requireAuth();
    await categoryService.createCategory({
      name: data.name,
      type: data.type as CategoryType,
      parentId: data.parentId,
      order: data.order,
      isHidden: data.isHidden,
    });
  }
);

const deleteCategoryServer = action(async (id: number) => {
  "use server";
  await authService.requireAuth();
  await categoryService.deleteCategory(id);
});

const updateCategoryServer = action(
  async (data: { id: number; name: string; type: string; parentId: number | null; order: number; isHidden: number }) => {
    "use server";
    await authService.requireAuth();
    await categoryService.updateCategory({
      id: data.id,
      name: data.name,
      type: data.type as CategoryType,
      parentId: data.parentId,
      order: data.order,
      isHidden: data.isHidden,
    });
  }
);

const toggleCategoryVisibilityServer = action(
  async (data: { id: number; isHidden: number }) => {
    "use server";
    await authService.requireAuth();
    await categoryService.toggleCategoryVisibility(data.id, data.isHidden);
  }
);

// =======================
// COMPONENT
// =======================
export default function AdminCategories() {
  const categoriesData = createAsync(() => getCategoriesServer());
  const addCategory = useAction(addCategoryServer);
  const deleteCategory = useAction(deleteCategoryServer);
  const updateCategory = useAction(updateCategoryServer);
  const toggleVisibility = useAction(toggleCategoryVisibilityServer);

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [name, setName] = createSignal("");
  const [type, setType] = createSignal<CategoryType>("group");
  const [parentId, setParentId] = createSignal<number | null>(null);
  const [order, setOrder] = createSignal(0);
  const [isHidden, setIsHidden] = createSignal(0);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Filter Toolbar State
  const [searchFilter, setSearchFilter] = createSignal("");
  const [selectedGroupFilter, setSelectedGroupFilter] = createSignal<string>("all");
  const [selectedTierFilter, setSelectedTierFilter] = createSignal<string>("all");
  const [selectedVisibilityFilter, setSelectedVisibilityFilter] = createSignal<string>("all");
  const [expandedGroups, setExpandedGroups] = createSignal<Record<number, boolean>>({});

  const allCategories = () => categoriesData()?.categories || [];
  const directCounts = () => categoriesData()?.articleCounts || {};
  const groups = createMemo(() => allCategories().filter((c) => c.type === "group"));

  // Fast map to check if any ancestor is hidden
  const hiddenAncestorMap = createMemo(() => {
    const all = allCategories();
    const catMap = new Map<number, Category>(all.map((c) => [c.id, c]));
    const result = new Map<number, boolean>();

    const checkHiddenAncestor = (catId: number): boolean => {
      const cat = catMap.get(catId);
      if (!cat || cat.parentId === null) return false;
      const parent = catMap.get(cat.parentId);
      if (!parent) return false;
      if (parent.isHidden === 1) return true;
      return checkHiddenAncestor(parent.id);
    };

    for (const cat of all) {
      result.set(cat.id, checkHiddenAncestor(cat.id));
    }
    return result;
  });

  // Recursive Article Count Memo for every category ID (Tier 1, Tier 2, Tier 3)
  const recursiveArticleCounts = createMemo(() => {
    const all = allCategories();
    const counts = directCounts();
    const childrenMap = new Map<number, number[]>();

    for (const c of all) {
      if (c.parentId !== null) {
        const list = childrenMap.get(c.parentId) || [];
        list.push(c.id);
        childrenMap.set(c.parentId, list);
      }
    }

    const resultMap = new Map<number, number>();

    const computeCount = (id: number): number => {
      if (resultMap.has(id)) return resultMap.get(id)!;

      let total = counts[id] || 0;
      const children = childrenMap.get(id) || [];
      for (const childId of children) {
        total += computeCount(childId);
      }

      resultMap.set(id, total);
      return total;
    };

    for (const c of all) {
      computeCount(c.id);
    }

    return resultMap;
  });

  // Expand all groups automatically when searching
  createEffect(() => {
    const query = searchFilter().trim();
    if (query) {
      const exp: Record<number, boolean> = {};
      for (const g of groups()) {
        exp[g.id] = true;
      }
      setExpandedGroups(exp);
    }
  });

  // Matcher for a single item
  const isItemMatch = (item: Category, query: string, tier: string, vis: string) => {
    // 1. Check Query
    if (query) {
      const nameMatch = item.name.toLowerCase().includes(query);
      const slugMatch = (item.slug || "").toLowerCase().includes(query);
      if (!nameMatch && !slugMatch) return false;
    }

    // 2. Check Tier
    if (tier !== "all" && item.type !== tier) {
      return false;
    }

    // 3. Check Visibility
    const isDirectHidden = item.isHidden === 1;
    const isAncestorHidden = hiddenAncestorMap().get(item.id) === true;
    const isEffectiveHidden = isDirectHidden || isAncestorHidden;

    if (vis === "visible" && isEffectiveHidden) return false;
    if (vis === "hidden" && !isEffectiveHidden) return false;

    return true;
  };

  // Pre-index categories by parent ID
  const categoriesByParent = createMemo(() => {
    const map = new Map<number | null, Category[]>();
    for (const c of allCategories()) {
      const list = map.get(c.parentId) || [];
      list.push(c);
      map.set(c.parentId, list);
    }
    return map;
  });

  const getRawCategoriesList = (groupId: number) =>
    categoriesByParent().get(groupId)?.filter((c) => c.type === "category") || [];

  const getRawChapters = (catId: number) =>
    categoriesByParent().get(catId)?.filter((c) => c.type === "chapter") || [];

  // Filtered Chapters for a category
  const getFilteredChapters = (catId: number) => {
    const chaps = getRawChapters(catId);
    const q = searchFilter().toLowerCase().trim();
    const tier = selectedTierFilter();
    const vis = selectedVisibilityFilter();

    if (!q && tier === "all" && vis === "all") return chaps;

    return chaps.filter((ch) => isItemMatch(ch, q, tier, vis));
  };

  // Filtered Categories for a group
  const getFilteredCategoriesList = (groupId: number) => {
    const cats = getRawCategoriesList(groupId);
    const q = searchFilter().toLowerCase().trim();
    const tier = selectedTierFilter();
    const vis = selectedVisibilityFilter();

    if (!q && tier === "all" && vis === "all") return cats;

    return cats.filter((cat) => {
      if (isItemMatch(cat, q, tier, vis)) return true;
      const matchingChaps = getFilteredChapters(cat.id);
      return matchingChaps.length > 0;
    });
  };

  // Filtered Groups
  const filteredGroups = createMemo(() => {
    const grps = groups();
    const grpFilter = selectedGroupFilter();
    const q = searchFilter().toLowerCase().trim();
    const tier = selectedTierFilter();
    const vis = selectedVisibilityFilter();

    return grps.filter((g) => {
      if (grpFilter !== "all" && String(g.id) !== grpFilter) {
        return false;
      }

      if (!q && tier === "all" && vis === "all") return true;

      if (isItemMatch(g, q, tier, vis)) return true;

      const matchingCats = getFilteredCategoriesList(g.id);
      return matchingCats.length > 0;
    });
  });

  // Total matching stats
  const totalMatchingItems = createMemo(() => {
    let count = 0;
    for (const g of filteredGroups()) {
      const q = searchFilter().toLowerCase().trim();
      const tier = selectedTierFilter();
      const vis = selectedVisibilityFilter();

      if (isItemMatch(g, q, tier, vis)) count++;
      const cats = getFilteredCategoriesList(g.id);
      for (const cat of cats) {
        if (isItemMatch(cat, q, tier, vis)) count++;
        const chaps = getFilteredChapters(cat.id);
        count += chaps.length;
      }
    }
    return count;
  });

  // Group Select Options for Toolbar
  const groupFilterOptions = createMemo(() => {
    const opts: Array<{ value: string | number; label: string; icon?: string }> = [
      { value: "all", label: `Tất cả các nhóm (${groups().length})`, icon: "🌐" },
    ];
    for (const g of groups()) {
      opts.push({
        value: String(g.id),
        label: `${g.name} (${recursiveArticleCounts().get(g.id) || 0} bài)`,
        icon: "📁",
      });
    }
    return opts;
  });

  // Options for parent selector in form
  const parentOptions = createMemo(() => {
    const allCats = allCategories();
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
    setIsHidden(0);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setType(category.type);
    setParentId(category.parentId);
    setOrder(category.order);
    setIsHidden(category.isHidden || 0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setName("");
    setType("group");
    setParentId(null);
    setOrder(0);
    setIsHidden(0);
  };

  const handleQuickAddChild = (parentType: "group" | "category", pId: number) => {
    if (parentType === "group") {
      const existing = getRawCategoriesList(pId);
      openNewCategoryModal("category", pId);
      setOrder(existing.length + 1);
    } else {
      const existing = getRawChapters(pId);
      openNewCategoryModal("chapter", pId);
      setOrder(existing.length + 1);
    }
  };

  const handleToggleHide = async (category: Category) => {
    const nextHidden = category.isHidden === 1 ? 0 : 1;
    try {
      await toggleVisibility({ id: category.id, isHidden: nextHidden });
      revalidate("categories-list");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi chuyển trạng thái ẩn/hiện");
    }
  };

  const handleExpandAll = () => {
    const exp: Record<number, boolean> = {};
    for (const g of groups()) {
      exp[g.id] = true;
    }
    setExpandedGroups(exp);
  };

  const handleCollapseAll = () => {
    const exp: Record<number, boolean> = {};
    for (const g of groups()) {
      exp[g.id] = false;
    }
    setExpandedGroups(exp);
  };

  const handleResetFilters = () => {
    setSearchFilter("");
    setSelectedGroupFilter("all");
    setSelectedTierFilter("all");
    setSelectedVisibilityFilter("all");
  };

  const hasActiveFilters = () =>
    searchFilter().trim() !== "" ||
    selectedGroupFilter() !== "all" ||
    selectedTierFilter() !== "all" ||
    selectedVisibilityFilter() !== "all";

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
          isHidden: isHidden(),
        });
      } else {
        await addCategory({
          name: name().trim(),
          type: type(),
          parentId: type() === "group" ? null : parentId(),
          order: Number(order()),
          isHidden: isHidden(),
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
            <span class="dash-meta-badge">{allCategories().length} mục tổng thể</span>
            <span class="dash-meta-badge">{groups().length} nhóm đề tài</span>
            <Show when={hasActiveFilters()}>
              <span class="dash-meta-badge text-amber-300 border-amber-500/40">
                🔍 Khớp: {totalMatchingItems()} mục
              </span>
            </Show>
          </div>
          <h1 class="dash-heading">Cấu trúc & Cây Phân Cấp</h1>
          <p class="dash-subheading">
            Thiết kế kiến trúc 3 tầng: [1. Nhóm đề tài] › [2. Chuyên mục] › [3. Chương bài giảng]. Hiển thị số lượng bài viết đệ quy chuẩn xác.
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

      {/* 2. MULTI-FACETED FILTER TOOLBAR */}
      <div class="dash-card" style={{ padding: "0.85rem 1.25rem", position: "relative", "z-index": 40 }}>
        <div class="flex flex-col gap-3">
          {/* Row 1: Search Box & Dropdown Filters */}
          <div class="dash-toolbar-row">
            {/* Search Input */}
            <div class="dash-search-box flex-1 min-w-[220px]">
              <svg class="dash-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                class="dash-search-input"
                placeholder="Tìm kiếm mục theo tên, slug..."
                value={searchFilter()}
                onInput={(e) => setSearchFilter(e.currentTarget.value)}
              />
              <Show when={searchFilter()}>
                <button class="dash-clear-btn" onClick={() => setSearchFilter("")}>
                  &times;
                </button>
              </Show>
            </div>

            {/* Filter by Group (Custom Select) */}
            <div class="dash-select-filter" style={{ "min-width": "220px" }}>
              <span class="dash-select-filter-label">Nhóm:</span>
              <div style={{ flex: "1" }}>
                <CustomSelect
                  options={groupFilterOptions()}
                  value={selectedGroupFilter()}
                  onChange={(val) => setSelectedGroupFilter(String(val || "all"))}
                  placeholder="-- Tất cả các nhóm --"
                  searchable={true}
                  size="sm"
                />
              </div>
            </div>

            {/* Filter by Tier */}
            <div class="dash-select-filter" style={{ "min-width": "160px" }}>
              <span class="dash-select-filter-label">Cấp bậc:</span>
              <select
                class="admin-page-size-select"
                value={selectedTierFilter()}
                onChange={(e) => setSelectedTierFilter(e.currentTarget.value)}
              >
                <option value="all">Tất cả cấp bậc</option>
                <option value="group">Tier 1: Nhóm</option>
                <option value="category">Tier 2: Chuyên mục</option>
                <option value="chapter">Tier 3: Chương</option>
              </select>
            </div>

            {/* Filter by Visibility */}
            <div class="dash-select-filter" style={{ "min-width": "160px" }}>
              <span class="dash-select-filter-label">Trạng thái:</span>
              <select
                class="admin-page-size-select"
                value={selectedVisibilityFilter()}
                onChange={(e) => setSelectedVisibilityFilter(e.currentTarget.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="visible">👁️ Đang hiển thị</option>
                <option value="hidden">🚫 Đang bị ẩn</option>
              </select>
            </div>
          </div>

          {/* Row 2: Quick Action Buttons & Status Summary */}
          <div class="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/60 text-xs">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="dash-btn dash-btn-ghost text-xs py-1 px-2.5"
                onClick={handleExpandAll}
                title="Mở rộng tất cả các nhóm"
              >
                ▼ Mở rộng tất cả
              </button>
              <button
                type="button"
                class="dash-btn dash-btn-ghost text-xs py-1 px-2.5"
                onClick={handleCollapseAll}
                title="Thu gọn tất cả các nhóm"
              >
                ▲ Thu gọn tất cả
              </button>

              <Show when={hasActiveFilters()}>
                <button
                  type="button"
                  class="dash-btn dash-btn-outline text-xs py-1 px-2.5 text-amber-400 border-amber-500/40 hover:bg-amber-950/40"
                  onClick={handleResetFilters}
                  title="Xóa tất cả các bộ lọc đang áp dụng"
                >
                  ✕ Xóa bộ lọc
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
      </div>

      {/* 3. FULL-WIDTH TREE VIEW CARD */}
      <div class="dash-card">
        <Show
          when={filteredGroups().length > 0}
          fallback={
            <div class="dash-empty-state">
              <div class="text-4xl mb-2">🔍</div>
              <h3 class="dash-empty-title">Không tìm thấy mục phân cấp nào phù hợp</h3>
              <p class="dash-empty-desc">
                Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc cấp bậc / trạng thái.
              </p>
              <Show when={hasActiveFilters()}>
                <button class="dash-btn dash-btn-primary mt-4" onClick={handleResetFilters}>
                  ✕ Xóa tất cả bộ lọc
                </button>
              </Show>
            </div>
          }
        >
          <div class="cat-tree-root">
            <For each={filteredGroups()}>
              {(group) => {
                const groupCats = () => getFilteredCategoriesList(group.id);
                const isGroupExpanded = () => expandedGroups()[group.id] !== false;
                const groupArticleCount = () => recursiveArticleCounts().get(group.id) || 0;

                const toggleGroupExpand = () => {
                  setExpandedGroups((prev) => ({
                    ...prev,
                    [group.id]: !isGroupExpanded(),
                  }));
                };

                return (
                  <div class={`cat-group-card ${group.isHidden === 1 ? "opacity-75 border-dashed border-amber-500/50" : ""}`}>
                    {/* TIER 1: GROUP HEADER */}
                    <div class="cat-group-header">
                      <div class="flex items-center gap-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
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

                        {/* Recursive Article Count Badge */}
                        <span class="cat-art-count-badge group" title="Tổng số bài viết đệ quy trong toàn bộ nhóm này">
                          📝 {groupArticleCount()} bài
                        </span>

                        {/* Visibility Status Badge */}
                        <Show
                          when={group.isHidden === 1}
                          fallback={
                            <span class="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              👁️ Hiển thị
                            </span>
                          }
                        >
                          <span class="text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🚫 Đang ẩn (Ẩn toàn bộ con)
                          </span>
                        </Show>
                      </div>

                      <div class="flex items-center gap-2">
                        {/* Quick Toggle Button */}
                        <button
                          type="button"
                          class={`cat-action-btn ${group.isHidden === 1 ? "text-amber-400 hover:text-emerald-400" : "text-slate-400 hover:text-amber-400"}`}
                          onClick={() => handleToggleHide(group)}
                          title={group.isHidden === 1 ? "Bấm để MỞ HIỂN THỊ nhóm này" : "Bấm để ẨN nhóm này và toàn bộ con"}
                        >
                          {group.isHidden === 1 ? "👁️ Mở hiện" : "🚫 Ẩn"}
                        </button>

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
                          ✏️
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
                          when={groupCats().length > 0}
                          fallback={
                            <div class="cat-empty-node">
                              <p>Chưa có chuyên mục con phù hợp trong nhóm này.</p>
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
                            <For each={groupCats()}>
                              {(cat) => {
                                const catChapters = () => getFilteredChapters(cat.id);
                                const isParentHidden = () => group.isHidden === 1;
                                const catArticleCount = () => recursiveArticleCounts().get(cat.id) || 0;

                                return (
                                  <div class={`cat-item-card ${cat.isHidden === 1 || isParentHidden() ? "opacity-75" : ""}`}>
                                    {/* CATEGORY HEADER */}
                                    <div class="cat-item-header">
                                      <div class="flex items-center gap-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
                                        <span class="cat-type-pill category">Tier 2: Chuyên mục</span>
                                        <h4 class="cat-node-title font-semibold text-sky-300">
                                          {cat.name}
                                        </h4>
                                        <span class="cat-slug-text">/{cat.slug}</span>
                                        <span class="cat-order-pill font-mono">#{cat.order}</span>

                                        {/* Recursive Article Count Badge */}
                                        <span class="cat-art-count-badge category" title="Tổng số bài viết đệ quy trong chuyên mục này">
                                          📝 {catArticleCount()} bài
                                        </span>

                                        {/* Status */}
                                        <Show when={isParentHidden()}>
                                          <span class="text-[10px] text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">
                                            ⚠️ Ẩn do Nhóm cha ẩn
                                          </span>
                                        </Show>
                                        <Show when={!isParentHidden() && cat.isHidden === 1}>
                                          <span class="text-[10px] text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">
                                            🚫 Đang ẩn
                                          </span>
                                        </Show>
                                      </div>

                                      <div class="flex items-center gap-2">
                                        {/* Quick Toggle Button */}
                                        <button
                                          type="button"
                                          class="cat-action-btn text-xs"
                                          onClick={() => handleToggleHide(cat)}
                                          title={cat.isHidden === 1 ? "Bấm để MỞ HIỂN THỊ" : "Bấm để ẨN chuyên mục này"}
                                        >
                                          {cat.isHidden === 1 ? "👁️ Mở" : "🚫 Ẩn"}
                                        </button>

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
                                          ✏️
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
                                    <Show when={catChapters().length > 0}>
                                      <div class="cat-chapters-list">
                                        <For each={catChapters()}>
                                          {(chap) => {
                                            const isAncestorHidden = () => isParentHidden() || cat.isHidden === 1;
                                            const chapArticleCount = () => recursiveArticleCounts().get(chap.id) || 0;

                                            return (
                                              <div class={`cat-chapter-row ${chap.isHidden === 1 || isAncestorHidden() ? "opacity-75" : ""}`}>
                                                <div class="flex items-center gap-2 flex-1 min-w-0">
                                                  <span class="cat-type-pill chapter">Tier 3: Chương</span>
                                                  <span class="cat-chap-name font-medium text-slate-200">
                                                    {chap.name}
                                                  </span>
                                                  <span class="cat-order-pill font-mono">#{chap.order}</span>

                                                  {/* Article Count Badge */}
                                                  <span class="cat-art-count-badge chapter" title="Số bài viết trong chương này">
                                                    📝 {chapArticleCount()} bài
                                                  </span>

                                                  {/* Status */}
                                                  <Show when={isAncestorHidden()}>
                                                    <span class="text-[10px] text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">
                                                      ⚠️ Ẩn do cấp cha ẩn
                                                    </span>
                                                  </Show>
                                                  <Show when={!isAncestorHidden() && chap.isHidden === 1}>
                                                    <span class="text-[10px] text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">
                                                      🚫 Đang ẩn
                                                    </span>
                                                  </Show>
                                                </div>

                                                <div class="flex items-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    class="cat-action-btn text-[11px]"
                                                    onClick={() => handleToggleHide(chap)}
                                                    title={chap.isHidden === 1 ? "Bấm để MỞ HIỂN THỊ" : "Bấm để ẨN chương này"}
                                                  >
                                                    {chap.isHidden === 1 ? "👁️ Mở" : "🚫 Ẩn"}
                                                  </button>
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
                                                    ✏️
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
                                            );
                                          }}
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
                    Thiết lập phân cấp, chuyên mục cha, trạng thái ẩn/hiện và thứ tự
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

              {/* VISIBILITY CHECKBOX */}
              <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div class="text-xs font-semibold text-slate-200">Ẩn khỏi giao diện người dùng (Client)</div>
                  <div class="text-[11px] text-slate-400">
                    Khi bật, toàn bộ các chuyên mục con và bài viết con thuộc mục này cũng sẽ tự động bị ẩn.
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
