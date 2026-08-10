import { articleCache } from "~/lib/cache";

export async function GET() {
  const clearedCount = articleCache.size;
  articleCache.clear();
  return new Response(JSON.stringify({ 
    success: true, 
    message: `Đã xóa thành công ${clearedCount} bài viết khỏi RAM Cache trên Server.` 
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
