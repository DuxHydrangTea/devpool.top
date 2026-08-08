import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'group', 'category', 'chapter'
  parentId: integer('parent_id'),
  order: integer('order_num').default(0).notNull(),
  slug: text('slug').notNull().default(''),
});

export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  contentMd: text('content_md'),
  chapterId: integer('chapter_id').references(() => categories.id, { onDelete: 'cascade' }),
  order: integer('order_num').default(0).notNull(),
  slug: text('slug').notNull().default(''),
});

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
