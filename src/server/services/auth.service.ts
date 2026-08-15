import { db } from "~/lib/turso";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken, getAuthCookie, verifyToken } from "~/lib/auth";
import { getRequestEvent } from "solid-js/web";

export class AuthService {
  /**
   * Authenticate admin user credentials and set auth cookie
   */
  async login(formData: FormData): Promise<{ success: boolean; username: string }> {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      throw new Error("Vui lòng điền đầy đủ tài khoản và mật khẩu");
    }

    const result = await db.select().from(users).where(eq(users.username, username.trim()));
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
        `admin_token=${token}; HttpOnly; Path=/; Max-Age=2592000${isProd ? "; Secure" : ""}; SameSite=Lax`
      );
    }

    return { success: true, username: user.username };
  }

  /**
   * Check if current request has valid admin authentication
   */
  async isAuthenticated(): Promise<boolean> {
    const token = getAuthCookie();
    if (!token) return false;
    const payload = await verifyToken(token);
    return !!payload;
  }

  /**
   * Get current authenticated user payload or null
   */
  async getCurrentUser() {
    const token = getAuthCookie();
    if (!token) return null;
    return await verifyToken(token);
  }

  /**
   * Guard for protected admin actions & queries
   */
  async requireAuth() {
    const isAuthed = await this.isAuthenticated();
    if (!isAuthed) {
      throw new Error("Unauthorized: Yêu cầu đăng nhập quản trị viên");
    }
  }
}

export const authService = new AuthService();
