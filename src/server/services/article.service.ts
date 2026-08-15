import { db } from "~/lib/turso";
import { articles as articlesSchema } from "~/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { Article, CreateArticleDTO, UpdateArticleDTO } from "~/types/article.types";
import { generateSlug } from "~/utils/slug";
import { invalidateArticle, invalidateSiteTree, clearAllCache } from "~/lib/cache";

export class ArticleService {
  /**
   * Get all articles, optionally filtered by chapter ID
   */
  async getArticles(filterChapterId?: number): Promise<Article[]> {
    if (filterChapterId) {
      return await db
        .select()
        .from(articlesSchema)
        .where(eq(articlesSchema.chapterId, filterChapterId))
        .orderBy(asc(articlesSchema.order));
    }
    return await db.select().from(articlesSchema).orderBy(desc(articlesSchema.id));
  }

  /**
   * Get article by ID
   */
  async getArticleById(id: number): Promise<Article | null> {
    const results = await db.select().from(articlesSchema).where(eq(articlesSchema.id, id));
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new article and invalidate cache
   */
  async createArticle(dto: CreateArticleDTO): Promise<void> {
    const trimmedTitle = dto.title.trim();
    if (!trimmedTitle) {
      throw new Error("Tiêu đề bài viết không được để trống");
    }
    if (!dto.chapterId) {
      throw new Error("Vui lòng chọn chương chứa bài viết");
    }

    const slug = generateSlug(trimmedTitle);

    // Invalidate caches before insert to ensure clean state
    await invalidateArticle(slug);
    await invalidateSiteTree();

    await db.insert(articlesSchema).values({
      title: trimmedTitle,
      slug: slug,
      contentMd: dto.contentMd,
      chapterId: dto.chapterId,
      order: dto.order,
    });
  }

  /**
   * Update full article details and invalidate cache
   */
  async updateArticle(dto: UpdateArticleDTO): Promise<void> {
    const trimmedTitle = dto.title.trim();
    if (!trimmedTitle) {
      throw new Error("Tiêu đề bài viết không được để trống");
    }

    const slug = generateSlug(trimmedTitle);

    // Find previous slug to invalidate old cache if title changed
    const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, dto.id));
    if (target.length > 0) {
      await invalidateArticle(target[0].slug);
    }
    await invalidateArticle(slug);
    await invalidateSiteTree();

    await db
      .update(articlesSchema)
      .set({
        title: trimmedTitle,
        slug: slug,
        contentMd: dto.contentMd,
        chapterId: dto.chapterId,
        order: dto.order,
      })
      .where(eq(articlesSchema.id, dto.id));
  }

  /**
   * Fast inline title rename
   */
  async updateArticleTitle(id: number, title: string): Promise<void> {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const slug = generateSlug(trimmedTitle);
    const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, id));
    if (target.length > 0) {
      await invalidateArticle(target[0].slug);
    }
    await invalidateArticle(slug);
    await invalidateSiteTree();

    await db
      .update(articlesSchema)
      .set({
        title: trimmedTitle,
        slug: slug,
      })
      .where(eq(articlesSchema.id, id));
  }

  /**
   * Fast inline content update
   */
  async updateArticleContent(id: number, contentMd: string): Promise<void> {
    const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, id));
    if (target.length > 0) {
      await invalidateArticle(target[0].slug);
    }

    await db
      .update(articlesSchema)
      .set({
        contentMd: contentMd,
      })
      .where(eq(articlesSchema.id, id));
  }

  /**
   * Delete article and clean up cache
   */
  async deleteArticle(id: number): Promise<void> {
    const target = await db.select().from(articlesSchema).where(eq(articlesSchema.id, id));
    if (target.length > 0) {
      await invalidateArticle(target[0].slug);
    }
    await invalidateSiteTree();
    await db.delete(articlesSchema).where(eq(articlesSchema.id, id));
  }

  /**
   * Clear all cache across RAM and Upstash Redis
   */
  async clearAllSystemCache() {
    return await clearAllCache();
  }
}

export const articleService = new ArticleService();
