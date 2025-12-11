/**
 * Web検索・インターネット接続機能
 * リアルタイム情報取得、最新ニュース、天気情報など
 */

import axios from 'axios';

// ==================== インターフェース ====================

export interface WebSearchResult {
	title: string;
	snippet: string;
	url: string;
	source?: string;
}

export interface NewsArticle {
	title: string;
	description: string;
	url: string;
	publishedAt: string;
	source: string;
}

export interface WeatherData {
	location: string;
	temperature: number;
	description: string;
	humidity?: number;
	windSpeed?: number;
}

export interface WikipediaSummary {
	title: string;
	summary: string;
	url: string;
}

// ==================== 設定 ====================

const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ==================== Wikipedia検索 ====================

/**
 * Wikipedia検索 (日本語)
 */
export async function searchWikipedia(
  query: string,
): Promise<WikipediaSummary | null> {
  try {
    const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=1`;

    const searchResponse = await axios.get(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    const searchResults = searchResponse.data.query?.search;
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    const pageTitle = searchResults[0].title;
    const summaryUrl = `https://ja.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}&format=json`;

    const summaryResponse = await axios.get(summaryUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    const pages = summaryResponse.data.query?.pages;
    if (!pages) {
      return null;
    }

    const pageId = Object.keys(pages)[0];
    const extract = pages[pageId]?.extract;

    if (!extract) {
      return null;
    }

    // 最初の3文を取得
    const sentences = extract.split('。').slice(0, 3).join('。');

    return {
      title: pageTitle,
      summary: `${sentences}。`,
      url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
    };
  } catch (error) {
    console.error('Wikipedia検索エラー:', error);
    return null;
  }
}

// ==================== 天気情報 ====================

/**
 * 天気情報取得 (Open-Meteo API - 無料)
 */
export async function getWeather(
  location: string,
): Promise<WeatherData | null> {
  try {
    // 日本の主要都市の座標
    const cities: Record<string, { lat: number; lon: number }> = {
      東京: { lat: 35.6895, lon: 139.6917 },
      大阪: { lat: 34.6937, lon: 135.5023 },
      名古屋: { lat: 35.1815, lon: 136.9066 },
      札幌: { lat: 43.0642, lon: 141.347 },
      福岡: { lat: 33.5904, lon: 130.4017 },
      京都: { lat: 35.0116, lon: 135.7681 },
      神戸: { lat: 34.6901, lon: 135.1955 },
      横浜: { lat: 35.4437, lon: 139.638 },
      仙台: { lat: 38.2682, lon: 140.8694 },
      広島: { lat: 34.3853, lon: 132.4553 },
    };

    const coords = cities[location] || cities.東京;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Tokyo`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    const current = response.data.current;
    if (!current) {
      return null;
    }

    // 天気コードを日本語に変換
    const weatherCode = current.weather_code;
    let description = '不明';
    if (weatherCode === 0) {
      description = '快晴';
    } else if (weatherCode <= 3) {
      description = '晴れ';
    } else if (weatherCode <= 48) {
      description = '曇り';
    } else if (weatherCode <= 67) {
      description = '雨';
    } else if (weatherCode <= 77) {
      description = '雪';
    } else if (weatherCode <= 82) {
      description = 'にわか雨';
    } else {
      description = '雷雨';
    }

    return {
      location,
      temperature: Math.round(current.temperature_2m),
      description,
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m),
    };
  } catch (error) {
    console.error('天気情報取得エラー:', error);
    return null;
  }
}

// ==================== ニュース検索 ====================

/**
 * 最新ニュース取得 (RSS経由)
 */
export async function getLatestNews(
  category = 'general',
): Promise<NewsArticle[]> {
  try {
    // NHKニュースのRSSフィード
    const feedUrls: Record<string, string> = {
      general: 'https://www.nhk.or.jp/rss/news/cat0.xml',
      technology: 'https://www.nhk.or.jp/rss/news/cat5.xml',
      sports: 'https://www.nhk.or.jp/rss/news/cat7.xml',
      culture: 'https://www.nhk.or.jp/rss/news/cat3.xml',
    };

    const feedUrl = feedUrls[category] || feedUrls.general;

    const response = await axios.get(feedUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    // RSSをパース (簡易的な実装)
    const items = response.data.match(/<item>[\s\S]*?<\/item>/g)?.slice(0, 5);
    if (!items) {
      return [];
    }

    const news: NewsArticle[] = items.map((item: string) => {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const descMatch = item.match(/<description>(.*?)<\/description>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      return {
        title: titleMatch ? titleMatch[1].trim() : '',
        description: descMatch ? descMatch[1].replace(/<[^>]*>/g, '') : '',
        url: linkMatch ? linkMatch[1].trim() : '',
        publishedAt: pubDateMatch ? pubDateMatch[1].trim() : '',
        source: 'NHKニュース',
      };
    });

    return news.filter((n) => n.title && n.url);
  } catch (error) {
    console.error('ニュース取得エラー:', error);
    return [];
  }
}

// ==================== Web検索 (DuckDuckGo Instant Answer) ====================

/**
 * Web検索 (DuckDuckGo Instant Answer API)
 */
export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    const data = response.data;
    const results: WebSearchResult[] = [];

    // Abstract (メイン結果)
    if (data.Abstract) {
      results.push({
        title: data.Heading || '検索結果',
        snippet: data.Abstract,
        url: data.AbstractURL || '',
        source: data.AbstractSource || 'DuckDuckGo',
      });
    }

    // RelatedTopics (関連トピック)
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 4)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || '',
            snippet: topic.Text,
            url: topic.FirstURL,
            source: 'DuckDuckGo',
          });
        }
      }
    }

    return results.filter((r) => r.title && r.snippet);
  } catch (error) {
    console.error('Web検索エラー:', error);
    return [];
  }
}

// ==================== 統合検索関数 ====================

/**
 * 質問内容に応じて適切な検索を実行
 */
export async function searchRelevantInfo(query: string): Promise<string> {
  const lowerQuery = query.toLowerCase();

  // 天気情報
  if (
    lowerQuery.includes('天気') ||
		lowerQuery.includes('気温') ||
		lowerQuery.includes('weather')
  ) {
    const cities = [
      '東京',
      '大阪',
      '名古屋',
      '札幌',
      '福岡',
      '京都',
      '神戸',
      '横浜',
      '仙台',
      '広島',
    ];
    const city = cities.find((c) => query.includes(c)) || '東京';
    const weather = await getWeather(city);
    if (weather) {
      return `${weather.location}の天気: ${weather.description}、気温${weather.temperature}℃、湿度${weather.humidity}%、風速${weather.windSpeed}m/s`;
    }
  }

  // ニュース
  if (
    lowerQuery.includes('ニュース') ||
		lowerQuery.includes('最新') ||
		lowerQuery.includes('news')
  ) {
    const category = lowerQuery.includes('技術')
      ? 'technology'
      : lowerQuery.includes('スポーツ')
        ? 'sports'
        : 'general';
    const news = await getLatestNews(category);
    if (news.length > 0) {
      const newsText = news
        .slice(0, 3)
        .map((n) => `・${n.title}`)
        .join('\n');
      return `最新ニュース:\n${newsText}`;
    }
  }

  // Wikipedia検索
  const wiki = await searchWikipedia(query);
  if (wiki) {
    return `${wiki.title}について:\n${wiki.summary}\n詳細: ${wiki.url}`;
  }

  // Web検索 (フォールバック)
  const webResults = await searchWeb(query);
  if (webResults.length > 0) {
    const result = webResults[0];
    return `${result.title}:\n${result.snippet}\n詳細: ${result.url}`;
  }

  return 'インターネットで情報を見つけられませんでした。別の質問をしてみてください。';
}

// ==================== 会話コンテキスト用のヘルパー ====================

/**
 * 質問がインターネット検索を必要とするか判定
 */
export function needsWebSearch(message: string): boolean {
  const keywords = [
    '天気',
    '気温',
    'ニュース',
    '最新',
    '今日',
    '現在',
    'what is',
    'who is',
    'when',
    'where',
    'について',
    'とは',
    'って何',
    '教えて',
  ];

  const lowerMessage = message.toLowerCase();
  return keywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * 検索結果を会話に組み込む
 */
export function formatSearchResultForChat(info: string): string {
  return `ちょっと調べてみたよ！\n\n${info}\n\nこれで合ってるかな？他に知りたいことある？`;
}
