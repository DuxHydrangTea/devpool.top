import { mount, StartClient } from "@solidjs/start/client";

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service Worker registration failed: ", err);
    });
  });
}

mount(() => <StartClient />, document.getElementById("app")!);
