import { db } from "~/lib/turso";
import { articles as articlesSchema, categories as categoriesSchema } from "~/db/schema";
import { eq, asc } from "drizzle-orm";
import { DocPayload } from "~/types/doc.types";
import { parseMarkdown } from "~/lib/markdown";
import { getArticleCache, setArticleCache, getSiteTreeCache, setSiteTreeCache, invalidateSiteTree } from "~/lib/cache";
import { ArticleMeta } from "~/types/article.types";
import { Category } from "~/types/category.types";

export class DocService {
  /**
   * Helper to compute set of all hidden category IDs including cascading inheritance
   */
  getHiddenCategoryIds(allCategories: Category[]): Set<number> {
    const hiddenSet = new Set<number>();
    const catMap = new Map<number, Category>(allCategories.map((c) => [c.id, c]));

    // Recursive helper to check if a category or any of its ancestors is hidden
    const isCategoryHidden = (catId: number | null): boolean => {
      if (catId === null || !catMap.has(catId)) return false;
      const cat = catMap.get(catId)!;
      if (cat.isHidden === 1) return true;
      return isCategoryHidden(cat.parentId);
    };

    for (const cat of allCategories) {
      if (isCategoryHidden(cat.id)) {
        hiddenSet.add(cat.id);
      }
    }

    return hiddenSet;
  }

