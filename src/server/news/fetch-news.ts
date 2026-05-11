/**
 * 新浪滚动新闻抓取 — 财经 / 科技 / 时政三大类。
 *
 * 免费公开接口，无需 API Key。
 * 用于每日简报的 newsHighlights 输入。
 */

const SINA_ROLL_API = "https://feed.mix.sina.com.cn/api/roll/get?pageid=153";
const SINA_REFERER = "https://news.sina.com.cn";

export interface NewsItem {
  title: string;
  impact: "positive" | "negative" | "neutral";
  importance: "high" | "medium" | "low";
  summary: string;
  category?: string; // 财经 / 科技 / 国内
}

// 新浪滚动新闻分类
// 科技新闻从财经频道筛选（关键词匹配），财经+时政直接用频道
const CATEGORIES = [
  { name: "财经", lid: "2509", count: 30, filter: null as null | ((t: string) => boolean) },
  { name: "科技", lid: "2509", count: 80, filter: (t: string) => /科技|AI|芯片|特斯拉|苹果|华为|数据|5G|新能源|自动|机器|量子|英伟达|微软|谷歌|元宇|Web3|区块|半导体|云计算|SaaS/.test(t) },
  { name: "时政", lid: "2510", count: 30, filter: null as null | ((t: string) => boolean) },
] as const;

const HIGH_KEYWORDS = ["重磅", "突发", "央行", "政策", "降息", "加息", "制裁"];

function inferImportance(item: { title?: string; keywords?: string | null; intro?: string | null }): "high" | "medium" | "low" {
  const text = `${item.title ?? ""} ${item.keywords ?? ""} ${item.intro ?? ""}`;
  if (HIGH_KEYWORDS.some((kw) => text.includes(kw))) return "high";
  return "medium";
}

async function fetchCategory(lid: string, count: number, catName: string, filter?: ((t: string) => boolean) | null): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const fetchCount = filter ? Math.min(count * 3, 100) : Math.min(count * 2, 60);
    const url = `${SINA_ROLL_API}&lid=${lid}&k=&num=${fetchCount}`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Referer: SINA_REFERER },
    });

    if (!resp.ok) {
      console.warn(`[News] 新浪新闻 lid=${lid} HTTP ${resp.status}`);
      return [];
    }

    const body = await resp.json() as {
      result?: { data?: Array<{ title?: string; intro?: string | null; keywords?: string | null }> };
    };

    const items = body?.result?.data;
    if (!items || !Array.isArray(items)) return [];

    const news: NewsItem[] = [];
    for (const item of items) {
      if (!item.title || news.length >= count) break;
      if (filter && !filter(item.title)) continue;
      news.push({
        title: item.title,
        impact: "neutral",
        importance: inferImportance(item),
        summary: item.intro || item.title,
        category: catName,
      });
    }

    return news;
  } catch (err) {
    console.warn(`[News] 抓取 lid=${lid} 失败:`, (err as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const IMPORTANCE_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * 抓取财经+科技+时政新闻，每类各取 Top 10（按重要性排序），共 30 条。
 * 任何异常均静默降级，返回已抓取到的部分。
 */
export async function fetchFinancialNews(): Promise<NewsItem[]> {
  const results = await Promise.all(
    CATEGORIES.map((cat) => fetchCategory(cat.lid, cat.count, cat.name, cat.filter)),
  );

  // 每类取 Top 10，科技优先处理（避免被财经抢走）
  const usedTitles = new Set<string>();
  const merged: NewsItem[] = [];

  // Process tech first (index 1), then finance (0), then politics (2)
  const processOrder = [1, 0, 2];
  for (const idx of processOrder) {
    const batch = results[idx];
    batch.sort((a, b) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance]);
    let taken = 0;
    for (const item of batch) {
      if (taken >= 10) break;
      if (!usedTitles.has(item.title)) {
        merged.push(item);
        usedTitles.add(item.title);
        taken++;
      }
    }
  }

  // 去重
  const seen = new Set<string>();
  return merged.filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
}
