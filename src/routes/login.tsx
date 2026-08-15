import { Title } from "@solidjs/meta";
import { createSignal } from "solid-js";
import { action, useAction, redirect } from "@solidjs/router";
import { authService } from "~/server/services/auth.service";

const loginAction = action(async (formData: FormData) => {
  "use server";
  await authService.login(formData);
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
