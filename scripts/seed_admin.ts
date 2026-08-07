import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import bcrypt from 'bcryptjs';

async function main() {
  const { db } = await import("../src/lib/turso");
  const { users } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const username = "ngocdung181";
  const password = "ngocdung181";
  const passwordHash = await bcrypt.hash(password, 10);

  // Check if exists
  const existing = await db.select().from(users).where(eq(users.username, username));
  
  if (existing.length === 0) {
    await db.insert(users).values({
      username,
      passwordHash
    });
    console.log(`✅ Đã tạo tài khoản admin: ${username}`);
  } else {
    // Update password if exists
    await db.update(users).set({ passwordHash }).where(eq(users.username, username));
    console.log(`✅ Đã cập nhật mật khẩu cho admin: ${username}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
