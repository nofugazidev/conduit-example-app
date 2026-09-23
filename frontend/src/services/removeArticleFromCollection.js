import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function removeArticleFromCollection({ collectionId, slug, articleId, headers }) {
  const target = slug || articleId;
  try {
    const { data } = await axios({
      method: "DELETE",
      url: `/api/collections/${collectionId}/articles/${target}`,
      headers,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default removeArticleFromCollection;
