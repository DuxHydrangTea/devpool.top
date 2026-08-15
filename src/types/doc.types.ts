export interface DocNavigationItem {
  title: string;
  slug: string;
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
  isAdmin?: boolean;
  prev: DocNavigationItem | null;
  next: DocNavigationItem | null;
}
