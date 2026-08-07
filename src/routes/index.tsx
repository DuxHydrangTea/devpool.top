import { A } from "@solidjs/router";
import Counter from "~/components/Counter";

export default function Home() {
  return (
    <main class="page-container">
      <h1 class="page-title">Hello world!</h1>
      <Counter />
      <p class="page-desc">
        Visit{" "}
        <a href="https://solidjs.com" target="_blank" class="page-link">
          solidjs.com
        </a>{" "}
        to learn how to build Solid apps.
      </p>
      <p class="page-nav">
        <span>Home</span>
        {" - "}
        <A href="/about" class="page-link">
          About Page
        </A>{" "}
      </p>
    </main>
  );
}
