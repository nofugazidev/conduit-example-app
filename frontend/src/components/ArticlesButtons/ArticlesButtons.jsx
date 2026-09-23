import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ArticleAuthorButtons from "../ArticleAuthorButtons";
import { SaveToCollectionButton } from "../Collections";
import FavButton from "../FavButton";
import FollowButton from "../FollowButton";

function ArticlesButtons({ article, setArticle }) {
  const { author: { username } = {}, author } = article || {};
  const { loggedUser, isAuth } = useAuth();
  const { slug } = useParams();

  const followHandler = (author) => {
    setArticle((prev) => ({ ...prev, author }));
  };

  const handleFav = ({ favorited, favoritesCount }) => {
    setArticle((prev) => ({ ...prev, favorited, favoritesCount }));
  };

  return (
    <>
      {loggedUser?.username === username ? (
        <ArticleAuthorButtons {...article} slug={slug} />
      ) : (
        <>
          <FollowButton {...author} handler={followHandler} />
          <FavButton {...article} handler={handleFav} text />
        </>
      )}
      {isAuth && <SaveToCollectionButton article={article} />}
    </>
  );
}

export default ArticlesButtons;
