import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getArticleCollectionStatus({ slug, articleId, headers }) {
  const target = slug || articleId;
  try {
    const { data } = await axios({
      url: `/api/collections/status/${target}`,
      headers,
    });

    if (data.collectionIds) {
      return data.collectionIds;
    }
    if (data.collections) {
      return data.collections.filter((c) => c.inCollection).map((c) => c.id);
    }
    return [];
  } catch (error) {
    errorHandler(error);
  }
}

export default getArticleCollectionStatus;
