export interface DocNavigationItem {
  title: string;
  slug: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface DocPayload {
  id: number;
  title: string;
  slug: string;
  contentMd: string;
  content: string;
  words: number;
  readMinutes: number;
  groupName: string;
  catName: string;
  chapName: string;
  categoryName?: string;
  chapterName?: string;
  isAdmin?: boolean;
  prev: DocNavigationItem | null;
  next: DocNavigationItem | null;
  prevArticle?: DocNavigationItem | null;
  nextArticle?: DocNavigationItem | null;
  toc?: TocItem[];
}
