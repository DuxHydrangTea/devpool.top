import { For } from "solid-js";
import { A } from "@solidjs/router";

interface Group {
  id: number;
  name: string;
}

export default function TopNav(props: {
  groups: Group[];
  activeGroupId: number | null;
  setActiveGroupId: (id: number) => void;
  pageTitle: string;
}) {
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
            <button
              class={`top-nav-tab ${props.activeGroupId === group.id ? "active" : ""}`}
              onClick={() => props.setActiveGroupId(group.id)}
            >
              {group.name}
            </button>
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
