import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getCollections({ headers }) {
  try {
    const { data } = await axios({
      url: "/api/collections",
      headers,
    });

    return data.collections;
  } catch (error) {
    errorHandler(error);
  }
}

export default getCollections;
