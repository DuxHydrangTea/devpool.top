import "dotenv/config";
import { db } from "../src/lib/turso";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🚀 Starting database indexing on Turso SQLite...");

  const indexQueries = [
    `CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);`,
    `CREATE INDEX IF NOT EXISTS idx_articles_chapter_id ON articles(chapter_id);`,
    `CREATE INDEX IF NOT EXISTS idx_articles_order ON articles(order_num);`,
    `CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);`,
    `CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);`,
    `CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);`,
  ];

  for (const query of indexQueries) {
    console.log(`Executing: ${query}`);
    await db.run(sql.raw(query));
  }

  console.log("✅ All indexes created successfully on Turso Database!");
}

main().catch((err) => {
  console.error("❌ Failed to create indexes:", err);
  process.exit(1);
});
