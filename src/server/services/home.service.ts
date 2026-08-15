import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { asc } from "drizzle-orm";

export class HomeService {
  /**
   * Fetch structured data for the landing page
   */
  async getHomeData() {
    const allCategories = await db
      .select()
      .from(categoriesSchema)
      .orderBy(asc(categoriesSchema.order));

    const groups = allCategories.filter((c) => c.type === "group");

    const latestArticles = await db
      .select({
        id: articlesSchema.id,
        title: articlesSchema.title,
        chapterId: articlesSchema.chapterId,
        order: articlesSchema.order,
        slug: articlesSchema.slug,
      })
      .from(articlesSchema)
      .orderBy(asc(articlesSchema.order))
      .limit(6);

    return {
      groups,
      categories: allCategories,
      latestArticles,
    };
  }
}

export const homeService = new HomeService();
