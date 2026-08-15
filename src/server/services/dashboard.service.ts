import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { asc } from "drizzle-orm";
import { DashboardData, DashboardStats, DashboardArticleItem } from "~/types/dashboard.types";
import { Category } from "~/types/category.types";
import { getCacheStats } from "~/lib/cache";

export class DashboardService {
  /**
   * Get all dashboard metrics, categories tree, and article counts
   */
  async getDashboardOverview(): Promise<DashboardData> {
    const startMs = Date.now();

    // 1. Fetch categories
    const rawCategories = await db
      .select()
      .from(categoriesSchema)
      .orderBy(asc(categoriesSchema.order));

    const categories: Category[] = rawCategories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as Category["type"],
      parentId: c.parentId,
      slug: c.slug,
      order: c.order,
    }));

    // 2. Fetch articles
    const rawArticles = await db
      .select({
        id: articlesSchema.id,
        title: articlesSchema.title,
        chapterId: articlesSchema.chapterId,
        slug: articlesSchema.slug,
        order: articlesSchema.order,
        contentMd: articlesSchema.contentMd,
      })
      .from(articlesSchema)
      .orderBy(asc(articlesSchema.order));

    let totalWords = 0;
    const articles: DashboardArticleItem[] = rawArticles.map((a) => {
      const len = a.contentMd ? a.contentMd.length : 0;
      const words = a.contentMd ? a.contentMd.trim().split(/\s+/).filter(Boolean).length : 0;
      totalWords += words;

      return {
        id: a.id,
        title: a.title,
        chapterId: a.chapterId || 0,
        slug: a.slug,
        order: a.order,
        contentLength: len,
        wordCount: words,
      };
    });

    const latency = Date.now() - startMs;

    const groupsCount = categories.filter((c) => c.type === "group").length;
    const catsCount = categories.filter((c) => c.type === "category").length;
    const chaptersCount = categories.filter((c) => c.type === "chapter").length;

    const chapsWithArticles = new Set(articles.map((a) => a.chapterId));
    const emptyChaptersCount = Math.max(0, chaptersCount - chapsWithArticles.size);

    const cacheStats = await getCacheStats();

    const stats: DashboardStats = {
      totalArticles: articles.length,
      totalGroups: groupsCount,
      totalCategories: catsCount,
      totalChapters: chaptersCount,
      totalWords: totalWords,
      emptyChaptersCount: emptyChaptersCount,
      cacheHitRatio: cacheStats.hitRatio,
      dbLatencyMs: latency,
    };

    return {
      stats,
      categories,
      articles,
      cacheStats,
    };
  }
}

export const dashboardService = new DashboardService();
