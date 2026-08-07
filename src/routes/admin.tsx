import { Show, Suspense } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { verifyToken } from "~/lib/auth";
import { redirect, query, createAsync } from "@solidjs/router";

function getCookie(name: string) {
  const event = getRequestEvent();
  if (!event) return null;
  const cookieHeader = event.request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

const checkAuth = query(async () => {
  "use server";
  const token = getCookie("admin_token");
  if (!token) {
    throw redirect("/login");
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    throw redirect("/login");
  }
  
  return payload;
}, "check-auth");

export default function AdminLayout(props: any) {
  const user = createAsync(() => checkAuth());

  return (
    <Show when={user()} fallback={<div class="p-8 text-center text-emerald-400">Đang xác thực bảo mật...</div>}>
      <Suspense>
        {props.children}
      </Suspense>
    </Show>
  );
}
