import { Router, useIsRouting } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, createSignal, Show, createContext, useContext } from "solid-js";
import { MetaProvider } from "@solidjs/meta";
import Sidebar from "~/components/Sidebar";
import "./app.css";

export const TitleContext = createContext<[() => string, (t: string) => void]>();
export function usePageTitle() {
  const ctx = useContext(TitleContext);
  if (!ctx) throw new Error("usePageTitle must be used within TitleContext");
  return ctx;
}

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
            </div>
          </TitleContext.Provider>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
