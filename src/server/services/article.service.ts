import { db } from "~/lib/turso";
import { articles as articlesSchema } from "~/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { Article, ArticleMeta, CreateArticleDTO, UpdateArticleDTO } from "~/types/article.types";
import { generateSlug } from "~/utils/slug";
import { invalidateArticle, invalidateSiteTree, clearAllCache } from "~/lib/cache";

export class ArticleService {
  /**
   * Get lightweight article metadata list (omits heavy contentMd for ultra-fast table loading)
   */
  async getArticles(filterChapterId?: number): Promise<ArticleMeta[]> {
    if (filterChapterId) {
      const results = await db
        .select({
          id: articlesSchema.id,
          title: articlesSchema.title,
          slug: articlesSchema.slug,
          chapterId: articlesSchema.chapterId,
          order: articlesSchema.order,
          isHidden: articlesSchema.isHidden,
        })
        .from(articlesSchema)
        .where(eq(articlesSchema.chapterId, filterChapterId))
        .orderBy(asc(articlesSchema.order));

      return results.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        chapterId: a.chapterId || 0,
        order: a.order,
        isHidden: a.isHidden || 0,
      }));
    }

    const results = await db
      .select({
        id: articlesSchema.id,
        title: articlesSchema.title,
        slug: articlesSchema.slug,
        chapterId: articlesSchema.chapterId,
        order: articlesSchema.order,
        isHidden: articlesSchema.isHidden,
      })
      .from(articlesSchema)
      .orderBy(desc(articlesSchema.id));

    return results.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      chapterId: a.chapterId || 0,
      order: a.order,
      isHidden: a.isHidden || 0,
    }));
  }

  /**
   * Get single article markdown content by ID on-demand (lazy-loaded when editing)
   */
  async getArticleContent(id: number): Promise<string> {
    const results = await db
      .select({ contentMd: articlesSchema.contentMd })
      .from(articlesSchema)
      .where(eq(articlesSchema.id, id));

    return results.length > 0 ? results[0].contentMd || "" : "";
  }

  /**
   * Get full article by ID
   */
  async getArticleById(id: number): Promise<Article | null> {
    const results = await db.select().from(articlesSchema).where(eq(articlesSchema.id, id));
    if (results.length === 0) return null;
    const a = results[0];
    return {
      id: a.id,
      title: a.title,
      slug: a.slug,
      chapterId: a.chapterId || 0,
      order: a.order,
      contentMd: a.contentMd,
      isHidden: a.isHidden || 0,
    };
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

    await db.insert(articlesSchema).values({
      title: trimmedTitle,
      contentMd: dto.contentMd || "",
      chapterId: dto.chapterId,
      order: dto.order ?? 0,
      slug,
      isHidden: dto.isHidden ?? 0,
    });

    await invalidateSiteTree();
  }

  /**
   * Update article content, metadata and invalidate cache
   */
  async updateArticle(dto: UpdateArticleDTO): Promise<void> {
    const trimmedTitle = dto.title.trim();
    if (!trimmedTitle) {
      throw new Error("Tiêu đề bài viết không được để trống");
    }
    if (!dto.chapterId) {
      throw new Error("Vui lòng chọn chương chứa bài viết");
    }

    const oldArticle = await this.getArticleById(dto.id);
    if (!oldArticle) {
      throw new Error("Bài viết không tồn tại");
    }

    const slug = generateSlug(trimmedTitle);

    // Invalidate old slug if changed
    if (oldArticle.slug !== slug) {
      await invalidateArticle(oldArticle.slug);
    }
    await invalidateArticle(slug);

    await db
      .update(articlesSchema)
      .set({
        title: trimmedTitle,
        contentMd: dto.contentMd,
        chapterId: dto.chapterId,
        order: dto.order,
        slug,
        isHidden: dto.isHidden ?? 0,
      })
      .where(eq(articlesSchema.id, dto.id));

    await invalidateSiteTree();
  }

  /**
   * Quick update article title
   */
  async updateArticleTitle(id: number, title: string): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("Tiêu đề không được để trống");

    const oldArticle = await this.getArticleById(id);
    if (!oldArticle) throw new Error("Bài viết không tồn tại");

    const slug = generateSlug(trimmed);
    await invalidateArticle(oldArticle.slug);
    await invalidateArticle(slug);

    await db
      .update(articlesSchema)
      .set({ title: trimmed, slug })
      .where(eq(articlesSchema.id, id));

    await invalidateSiteTree();
  }

  /**
   * Quick update article markdown content
   */
  async updateArticleContent(id: number, contentMd: string): Promise<void> {
    const oldArticle = await this.getArticleById(id);
    if (!oldArticle) throw new Error("Bài viết không tồn tại");

    await db
      .update(articlesSchema)
      .set({ contentMd })
      .where(eq(articlesSchema.id, id));

    await invalidateArticle(oldArticle.slug);
  }

  /**
   * Quick toggle article visibility
   */
  async toggleArticleVisibility(id: number, isHidden: number): Promise<void> {
    const oldArticle = await this.getArticleById(id);
    if (!oldArticle) throw new Error("Bài viết không tồn tại");

    await db
      .update(articlesSchema)
      .set({ isHidden })
      .where(eq(articlesSchema.id, id));

    await invalidateArticle(oldArticle.slug);
    await invalidateSiteTree();
  }

  /**
   * Delete article and invalidate cache
   */
  async deleteArticle(id: number): Promise<void> {
    const oldArticle = await this.getArticleById(id);
    if (oldArticle) {
      await invalidateArticle(oldArticle.slug);
    }

    await db.delete(articlesSchema).where(eq(articlesSchema.id, id));
    await invalidateSiteTree();
  }

  /**
   * Clear all L1 RAM and L2 Redis caches
   */
  async clearAllSystemCache() {
    return await clearAllCache();
  }
}

export const articleService = new ArticleService();
