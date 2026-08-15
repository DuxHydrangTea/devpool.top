import { db } from "~/lib/turso";
import { articles as articlesSchema, categories as categoriesSchema } from "~/db/schema";
import { eq, asc } from "drizzle-orm";
import { DocPayload } from "~/types/doc.types";
import { parseMarkdown } from "~/lib/markdown";
import { getArticleCache, setArticleCache, getSiteTreeCache, setSiteTreeCache } from "~/lib/cache";

export class DocService {
  /**
   * Get cached or fresh site tree (Categories + Articles metadata)
   */
  async getSidebarTree(isAdmin: boolean = false) {
    // 1. Check Site Tree Cache (L1 Memory / L2 Redis)
    const cachedTree = await getSiteTreeCache();
    if (cachedTree) {
      return { ...cachedTree, isAdmin };
    }

    // 2. Fetch from DB
    const categories = await db.select().from(categoriesSchema).orderBy(asc(categoriesSchema.order));
    const articles = await db
      .select({
        id: articlesSchema.id,
        title: articlesSchema.title,
        chapterId: articlesSchema.chapterId,
        order: articlesSchema.order,
        slug: articlesSchema.slug,
      })
      .from(articlesSchema)
      .orderBy(asc(articlesSchema.order));

    const tree = { categories, articles };
    await setSiteTreeCache(tree);

    return { ...tree, isAdmin };
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
      return { ...cached, isAdmin };
    }

    // 2. Query article from DB
    const results = await db.select().from(articlesSchema).where(eq(articlesSchema.slug, articleSlug));

    if (results.length === 0) {
      return this.getEmptyDocPayload(isAdmin);
    }

    const data = results[0];
    const htmlContent = await parseMarkdown(data.contentMd || "");

    // 3. Resolve Navigation Hierarchy & Next/Prev
    const treeData = await this.getSidebarTree(isAdmin);
    const allCategories = treeData.categories;
    const allArticles = treeData.articles;

    const flatArticles: typeof allArticles = [];
    const groups = allCategories.filter((c) => c.type === "group");
    for (const group of groups) {
      const cats = allCategories.filter((c) => c.type === "category" && c.parentId === group.id);
      for (const cat of cats) {
        const chaps = allCategories.filter((c) => c.type === "chapter" && c.parentId === cat.id);
        for (const chap of chaps) {
          const arts = allArticles.filter((a) => a.chapterId === chap.id);
          flatArticles.push(...arts);
        }
      }
    }

    const currentIndex = flatArticles.findIndex((a) => a.slug === articleSlug || a.slug === slugId);
    let prevResult = null;
    let nextResult = null;

    if (currentIndex > 0) {
      prevResult = flatArticles[currentIndex - 1];
    }
    if (currentIndex !== -1 && currentIndex < flatArticles.length - 1) {
      nextResult = flatArticles[currentIndex + 1];
    }

    const getArticlePath = (article: { chapterId: number; slug: string }) => {
      const chapter = allCategories.find((c) => c.id === article.chapterId);
      let cat = null;
      if (chapter && chapter.type === "chapter") {
        cat = allCategories.find((c) => c.id === chapter.parentId);
      } else if (chapter && chapter.type === "category") {
        cat = chapter;
      }
      return cat && cat.slug ? `${cat.slug}/${article.slug}` : article.slug;
    };

    // Find parent chapter and category for breadcrumbs
    const currentChapter = allCategories.find((c) => c.id === data.chapterId);
    const currentCat = currentChapter ? allCategories.find((c) => c.id === currentChapter.parentId) : null;
    const currentGroup = currentCat ? allCategories.find((g) => g.id === currentCat.parentId) : null;

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
      prev: prevResult ? { title: prevResult.title, slug: getArticlePath(prevResult) } : null,
      next: nextResult ? { title: nextResult.title, slug: getArticlePath(nextResult) } : null,
    };

    // Save to Multi-Tier Cache (L1 Memory + L2 Upstash Redis)
    await setArticleCache(articleSlug, result);
    return { ...result, isAdmin };
  }

  /**
   * Pre-cache / Warmup all articles in the database to Upstash Redis & RAM
   */
  async warmupAllArticles(): Promise<{ total: number; warmed: number }> {
    const allArticles = await db.select().from(articlesSchema);
    let warmed = 0;

    for (const article of allArticles) {
      try {
        await this.getDocBySlug(article.slug);
        warmed++;
      } catch (err) {
        console.error(`Failed to warmup article ${article.slug}:`, err);
      }
    }

    return { total: allArticles.length, warmed };
  }

  private getEmptyDocPayload(isAdmin: boolean): DocPayload {
    return {
      id: 0,
      title: "Không tìm thấy bài viết",
      slug: "",
      contentMd: "",
      content: "<h1>Bài viết không tồn tại</h1><p>Vui lòng kiểm tra lại đường dẫn hoặc chọn bài viết từ danh mục bên trái.</p>",
      words: 0,
      readMinutes: 0,
      groupName: "Tài liệu",
      catName: "Chuyên mục",
      chapName: "Chương",
      isAdmin,
      prev: null,
      next: null,
    };
  }
}

export const docService = new DocService();
