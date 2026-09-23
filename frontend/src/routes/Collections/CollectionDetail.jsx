import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ArticleMeta from "../../components/ArticleMeta";
import ArticleTags from "../../components/ArticleTags";
import BannerContainer from "../../components/BannerContainer";
import { useAuth } from "../../context/AuthContext";
import deleteCollection from "../../services/deleteCollection";
import getCollectionDetail from "../../services/getCollectionDetail";
import removeArticleFromCollection from "../../services/removeArticleFromCollection";
import updateCollection from "../../services/updateCollection";

function CollectionDetail() {
  const { id } = useParams();
  const { headers, isAuth } = useAuth();
  const navigate = useNavigate();

  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const limit = 10;

  // Edit / Delete Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [removingArticleId, setRemovingArticleId] = useState(null);

  const fetchCollection = () => {
    if (!isAuth) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getCollectionDetail({ id, headers, page, limit })
      .then((data) => {
        setCollection(data);
        if (data) {
          setFormName(data.name || "");
          setFormDesc(data.description || "");
        }
      })
      .catch((err) => {
        setError(err?.response?.status === 404 ? "Collection not found" : err?.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCollection();
  }, [id, headers, isAuth, page]);

  // Handle Remove Article
  const handleRemoveArticle = async (article) => {
    const target = article.slug || article.id;
    if (removingArticleId) return;
    setRemovingArticleId(target);

    try {
      await removeArticleFromCollection({
        collectionId: id,
        slug: target,
        articleId: article.id,
        headers,
      });

      setCollection((prev) => ({
        ...prev,
        articlesCount: Math.max(0, (prev.articlesCount || 1) - 1),
        articles: prev.articles.filter((a) => (a.slug || a.id) !== target),
      }));
    } catch (err) {
      alert(err?.message || "Failed to remove article from collection");
    } finally {
      setRemovingArticleId(null);
    }
  };

  // Handle Edit Collection
  const handleUpdateCollection = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setModalSubmitting(true);
    setModalError(null);

    try {
      const updated = await updateCollection({
        id,
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        headers,
      });
      setCollection((prev) => ({ ...prev, ...updated }));
      setEditOpen(false);
    } catch (err) {
      setModalError(err?.message || "Failed to update collection");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Delete Collection
  const handleDeleteCollection = async () => {
    setModalSubmitting(true);
    setModalError(null);

    try {
      await deleteCollection({ id, headers });
      navigate("/collections", { replace: true });
    } catch (err) {
      setModalError(err?.message || "Failed to delete collection");
      setModalSubmitting(false);
    }
  };

  if (!isAuth) {
    return (
      <div className="collections-page">
        <BannerContainer>
          <h1>My Collections</h1>
          <p>Please log in to view this collection.</p>
        </BannerContainer>
        <div className="container page">
          <div className="collection-empty">
            <h3>Authentication Required</h3>
            <p>You must be signed in to access private collections.</p>
            <Link to="/login" className="btn btn-primary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container page" style={{ textAlign: "center", padding: "4rem" }}>
        Loading collection...
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="container page">
        <div className="collection-empty" data-testid="collection-not-found">
          <i className="ion-alert-circled" style={{ fontSize: "3rem", color: "#d9534f" }}></i>
          <h3 style={{ marginTop: "1rem" }}>Collection Not Found</h3>
          <p style={{ color: "#777" }}>
            This collection does not exist or you do not have permission to view it.
          </p>
          <Link to="/collections" className="btn btn-outline-primary" style={{ marginTop: "1rem" }}>
            &larr; Back to My Collections
          </Link>
        </div>
      </div>
    );
  }

  const { name, description, articles = [], articlesCount = 0 } = collection;
  const totalPages = Math.ceil(articlesCount / limit);

  return (
    <div className="collection-detail-page">
      <BannerContainer>
        <div style={{ marginBottom: "0.5rem" }}>
          <Link
            to="/collections"
            style={{ color: "#ffffff", opacity: 0.85, textDecoration: "none", fontSize: "0.9rem" }}
          >
            &larr; Back to My Collections
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h1 data-testid="collection-detail-name">
              <i className="ion-folder" style={{ marginRight: "10px" }}></i>
              {name}
            </h1>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {description || <em>No description provided.</em>}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              className="collection-badge"
              style={{ backgroundColor: "rgba(255,255,255,0.25)", color: "#fff", padding: "0.4rem 0.8rem" }}
              data-testid="collection-detail-count"
            >
              {articlesCount} {articlesCount === 1 ? "article" : "articles"}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              style={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => {
                setFormName(name);
                setFormDesc(description || "");
                setEditOpen(true);
              }}
              data-testid="edit-collection-btn"
            >
              <i className="ion-edit"></i> Edit
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              style={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => setDeleteOpen(true)}
              data-testid="delete-collection-btn"
            >
              <i className="ion-trash-a"></i> Delete
            </button>
          </div>
        </div>
      </BannerContainer>

      <div className="container page">
        <div className="row">
          <div className="col-md-9 col-xs-12">
            {articles.length === 0 ? (
              <div className="collection-empty" data-testid="empty-collection-articles">
                <i className="ion-ios-bookmarks-outline" style={{ fontSize: "3rem", color: "#bbb" }}></i>
                <h3 style={{ marginTop: "1rem" }}>No articles saved yet</h3>
                <p style={{ color: "#777", maxWidth: "480px", margin: "0.5rem auto 1.5rem" }}>
                  Browse through Conduit articles and click "Save to Collection" to curate your reading list.
                </p>
                <Link to="/" className="btn btn-outline-primary">
                  Browse Feed
                </Link>
              </div>
            ) : (
              <div data-testid="collection-articles-list">
                {articles.map((article) => (
                  <div className="article-preview" key={article.slug} data-testid={`article-item-${article.slug}`}>
                    <ArticleMeta author={article.author} createdAt={article.createdAt}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger pull-xs-right"
                        onClick={() => handleRemoveArticle(article)}
                        disabled={removingArticleId === (article.slug || article.id)}
                        data-testid={`remove-article-btn-${article.slug}`}
                        title="Remove from this collection"
                      >
                        <i className="ion-trash-a"></i> Remove
                      </button>
                    </ArticleMeta>

                    <Link to={`/article/${article.slug}`} state={article} className="preview-link">
                      <h1>{article.title}</h1>
                      <p>{article.description}</p>
                      <span>Read more...</span>
                      <ArticleTags tagList={article.tagList} />
                    </Link>
                  </div>
                ))}

                {totalPages > 1 && (
                  <nav>
                    <ul className="pagination">
                      {Array.from({ length: totalPages }, (_, idx) => (
                        <li
                          key={idx}
                          className={`page-item ${idx === page ? "active" : ""}`}
                          onClick={() => setPage(idx)}
                        >
                          <span className="page-link cursor-pointer">{idx + 1}</span>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="col-md-3 col-xs-12">
            <div className="sidebar" style={{ background: "#f8f9fa", borderRadius: "8px", padding: "1.25rem" }}>
              <h5 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#373a3c" }}>
                <i className="ion-locked" style={{ marginRight: "6px" }}></i>
                Private Collection
              </h5>
              <p style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.5 }}>
                This collection is private to your account. Only you can view or edit its contents.
              </p>
              <hr />
              <div style={{ fontSize: "0.82rem", color: "#888" }}>
                <div><strong>Collection ID:</strong> #{id}</div>
                <div style={{ marginTop: "4px" }}><strong>Total Articles:</strong> {articlesCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="modal-backdrop-custom" onClick={() => setEditOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} role="dialog">
            <form onSubmit={handleUpdateCollection}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom">
                  <i className="ion-edit" style={{ marginRight: "8px", color: "#5cb85c" }}></i>
                  Edit Collection
                </h5>
                <button type="button" className="modal-close-btn" onClick={() => setEditOpen(false)}>
                  &times;
                </button>
              </div>

              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert alert-danger" style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}>
                    {modalError}
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                    Collection Name <span style={{ color: "#d9534f" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    autoFocus
                    data-testid="edit-collection-name-input"
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.88rem" }}>Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    data-testid="edit-collection-desc-input"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setEditOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-success"
                  disabled={modalSubmitting || !formName.trim()}
                  data-testid="edit-collection-submit-btn"
                >
                  {modalSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteOpen && (
        <div className="modal-backdrop-custom" onClick={() => setDeleteOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="modal-header-custom">
              <h5 className="modal-title-custom" style={{ color: "#d9534f" }}>
                <i className="ion-trash-a" style={{ marginRight: "8px" }}></i>
                Delete Collection
              </h5>
              <button type="button" className="modal-close-btn" onClick={() => setDeleteOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body-custom">
              {modalError && (
                <div className="alert alert-danger" style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}>
                  {modalError}
                </div>
              )}
              <p>Are you sure you want to delete <strong>"{name}"</strong>?</p>
              <div
                style={{
                  background: "#fdf8e2",
                  border: "1px solid #f6d155",
                  borderRadius: "6px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.85rem",
                  color: "#8a6d3b",
                }}
              >
                <i className="ion-information-circled" style={{ marginRight: "6px" }}></i>
                <strong>Safe Deletion:</strong> The collection will be deleted, but all {articlesCount} articles will remain intact in Conduit.
              </div>
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setDeleteOpen(false)}
                disabled={modalSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleDeleteCollection}
                disabled={modalSubmitting}
                data-testid="confirm-delete-detail-btn"
              >
                {modalSubmitting ? "Deleting..." : "Yes, Delete Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollectionDetail;
