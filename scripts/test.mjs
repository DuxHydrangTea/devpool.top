import { createClient } from "@libsql/client";
const db = createClient({ url: "file:local.db" });
async function test() {
  const { rows } = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log(rows);
}
test();
