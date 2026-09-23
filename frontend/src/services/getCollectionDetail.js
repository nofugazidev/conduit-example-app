import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getCollectionDetail({ id, headers, page = 0, limit = 10 }) {
  try {
    const { data } = await axios({
      url: `/api/collections/${id}?page=${page}&limit=${limit}`,
      headers,
    });

    return data.collection;
  } catch (error) {
    errorHandler(error);
  }
}

export default getCollectionDetail;
