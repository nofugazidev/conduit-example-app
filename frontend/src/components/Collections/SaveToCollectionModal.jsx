import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import addArticleToCollection from "../../services/addArticleToCollection";
import createCollection from "../../services/createCollection";
import getArticleCollectionStatus from "../../services/getArticleCollectionStatus";
import getCollections from "../../services/getCollections";
import removeArticleFromCollection from "../../services/removeArticleFromCollection";

function SaveToCollectionModal({ isOpen, onClose, article }) {
  const { headers, isAuth } = useAuth();
  const [collections, setCollections] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const articleIdentifier = article?.slug || article?.id;

  useEffect(() => {
    if (!isOpen || !isAuth || !articleIdentifier) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getCollections({ headers }),
      getArticleCollectionStatus({ slug: articleIdentifier, articleId: article.id, headers }),
    ])
      .then(([cols, statusIds]) => {
        if (!isMounted) return;
        setCollections(cols || []);
        setMemberIds(statusIds || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || "Failed to load collections");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, isAuth, articleIdentifier, headers]);

  if (!isOpen) return null;

  const handleToggle = async (collectionId) => {
    if (togglingId) return;
    setTogglingId(collectionId);
    setError(null);

    const isMember = memberIds.includes(collectionId);
    try {
      if (isMember) {
        await removeArticleFromCollection({
          collectionId,
          slug: articleIdentifier,
          articleId: article.id,
          headers,
        });
        setMemberIds((prev) => prev.filter((id) => id !== collectionId));
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, articleCount: Math.max(0, (c.articleCount || 1) - 1) }
              : c,
          ),
        );
      } else {
        await addArticleToCollection({
          collectionId,
          slug: articleIdentifier,
          articleId: article.id,
          headers,
        });
        setMemberIds((prev) => [...prev, collectionId]);
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, articleCount: (c.articleCount || 0) + 1 }
              : c,
          ),
        );
      }
    } catch (err) {
      setError(err?.message || "Error updating collection");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const created = await createCollection({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        headers,
      });

      // Automatically add this article to the freshly created collection
      await addArticleToCollection({
        collectionId: created.id,
        slug: articleIdentifier,
        articleId: article.id,
        headers,
      });

      setCollections((prev) => [{ ...created, articleCount: 1 }, ...prev]);
      setMemberIds((prev) => [...prev, created.id]);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
    } catch (err) {
      setError(err?.message || "Failed to create collection");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="modal-backdrop-custom"
      onClick={onClose}
      data-testid="save-to-collection-backdrop"
    >
      <div
        className="modal-dialog-custom"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header-custom">
          <h5 className="modal-title-custom">
            <i className="ion-folder" style={{ marginRight: "8px", color: "#5cb85c" }}></i>
            Save to Collection
          </h5>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="modal-body-custom">
          {!isAuth ? (
            <div style={{ textAlign: "center", padding: "1.5rem" }}>
              <p>You need to be logged in to save articles to your private collections.</p>
              <Link to="/login" className="btn btn-sm btn-outline-primary" onClick={onClose}>
                Login
              </Link>
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#818a91" }}>
              Loading collections...
            </div>
          ) : (
            <>
              {error && (
                <div className="alert alert-danger" style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}>
                  {error}
                </div>
              )}

              <p style={{ fontSize: "0.9rem", color: "#555", marginBottom: "1rem" }}>
                Select the collections you would like to save <strong>"{article.title}"</strong> to:
              </p>

              {collections.length === 0 && !showCreate ? (
                <div style={{ textAlign: "center", padding: "1rem", color: "#818a91" }}>
                  <p>You don't have any collections yet.</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => setShowCreate(true)}
                  >
                    <i className="ion-plus"></i> Create your first collection
                  </button>
                </div>
              ) : (
                <div style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "1rem" }}>
                  {collections.map((col) => {
                    const isMember = memberIds.includes(col.id);
                    const isBusy = togglingId === col.id;
                    return (
                      <div
                        key={col.id}
                        className={`collection-checkbox-item ${isMember ? "active" : ""}`}
                        onClick={() => handleToggle(col.id)}
                        data-testid={`collection-option-${col.id}`}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <input
                            type="checkbox"
                            checked={isMember}
                            onChange={() => {}}
                            disabled={isBusy}
                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                          />
                          <div>
                            <span style={{ fontWeight: 600, color: "#373a3c" }}>{col.name}</span>
                            {col.description && (
                              <div style={{ fontSize: "0.78rem", color: "#818a91" }}>
                                {col.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="badge badge-default" style={{ fontSize: "0.75rem" }}>
                          {col.articlesCount ?? col.articleCount ?? 0}{" "}
                          {(col.articlesCount ?? col.articleCount ?? 0) === 1 ? "article" : "articles"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline Create Collection */}
              {showCreate ? (
                <form
                  onSubmit={handleCreate}
                  style={{
                    border: "1px solid #e9ecef",
                    borderRadius: "6px",
                    padding: "0.85rem",
                    backgroundColor: "#fbfbfb",
                    marginTop: "0.75rem",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                    New Collection
                  </div>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Collection name (required)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    style={{ marginBottom: "0.5rem" }}
                    autoFocus
                  />
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Description (optional)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    style={{ marginBottom: "0.75rem" }}
                  />
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowCreate(false)}
                      disabled={creating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-success"
                      disabled={creating || !newName.trim()}
                    >
                      {creating ? "Creating..." : "Create & Add"}
                    </button>
                  </div>
                </form>
              ) : (
                collections.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link"
                    style={{ padding: "0", color: "#5cb85c", textDecoration: "none" }}
                    onClick={() => setShowCreate(true)}
                  >
                    <i className="ion-plus"></i> Create new collection
                  </button>
                )
              )}
            </>
          )}
        </div>

        <div className="modal-footer-custom">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveToCollectionModal;
