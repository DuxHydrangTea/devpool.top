import { Category } from "./category.types";

export interface DashboardStats {
  totalArticles: number;
  totalGroups: number;
  totalCategories: number;
  totalChapters: number;
  totalWords: number;
  emptyChaptersCount: number;
  cacheHitRatio?: number;
  dbLatencyMs?: number;
}

export interface DashboardArticleItem {
  id: number;
  title: string;
  chapterId: number;
  slug: string;
  order: number;
  contentLength?: number;
  wordCount?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  categories: Category[];
  articles: DashboardArticleItem[];
  cacheStats?: {
    memoryEntries: number;
    redisEntries: number;
    redisConnected: boolean;
    hits: number;
    misses: number;
    hitRatio: number;
  };
}
