export interface NewsArticle {
  articleid: string;
  headline: string;
  descr: string;
  pubdate: Date;
  url: string;
  newssource: string;
}

export type NewsCategory =
  | "general"
  | "forex"
  | "crypto"
  | "merger"
  | "technology"
  | "business"
  | "top news";
