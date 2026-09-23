import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function addArticleToCollection({ collectionId, slug, articleId, headers }) {
  const target = slug || articleId;
  try {
    const { data } = await axios({
      method: "POST",
      url: `/api/collections/${collectionId}/articles/${target}`,
      headers,
      data: { articleId, slug },
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default addArticleToCollection;
