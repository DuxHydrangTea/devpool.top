import { A } from "@solidjs/router";
import Counter from "~/components/Counter";

export default function About() {
  return (
    <main class="page-container">
      <h1 class="page-title">About Page</h1>
      <Counter />
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
        <span>About Page</span>
      </p>
    </main>
  );
}
