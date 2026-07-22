export interface NewsArticle {
  id: number;
  headline: string;
  datetime: Date;
  url: string;
  source: string;
  category?: NewsCategory;
  image?: string;
  summary?: string;
}

export type NewsCategory =
  | "general"
  | "forex"
  | "crypto"
  | "merger"
  | "technology"
  | "business"
  | "top news";
