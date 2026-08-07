import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <main class="page-container">
      <h1 class="page-title danger">Not Found</h1>
      <p class="page-desc">
        Visit{" "}
        <a href="https://solidjs.com" target="_blank" class="page-link">
          solidjs.com
        </a>{" "}
        to learn how to build Solid apps.
      </p>
      <p class="page-nav">
        <A href="/" class="page-link">
          Home
        </A>
        {" - "}
        <A href="/about" class="page-link">
          About Page
        </A>
      </p>
    </main>
  );
}
