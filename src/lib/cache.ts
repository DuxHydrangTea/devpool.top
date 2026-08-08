// A simple in-memory cache for server-side
// Helps avoid hitting Turso DB and parsing Markdown repeatedly for the same article.
export const articleCache = new Map<string, any>();
// force reload
