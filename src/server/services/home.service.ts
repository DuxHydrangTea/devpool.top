import { docService } from "./doc.service";

export class HomeService {
  /**
   * Fetch structured data for the landing page (only public, visible content)
   */
  async getHomeData() {
    const tree = await docService.getSidebarTree(false);

    const groups = tree.categories.filter((c) => c.type === "group");
    const latestArticles = tree.articles.slice(0, 6);

    return {
      groups,
      categories: tree.categories,
      latestArticles,
    };
  }
}

export const homeService = new HomeService();
