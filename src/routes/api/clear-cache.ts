import { clearAllCache } from "~/lib/cache";

export async function GET() {
  const result = await clearAllCache();
  return new Response(
    JSON.stringify({
      success: true,
      message: `Đã làm sạch toàn bộ bộ nhớ cache (RAM: ${result.memoryCount} mục, Upstash Redis: ${result.redisCleared ? "Đã làm sạch" : "N/A"}).`,
      details: result,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
