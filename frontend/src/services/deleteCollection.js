import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function deleteCollection({ id, headers }) {
  try {
    const { data } = await axios({
      method: "DELETE",
      url: `/api/collections/${id}`,
      headers,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default deleteCollection;
