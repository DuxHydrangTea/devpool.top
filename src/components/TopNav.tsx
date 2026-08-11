import { For, Show, createSignal } from "solid-js";
import { A, useAction, revalidate } from "@solidjs/router";
import { updateCategoryNameServer } from "~/app";

interface Group {
  id: number;
  name: string;
}

export default function TopNav(props: {
  groups: Group[];
  activeGroupId: number | null;
  setActiveGroupId: (id: number) => void;
  pageTitle: string;
  isAdmin?: boolean;
}) {
  const updateCategoryName = useAction(updateCategoryNameServer);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [editingName, setEditingName] = createSignal<string>("");

  const startEdit = (group: Group) => {
    setEditingId(group.id);
    setEditingName(group.name);
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

  return (
    <header class="top-nav">
      <div class="top-nav-brand">
        <A href="/" class="brand-link">
          {props.pageTitle}
        </A>
      </div>

      <div class="top-nav-tabs">
        <For each={props.groups}>
          {(group) => (
            <Show
              when={editingId() === group.id}
              fallback={
                <div style={{ display: "inline-flex", "align-items": "center", gap: "0.2rem" }}>
                  <button
                    class={`top-nav-tab ${props.activeGroupId === group.id ? "active" : ""}`}
                    onClick={() => props.setActiveGroupId(group.id)}
                  >
                    {group.name}
                  </button>
                  <Show when={props.isAdmin}>
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

      <div class="top-nav-actions">
        <button 
          onClick={() => {
            if ('caches' in window) {
              caches.keys().then(names => names.forEach(name => caches.delete(name)));
            }
            window.location.reload();
          }}
          title="Tải lại trang (Xóa cache)"
          class="action-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>
    </header>
  );
}
