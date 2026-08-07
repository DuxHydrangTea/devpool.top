import { Router, useIsRouting } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, createSignal, Show } from "solid-js";
import { MetaProvider } from "@solidjs/meta";
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

  return (
    <Router
      root={props => (
        <MetaProvider>
          <GlobalLoader />
          <div class="mobile-header">
            <div class="mobile-brand">Raylib Odin</div>
            <button class="hamburger-btn" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
          </div>
          
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
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
