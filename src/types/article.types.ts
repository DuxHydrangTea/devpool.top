export interface Article {
  id: number;
  title: string;
  slug: string;
  chapterId: number;
  order: number;
  contentMd: string | null;
  isHidden: number; // 0 = visible, 1 = hidden
}

export interface ArticleMeta {
  id: number;
  title: string;
  chapterId: number;
  order: number;
  slug: string;
  isHidden: number; // 0 = visible, 1 = hidden
}

export interface CreateArticleDTO {
  title: string;
  contentMd: string;
  chapterId: number;
  order: number;
  isHidden?: number;
}

export interface UpdateArticleDTO {
  id: number;
  title: string;
  contentMd: string;
  chapterId: number;
  order: number;
  isHidden?: number;
}
