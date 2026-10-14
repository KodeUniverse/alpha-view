import { z } from "zod";

//====================================================================================================
//                                                 ZOD SCHEMAS
//====================================================================================================

export const NewsCategorySchema = z.enum([
  "general",
  "forex",
  "crypto",
  "merger",
  "technology",
  "business",
  "top news",
]);

export const NewsArticleSchema = z.object({
  id: z.number(),
  headline: z.string(),
  datetime: z.coerce.date(),
  url: z.string(),
  source: z.string(),
  category: NewsCategorySchema.optional(),
  image: z.string().optional(),
  summary: z.string().optional(),
});

//====================================================================================================
//                                                 TYPES
//====================================================================================================

export type NewsCategory = z.infer<typeof NewsCategorySchema>;
export type NewsArticle = z.infer<typeof NewsArticleSchema>;