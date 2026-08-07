import { Router, useIsRouting } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, createSignal, Show } from "solid-js";
import { MetaProvider } from "@solidjs/meta";
import { TitleContext } from "~/contexts/TitleContext";
import Sidebar from "~/components/Sidebar";
import "./app.css";

function GlobalLoader() {
  const isRouting = useIsRouting();
  return (
    <Show when={isRouting()}>
      <div class="routing-overlay">
        <div class="spinner"></div>
      </div>
    </Show>
  );
}

export default function App() {
  const [isSidebarOpen, setSidebarOpen] = createSignal(false);
  const [pageTitle, setPageTitle] = createSignal("DevPool");

  return (
    <Router
      root={props => (
        <MetaProvider>
          <TitleContext.Provider value={[pageTitle, setPageTitle]}>
            <GlobalLoader />
            <div class="app-container">
              <div 
                class={`sidebar-overlay ${isSidebarOpen() ? 'show' : ''}`}
                onClick={() => setSidebarOpen(false)}
              ></div>

              <Sidebar isOpen={isSidebarOpen()} onClose={() => setSidebarOpen(false)} />
              <main class="main-content">
                <Suspense>{props.children}</Suspense>
              </main>
            </div>

            <div class="mobile-header">
              <button class="hamburger-btn" onClick={() => setSidebarOpen(true)}>
                ☰
              </button>
              <div class="mobile-brand">{pageTitle()}</div>
              <button 
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then(names => names.forEach(n => caches.delete(n)));
                  }
                  window.location.reload();
                }}
                title="Tải lại trang (Xóa cache)"
                style={{ color: "var(--text-muted)", "font-size": "1.1rem", padding: "0.25rem", display: "flex", "align-items": "center", "justify-content": "center" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </button>
            </div>
          </TitleContext.Provider>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
