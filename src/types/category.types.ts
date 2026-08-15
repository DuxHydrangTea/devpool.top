export type CategoryType = "group" | "category" | "chapter";

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  parentId: number | null;
  order: number;
  slug: string;
  isHidden: number; // 0 = visible, 1 = hidden
}

export interface CreateCategoryDTO {
  name: string;
  type: CategoryType;
  parentId: number | null;
  order: number;
  isHidden?: number;
}

export interface UpdateCategoryDTO {
  id: number;
  name: string;
  type: CategoryType;
  parentId: number | null;
  order: number;
  isHidden?: number;
}
