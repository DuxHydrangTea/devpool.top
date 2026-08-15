import { db } from "~/lib/turso";
import { categories as categoriesSchema, articles as articlesSchema } from "~/db/schema";
import { eq, asc } from "drizzle-orm";
import { Category, CreateCategoryDTO, UpdateCategoryDTO } from "~/types/category.types";
import { generateSlug } from "~/utils/slug";
import { invalidateSiteTree } from "~/lib/cache";

export class CategoryService {
  /**
   * Get all categories ordered by sequence
   */
  async getAllCategories(): Promise<Category[]> {
    const rawCategories = await db
      .select()
      .from(categoriesSchema)
      .orderBy(asc(categoriesSchema.order));

    return rawCategories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as Category["type"],
      parentId: c.parentId,
      order: c.order,
      slug: c.slug,
    }));
  }

  /**
   * Create a new category, group, or chapter
   */
  async createCategory(dto: CreateCategoryDTO): Promise<void> {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new Error("Tên danh mục không được để trống");
    }

    const slug = generateSlug(trimmedName);
    const parentId = dto.type === "group" ? null : dto.parentId;

    await db.insert(categoriesSchema).values({
      name: trimmedName,
      type: dto.type,
      parentId: parentId,
      order: dto.order,
      slug: slug,
    });

    await invalidateSiteTree();
  }

  /**
   * Update category properties
   */
  async updateCategory(dto: UpdateCategoryDTO): Promise<void> {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new Error("Tên danh mục không được để trống");
    }

    const slug = generateSlug(trimmedName);
    const parentId = dto.type === "group" ? null : dto.parentId;

    await db
      .update(categoriesSchema)
      .set({
        name: trimmedName,
        type: dto.type,
        parentId: parentId,
        order: dto.order,
        slug: slug,
      })
      .where(eq(categoriesSchema.id, dto.id));

    await invalidateSiteTree();
  }

  /**
   * Fast inline rename category
   */
  async updateCategoryName(id: number, name: string): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const slug = generateSlug(trimmedName);
    await db
      .update(categoriesSchema)
      .set({
        name: trimmedName,
        slug: slug,
      })
      .where(eq(categoriesSchema.id, id));

    await invalidateSiteTree();
  }

  /**
   * Delete category and orphan child chapters/articles safely
   */
  async deleteCategory(id: number): Promise<void> {
    await db.delete(categoriesSchema).where(eq(categoriesSchema.id, id));
    await invalidateSiteTree();
  }
}

export const categoryService = new CategoryService();
