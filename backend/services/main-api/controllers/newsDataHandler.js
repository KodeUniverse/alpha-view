import { alphaDB } from "@alpha-view/utils";

export const get_latest_news = async (req, res) => {
  const articles = await alphaDB.query(
    "SELECT ArticleId, Headline, Descr, URL, PubDate, NewsSource FROM Article",
  );
  res.status(200).send(articles.rows);
};
