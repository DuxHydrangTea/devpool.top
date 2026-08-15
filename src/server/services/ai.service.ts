export class AIService {
  /**
   * Generate high quality technical Markdown documentation using EXA AI
   */
  async generateTechnicalArticle(prompt: string): Promise<string> {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      throw new Error("Vui lòng nhập chủ đề cần sinh bài viết");
    }

    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error("EXA_API_KEY chưa được cấu hình trong tệp .env");
    }

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: trimmedPrompt,
        type: "auto",
        systemPrompt:
          "You are an expert technical author. Write a comprehensive, well-structured educational article in Markdown format (in Vietnamese) about the requested topic based on the search results. Include clear explanations, headings, code examples, best practices, and tips.",
        outputSchema: {
          type: "object",
          properties: {
            article: {
              type: "string",
              description: "The complete article body formatted in standard Markdown",
            },
          },
          required: ["article"],
        },
        contents: {
          highlights: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi kết nối EXA AI (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.output?.content?.article) {
      throw new Error("EXA AI không trả về nội dung bài viết hợp lệ");
    }

    return data.output.content.article;
  }
}

export const aiService = new AIService();
