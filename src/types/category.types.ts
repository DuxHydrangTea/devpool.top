export type CategoryType = "group" | "category" | "chapter";

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  parentId: number | null;
  order: number;
  slug: string;
}

export interface CreateCategoryDTO {
  name: string;
  type: CategoryType;
  parentId: number | null;
  order: number;
}

export interface UpdateCategoryDTO {
  id: number;
  name: string;
  type: CategoryType;
  parentId: number | null;
  order: number;
}
