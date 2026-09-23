import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function createCollection({ name, description, headers }) {
  try {
    const { data } = await axios({
      method: "POST",
      url: "/api/collections",
      headers,
      data: {
        collection: { name, description },
      },
    });

    return data.collection;
  } catch (error) {
    errorHandler(error);
  }
}

export default createCollection;
