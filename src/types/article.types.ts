export interface Article {
  id: number;
  title: string;
  slug: string;
  chapterId: number;
  order: number;
  contentMd: string | null;
}

export interface ArticleMeta {
  id: number;
  title: string;
  chapterId: number;
  order: number;
  slug: string;
}

export interface CreateArticleDTO {
  title: string;
  contentMd: string;
  chapterId: number;
  order: number;
}

export interface UpdateArticleDTO {
  id: number;
  title: string;
  contentMd: string;
  chapterId: number;
  order: number;
}
