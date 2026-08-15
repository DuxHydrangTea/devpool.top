import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'group', 'category', 'chapter'
  parentId: integer('parent_id'),
  order: integer('order_num').default(0).notNull(),
  slug: text('slug').notNull().default(''),
  isHidden: integer('is_hidden').default(0).notNull(),
}, (table) => [
  index('idx_categories_parent_id').on(table.parentId),
  index('idx_categories_slug').on(table.slug),
  index('idx_categories_type').on(table.type),
  index('idx_categories_is_hidden').on(table.isHidden),
]);

export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  contentMd: text('content_md'),
  chapterId: integer('chapter_id').references(() => categories.id, { onDelete: 'cascade' }),
  order: integer('order_num').default(0).notNull(),
  slug: text('slug').notNull().default(''),
  isHidden: integer('is_hidden').default(0).notNull(),
}, (table) => [
  index('idx_articles_slug').on(table.slug),
  index('idx_articles_chapter_id').on(table.chapterId),
  index('idx_articles_order').on(table.order),
  index('idx_articles_is_hidden').on(table.isHidden),
]);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

export const articleTags = sqliteTable('article_tags', {
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  tagId: integer('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
});
