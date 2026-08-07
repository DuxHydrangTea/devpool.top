import { createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, action, query, useAction, createAsync, revalidate } from "@solidjs/router";
import { db } from "~/lib/turso";
import { categories as categoriesSchema } from "~/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "~/lib/auth";

export type CategoryType = "group" | "category" | "chapter";

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  parentId: number | null;
  order: number;
}

// =======================
// SERVER FUNCTIONS
// =======================
const getCategoriesServer = query(async () => {
  "use server";
  await requireAuth();
  const categories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
  return categories.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type as CategoryType,
    parentId: c.parentId,
    order: c.order
  }));
}, "categories-list");

function generateSlug(text: string) {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const addCategoryServer = action(async (data: { name: string, type: string, parentId: number | null, order: number }) => {
  "use server";
  await requireAuth();
  await db.insert(categoriesSchema).values({
    name: data.name,
    type: data.type,
    parentId: data.parentId,
    order: data.order,
    slug: generateSlug(data.name)
  });
});

const deleteCategoryServer = action(async (id: number) => {
  "use server";
  await requireAuth();
  await db.delete(categoriesSchema).where(eq(categoriesSchema.id, id));
});

const updateCategoryServer = action(async (data: { id: number, name: string, type: string, parentId: number | null, order: number }) => {
  "use server";
  await requireAuth();
  await db.update(categoriesSchema).set({
    name: data.name,
    type: data.type,
    parentId: data.parentId,
    order: data.order,
    slug: generateSlug(data.name)
  }).where(eq(categoriesSchema.id, data.id));
});

// =======================
// COMPONENT
// =======================
export default function AdminCategories() {
  const categories = createAsync(() => getCategoriesServer());
  const addCategory = useAction(addCategoryServer);
  const deleteCategory = useAction(deleteCategoryServer);

  // Form state
  const [name, setName] = createSignal("");
  const [type, setType] = createSignal<CategoryType>("group");
  const [parentId, setParentId] = createSignal<number | null>(null);
  const [order, setOrder] = createSignal(0);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  
  const updateCategory = useAction(updateCategoryServer);
  const [editingId, setEditingId] = createSignal<number | null>(null);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setType(category.type);
    setParentId(category.parentId);
    setOrder(category.order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setType("group");
    setParentId(null);
    setOrder(0);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name().trim()) return alert("Tên không được để trống");

    setIsSubmitting(true);
    try {
      if (editingId()) {
        await updateCategory({
          id: editingId()!,
          name: name().trim(),
          type: type(),
          parentId: type() === "group" ? null : parentId(),
          order: Number(order())
        });
        alert("Cập nhật danh mục thành công!");
      } else {
        await addCategory({
          name: name().trim(),
          type: type(),
          parentId: type() === "group" ? null : parentId(),
          order: Number(order())
        });
      }
      
      // Reset form
      cancelEdit();
      revalidate("categories-list");
    } catch (error) {
      console.error(error);
      alert(editingId() ? "Lỗi khi cập nhật danh mục" : "Lỗi khi thêm danh mục");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa? Các mục con sẽ bị mồ côi nếu có.")) return;
    try {
      await deleteCategory(id);
      revalidate("categories-list");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa");
    }
  };

  const groups = () => categories()?.filter(c => c.type === "group") || [];
  const getCategoriesList = (groupId: number) => categories()?.filter(c => c.type === "category" && c.parentId === groupId) || [];
  const getChapters = (catId: number) => categories()?.filter(c => c.type === "chapter" && c.parentId === catId) || [];

  return (
    <div class="admin-container">
      <Title>Admin - Quản lý Danh Mục (Turso)</Title>

      <div class="admin-header">
        <h1 class="admin-title">Quản lý Cấu trúc (Turso)</h1>
        <A href="/admin/articles" class="btn btn-secondary">
          Quản lý Bài viết &rarr;
        </A>
      </div>

      <div class="admin-grid">

        {/* FORM THÊM MỚI */}
        <div class="card" style={{ "align-self": "start", position: editingId() ? "sticky" : "static", top: "20px" }}>
          <h2 class="card-title">{editingId() ? "Sửa Danh Mục" : "Thêm Danh Mục Mới"}</h2>
          <form onSubmit={handleSubmit} class="flex-col gap-4">

            <div class="form-group">
              <label class="form-label">Loại danh mục</label>
              <select
                class="form-input"
                value={type()}
                onChange={(e) => {
                  setType(e.target.value as CategoryType);
                  setParentId(null);
                }}
              >
                <option value="group">Nhóm (Group - Tab)</option>
                <option value="category">Nội dung chung (Category)</option>
                <option value="chapter">Chương (Chapter)</option>
              </select>
            </div>

            <Show when={type() === "category"}>
              <div class="form-group">
                <label class="form-label">Chọn Nhóm Cha</label>
                <select
                  class="form-input"
                  value={parentId() || ""}
                  onChange={(e) => setParentId(Number(e.target.value))}
                  required
                >
                  <option value="" disabled>-- Chọn Nhóm --</option>
                  <For each={groups()}>
                    {g => <option value={g.id}>{g.name}</option>}
                  </For>
                </select>
              </div>
            </Show>

            <Show when={type() === "chapter"}>
              <div class="form-group">
                <label class="form-label">Chọn Nội dung chung Cha</label>
                <select
                  class="form-input"
                  value={parentId() || ""}
                  onChange={(e) => setParentId(Number(e.target.value))}
                  required
                >
                  <option value="" disabled>-- Chọn Nội dung chung --</option>
                  <For each={groups()}>
                    {(group) => {
                      const groupCats = categories()?.filter(c => c.type === "category" && c.parentId === group.id) || [];
                      if (groupCats.length === 0) return null;
                      return (
                        <optgroup label={`Nhóm: ${group.name}`}>
                          <For each={groupCats}>
                            {(cat) => <option value={cat.id}>{cat.name}</option>}
                          </For>
                        </optgroup>
                      );
                    }}
                  </For>
                </select>
              </div>
            </Show>

            <div class="form-group">
              <label class="form-label">Tên hiển thị</label>
              <input
                type="text"
                class="form-input"
                value={name()}
                onInput={(e) => setName(e.target.value)}
                placeholder="VD: Godot 2D"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Số thứ tự (Order)</label>
              <input
                type="number"
                class="form-input"
                value={order()}
                onInput={(e) => setOrder(Number(e.target.value))}
                required
              />
            </div>

            <div class="flex items-center gap-2 mt-4">
              <button
                type="submit"
                disabled={isSubmitting()}
                class="btn btn-primary flex-1"
              >
                {isSubmitting() ? "Đang lưu..." : (editingId() ? "Cập nhật" : "Thêm danh mục")}
              </button>
              <Show when={editingId()}>
                <button
                  type="button"
                  onClick={cancelEdit}
                  class="btn btn-secondary flex-1"
                >
                  Hủy Sửa
                </button>
              </Show>
            </div>
          </form>
        </div>

        {/* TREE VIEW */}
        <div class="card col-span-2">
          <h2 class="card-title">Cấu trúc hiện tại</h2>
          <Show when={!categories()}>
            <div class="pulse-text mb-4">Đang tải dữ liệu SQL...</div>
          </Show>

          <div>
            <For each={groups()}>
              {(group) => (
                <div class="tree-node">
                  <div class="tree-node-header">
                    <span class="tree-node-title">[{group.order}] {group.name} (Nhóm)</span>
                    <div class="flex gap-2">
                      <button onClick={() => handleEdit(group as unknown as Category)} class="badge-info text-xs p-1">Sửa</button>
                      <button onClick={() => handleDelete(group.id)} class="btn-danger-text text-xs p-1">Xóa</button>
                    </div>
                  </div>

                  <div class="tree-children">
                    <For each={getCategoriesList(group.id)}>
                      {(cat) => (
                        <div class="tree-child-node">
                          <div class="tree-child-header">
                            <span class="tree-child-title">[{cat.order}] {cat.name} (Chuyên mục)</span>
                            <div class="flex gap-2">
                              <button onClick={() => handleEdit(cat as unknown as Category)} class="badge-info text-xs p-1">Sửa</button>
                              <button onClick={() => handleDelete(cat.id)} class="btn-danger-text text-xs p-1">Xóa</button>
                            </div>
                          </div>

                          <div>
                            <For each={getChapters(cat.id)}>
                              {(chap) => (
                                <div class="tree-child-item">
                                  <span>[{chap.order}] {chap.name}</span>
                                  <div class="flex gap-2">
                                    <button onClick={() => handleEdit(chap as unknown as Category)} class="badge-info text-xs p-1">Sửa</button>
                                    <button onClick={() => handleDelete(chap.id)} class="btn-danger-text text-xs p-1">Xóa</button>
                                  </div>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

      </div>
    </div>
  );
}
