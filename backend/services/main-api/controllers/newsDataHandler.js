import { alphaDB } from "@alpha-view/utils";

async function fetchNews(source) {
  const sourceMapping = {
    ft: "Financial Times",
  };
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

export const getLatestNews = async (req, res) => {
  try {
    const newsSource = req.params.source;
    res.status(200).send(await fetchNews(newsSource));
  } catch (error) {
    console.log(`Failed to query news with NewsSource=${newsSource} from DB`);
    res.status(500).send("Internal Server Error");
  }
};