  /**
   * Get cached or fresh site tree (Categories + Articles metadata).
   * For the client interface, hidden items are ALWAYS filtered out.
   */
  async getSidebarTree(isAdmin: boolean = false) {
    let fullTree: { categories: Category[]; articles: ArticleMeta[] };

    // 1. Check Site Tree Cache (L1 Memory / L2 Redis)
    const cachedTree = await getSiteTreeCache();
    if (cachedTree) {
      fullTree = cachedTree;
    } else {
      // 2. Fetch from DB
      const rawCategories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
      const categories: Category[] = rawCategories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as Category["type"],
        parentId: c.parentId,
        order: c.order,
        slug: c.slug,
        isHidden: c.isHidden || 0,
      }));

      const rawArticles = await db
        .select({
          id: articlesSchema.id,
          title: articlesSchema.title,
          chapterId: articlesSchema.chapterId,
          order: articlesSchema.order,
          slug: articlesSchema.slug,
          isHidden: articlesSchema.isHidden,
        })
        .from(articlesSchema)
        .orderBy(asc(articlesSchema.order));

      const articles: ArticleMeta[] = rawArticles.map((a) => ({
        id: a.id,
        title: a.title,
        chapterId: a.chapterId || 0,
        order: a.order,
        slug: a.slug,
        isHidden: a.isHidden || 0,
      }));

      fullTree = { categories, articles };
      await setSiteTreeCache(fullTree);
    }

    // Always filter out hidden categories and hidden articles for client layout
    const hiddenCatIds = this.getHiddenCategoryIds(fullTree.categories);

    const visibleCategories = fullTree.categories.filter((c) => !hiddenCatIds.has(c.id));
    const visibleArticles = fullTree.articles.filter(
      (a) => a.isHidden !== 1 && !hiddenCatIds.has(a.chapterId)
    );

    return {
      categories: visibleCategories,
      articles: visibleArticles,
      isAdmin,
    };
  }

  /**
   * Get full document payload by slug (with markdown HTML, breadcrumbs & next/prev navigation)
   */
  async getDocBySlug(slugId: string, isAdmin: boolean = false): Promise<DocPayload> {
    if (!slugId) {
      return this.getEmptyDocPayload(isAdmin);
    }

    const slugParts = slugId.split("/");
    const articleSlug = slugParts[slugParts.length - 1];

    // 1. Check Multi-Tier Cache (L1 Memory -> L2 Upstash Redis)
    const cached = await getArticleCache(articleSlug);
    if (cached && cached.content !== undefined) {
      if (!isAdmin && cached.isHidden === 1) {
        return this.getEmptyDocPayload(isAdmin);
      }
      return { ...cached, isAdmin };
    }

    // 2. Query article from DB
    const results = await db.select().from(articlesSchema).where(eq(articlesSchema.slug, articleSlug));

    if (results.length === 0) {
      return this.getEmptyDocPayload(isAdmin);
    }

    const data = results[0];

    // 3. Resolve Navigation Hierarchy & Check Visibility
    const rawCategories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
    const allCategories: Category[] = rawCategories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as Category["type"],
      parentId: c.parentId,
      order: c.order,
      slug: c.slug,
      isHidden: c.isHidden || 0,
    }));

    const hiddenCatIds = this.getHiddenCategoryIds(allCategories);
    const isArticleOrParentHidden = data.isHidden === 1 || (data.chapterId && hiddenCatIds.has(data.chapterId));

    // Check if article or its parent chain is hidden for non-admin
    if (!isAdmin && isArticleOrParentHidden) {
      return this.getEmptyDocPayload(isAdmin);
    }

    const htmlContent = await parseMarkdown(data.contentMd || "");

    // Get visible tree for accurate next/prev navigation
    const treeData = await this.getSidebarTree(false);
    const visibleCategories = treeData.categories;
    const visibleArticles = treeData.articles;

    // Fast O(1) Lookups for Navigation
    const catMap = new Map<number, Category>(allCategories.map((c) => [c.id, c]));
    const childrenMap = new Map<number | null, Category[]>();
    for (const cat of visibleCategories) {
      const list = childrenMap.get(cat.parentId) || [];
      list.push(cat);
      childrenMap.set(cat.parentId, list);
    }

    const articlesByChapter = new Map<number, ArticleMeta[]>();
    for (const art of visibleArticles) {
      const list = articlesByChapter.get(art.chapterId) || [];
      list.push(art);
      articlesByChapter.set(art.chapterId, list);
    }

    // Build flattened visible article sequence efficiently
    const flatArticles: ArticleMeta[] = [];
    const groups = childrenMap.get(null) || visibleCategories.filter((c) => c.type === "group");
    for (const group of groups) {
      const cats = childrenMap.get(group.id) || [];
      for (const cat of cats) {
        const chaps = childrenMap.get(cat.id) || [];
        for (const chap of chaps) {
          const arts = articlesByChapter.get(chap.id) || [];
          flatArticles.push(...arts);
        }
      }
    }

    const currentIndex = flatArticles.findIndex((a) => a.slug === articleSlug || a.slug === slugId);
    let prevResult: ArticleMeta | null = null;
    let nextResult: ArticleMeta | null = null;

    if (currentIndex > 0) {
      prevResult = flatArticles[currentIndex - 1];
    }
    if (currentIndex !== -1 && currentIndex < flatArticles.length - 1) {
      nextResult = flatArticles[currentIndex + 1];
    }

    const getArticlePath = (article: { chapterId: number; slug: string }) => {
      const chapter = catMap.get(article.chapterId);
      let cat: Category | undefined = undefined;
      if (chapter && chapter.type === "chapter" && chapter.parentId !== null) {
        cat = catMap.get(chapter.parentId);
      } else if (chapter && chapter.type === "category") {
        cat = chapter;
      }
      return cat && cat.slug ? `${cat.slug}/${article.slug}` : article.slug;
    };

    // Find parent chapter, category, and group for breadcrumbs in O(1)
    const currentChapter = catMap.get(data.chapterId || 0);
    const currentCat = currentChapter && currentChapter.parentId !== null ? catMap.get(currentChapter.parentId) : null;
    const currentGroup = currentCat && currentCat.parentId !== null ? catMap.get(currentCat.parentId) : null;

    const words = (data.contentMd || "").trim().split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.ceil(words / 220));

    const result: DocPayload = {
      id: data.id,
      title: data.title,
      slug: data.slug,
      contentMd: data.contentMd || "",
      content: htmlContent,
      words,
      readMinutes,
      groupName: currentGroup?.name || "Tài liệu",
      catName: currentCat?.name || "Chuyên mục",
      chapName: currentChapter?.name || "Chương",
      categoryName: currentCat?.name || "Chuyên mục",
      chapterName: currentChapter?.name || "Chương",
      prev: prevResult ? { title: prevResult.title, slug: getArticlePath(prevResult) } : null,
      next: nextResult ? { title: nextResult.title, slug: getArticlePath(nextResult) } : null,
      prevArticle: prevResult ? { title: prevResult.title, slug: getArticlePath(prevResult) } : null,
      nextArticle: nextResult ? { title: nextResult.title, slug: getArticlePath(nextResult) } : null,
      isAdmin,
    };

    // 4. Save to Multi-Tier Cache
    await setArticleCache(articleSlug, result);

    return result;
  }

  /**
   * Warmup all articles concurrently in batches into Redis cache
   */
  async warmupAllArticles(batchSize: number = 25): Promise<{ total: number; warmed: number }> {
    const rawArticles = await db
      .select({
        slug: articlesSchema.slug,
      })
      .from(articlesSchema);

    const total = rawArticles.length;
    let warmed = 0;

    for (let i = 0; i < total; i += batchSize) {
      const batch = rawArticles.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (art) => {
          try {
            await this.getDocBySlug(art.slug, false);
            warmed++;
          } catch (err) {
            console.error(`Failed to warmup article: ${art.slug}`, err);
          }
        })
      );
    }

    return { total, warmed };
  }

  /**
   * Safe Fallback for Empty Document
   */
  private getEmptyDocPayload(isAdmin: boolean = false): DocPayload {
    return {
      id: 0,
      title: "Không tìm thấy tài liệu hoặc tài liệu đang bị ẩn",
      slug: "",
      contentMd: "",
      content: "<p>Tài liệu này không tồn tại hoặc đã được chuyển sang chế độ riêng tư.</p>",
      words: 0,
      readMinutes: 1,
      groupName: "Tài liệu",
      catName: "Chuyên mục",
      chapName: "Chương",
      categoryName: "Chuyên mục",
      chapterName: "Chương",
      prev: null,
      next: null,
      prevArticle: null,
      nextArticle: null,
      isAdmin,
    };
  }
}

export const docService = new DocService();
