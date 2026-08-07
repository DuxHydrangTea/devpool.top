import { Title } from "@solidjs/meta";
import { createSignal } from "solid-js";
import { action, useAction, redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { db } from "~/lib/turso";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken } from "~/lib/auth";

const loginAction = action(async (formData: FormData) => {
  "use server";
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    throw new Error("Vui lòng điền đủ thông tin");
  }

  const result = await db.select().from(users).where(eq(users.username, username));
  if (result.length === 0) {
    throw new Error("Sai tên đăng nhập hoặc mật khẩu");
  }

  const user = result[0];
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new Error("Sai tên đăng nhập hoặc mật khẩu");
  }

  const token = await signToken({ id: user.id, username: user.username });
  
  const event = getRequestEvent();
  if (event) {
    const isProd = process.env.NODE_ENV === "production";
    event.response.headers.append(
      "Set-Cookie", 
      `admin_token=${token}; HttpOnly; Path=/; Max-Age=86400${isProd ? '; Secure' : ''}`
    );
  }

  return redirect("/admin");
}, "login-action");

export default function Login() {
  const [error, setError] = createSignal("");
  const doLogin = useAction(loginAction);
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      await doLogin(formData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="page-container flex justify-center items-center" style={{ "min-height": "100vh" }}>
      <Title>Đăng nhập Admin</Title>
      
      <div class="card" style={{ width: "100%", "max-width": "400px" }}>
        <h1 class="card-title text-center mb-6 text-2xl">Đăng nhập Admin</h1>
        
        {error() && (
          <div class="badge-danger mb-4 p-2 text-center rounded">
            {error()}
          </div>
        )}
        
        <form onSubmit={handleSubmit} class="flex-col gap-4">
          <div class="form-group">
            <label class="form-label">Tài khoản</label>
            <input type="text" name="username" class="form-input" required />
          </div>
          
          <div class="form-group">
            <label class="form-label">Mật khẩu</label>
            <input type="password" name="password" class="form-input" required />
          </div>
          
          <button type="submit" class="btn btn-primary btn-block mt-4 p-3" disabled={isLoading()}>
            {isLoading() ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
