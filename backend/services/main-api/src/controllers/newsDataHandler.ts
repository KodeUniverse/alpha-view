import { alphaDB } from "@alpha-view/utils";
import { Request, Response } from "express";
import { NewsArticle } from "@shared/types";

const sourceMapping: Record<string, string> = {
  ft: "Financial Times",
};

async function fetchNews(source: string): Promise<NewsArticle[]> {
  console.log(`Source mapped: ${source} `);
  if (!sourceMapping[source])
    throw new Error(
      `Passed source: '${source}' is not correct or does not exist.`,
    );

  const articles = await alphaDB.query(
    "SELECT ArticleId, Headline, Descr, URL, PubDate, NewsSource FROM Article WHERE NewsSource = $1;",
    [sourceMapping[source]],
  );
  const res = articles.rows;
  console.log(`Type of articles object:${typeof res}`);
  console.log(`Value of articles object.keys: ${Object.keys(res)}`);
  if (Object.keys(res).length === 0) {
    throw new Error("Fetched articles are null!");
  }
  return res;
}

export const getLatestNews = async (
  req: Request<{ source: string }>,
  res: Response<NewsArticle[] | string>,
) => {
  const newsSource = req.params.source;
  try {
    res.status(200).send(await fetchNews(newsSource));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.stack : String(error);
    console.log(
      `Failed to query news with NewsSource=${sourceMapping[newsSource]} from DB\n\n${errorMsg}`,
    );
    res.status(500).send("Internal Server Error");
  }
};
