import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BannerContainer from "../../components/BannerContainer";
import { useAuth } from "../../context/AuthContext";
import dateFormatter from "../../helpers/dateFormatter";
import createCollection from "../../services/createCollection";
import deleteCollection from "../../services/deleteCollection";
import getCollections from "../../services/getCollections";
import updateCollection from "../../services/updateCollection";

function CollectionsList() {
  const { headers, isAuth } = useAuth();
  const navigate = useNavigate();

  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'delete' | null
  const [selectedCol, setSelectedCol] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getCollections({ headers })
      .then((data) => {
        if (isMounted) setCollections(data || []);
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || "Failed to load collections");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [headers, isAuth]);

  // Handlers for modal opening
  const handleOpenCreate = () => {
    setSelectedCol(null);
    setFormName("");
    setFormDesc("");
    setModalError(null);
    setModalMode("create");
  };

  const handleOpenEdit = (col) => {
    setSelectedCol(col);
    setFormName(col.name);
    setFormDesc(col.description || "");
    setModalError(null);
    setModalMode("edit");
  };

  const handleOpenDelete = (col) => {
    setSelectedCol(col);
    setModalError(null);
    setModalMode("delete");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedCol(null);
    setModalError(null);
  };

  // Form submission: Create or Edit
  const handleSaveCollection = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError("Collection name is required");
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      if (modalMode === "create") {
        const created = await createCollection({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          headers,
        });
        setCollections((prev) => [{ ...created, articleCount: 0 }, ...prev]);
      } else if (modalMode === "edit" && selectedCol) {
        const updated = await updateCollection({
          id: selectedCol.id,
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          headers,
        });
        setCollections((prev) =>
          prev.map((c) => (c.id === selectedCol.id ? { ...c, ...updated } : c)),
        );
      }
      handleCloseModal();
    } catch (err) {
      setModalError(err?.message || "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Form submission: Delete
  const handleDeleteConfirm = async () => {
    if (!selectedCol) return;
    setSubmitting(true);
    setModalError(null);

    try {
      await deleteCollection({ id: selectedCol.id, headers });
      setCollections((prev) => prev.filter((c) => c.id !== selectedCol.id));
      handleCloseModal();
    } catch (err) {
      setModalError(err?.message || "Failed to delete collection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuth) {
    return (
      <div className="collections-page">
        <BannerContainer>
          <h1>My Collections</h1>
          <p>Your private, curated reading library.</p>
        </BannerContainer>
        <div className="container page">
          <div className="collection-empty">
            <i className="ion-locked" style={{ fontSize: "3rem", color: "#818a91" }}></i>
            <h3 style={{ marginTop: "1rem" }}>Authentication Required</h3>
            <p>You must be signed in to view and manage your private collections.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="collections-page">
      <BannerContainer>
        <h1>My Collections</h1>
        <p>Curate, organize, and safeguard your private article library.</p>
      </BannerContainer>

      <div className="container page">
        {/* Top Header Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h4 style={{ margin: 0, color: "#373a3c" }}>
            {collections.length} {collections.length === 1 ? "Collection" : "Collections"}
          </h4>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleOpenCreate}
            data-testid="create-collection-btn"
          >
            <i className="ion-plus"></i> New Collection
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#818a91" }}>
            Loading collections...
          </div>
        ) : collections.length === 0 ? (
          <div className="collection-empty" data-testid="empty-collections-state">
            <i className="ion-folder" style={{ fontSize: "3.5rem", color: "#bbb" }}></i>
            <h3 style={{ marginTop: "1rem" }}>No collections yet</h3>
            <p style={{ color: "#777", maxWidth: "450px", margin: "0.5rem auto 1.5rem" }}>
              Organize articles into custom private collections for easy reading later.
            </p>
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={handleOpenCreate}
            >
              <i className="ion-plus"></i> Create your first collection
            </button>
          </div>
        ) : (
          <div className="row" data-testid="collections-grid">
            {collections.map((col) => (
              <div className="col-md-6 col-xs-12" key={col.id}>
                <div className="collection-card" data-testid={`collection-card-${col.id}`}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.6rem",
                    }}
                  >
                    <Link
                      to={`/collections/${col.id}`}
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        color: "#373a3c",
                        textDecoration: "none",
                      }}
                      data-testid={`collection-title-${col.id}`}
                    >
                      <i
                        className="ion-folder"
                        style={{ marginRight: "8px", color: "#5cb85c" }}
                      ></i>
                      {col.name}
                    </Link>
                    <span
                      className="collection-badge"
                      data-testid={`collection-count-${col.id}`}
                    >
                      {col.articlesCount ?? col.articleCount ?? 0} {(col.articlesCount ?? col.articleCount ?? 0) === 1 ? "article" : "articles"}
                    </span>
                  </div>

                  <p
                    style={{
                      color: "#666",
                      fontSize: "0.92rem",
                      minHeight: "2.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {col.description || (
                      <em style={{ color: "#aaa" }}>No description provided.</em>
                    )}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid #f0f0f0",
                      paddingTop: "0.75rem",
                    }}
                  >
                    <span style={{ fontSize: "0.78rem", color: "#999" }}>
                      Created {dateFormatter(col.createdAt)}
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Link
                        to={`/collections/${col.id}`}
                        className="btn btn-sm btn-outline-primary"
                        data-testid={`view-collection-${col.id}`}
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleOpenEdit(col)}
                        data-testid={`edit-collection-${col.id}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleOpenDelete(col)}
                        data-testid={`delete-collection-${col.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="modal-backdrop-custom" onClick={handleCloseModal}>
          <div
            className="modal-dialog-custom"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <form onSubmit={handleSaveCollection}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom">
                  <i
                    className="ion-folder"
                    style={{ marginRight: "8px", color: "#5cb85c" }}
                  ></i>
                  {modalMode === "create" ? "Create New Collection" : "Edit Collection"}
                </h5>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleCloseModal}
                >
                  &times;
                </button>
              </div>

              <div className="modal-body-custom">
                {modalError && (
                  <div
                    className="alert alert-danger"
                    style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                  >
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
                    placeholder="e.g., System Design Deep Dives"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    autoFocus
                    data-testid="collection-name-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                  <label style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                    Description (optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Brief summary of articles in this collection..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    data-testid="collection-desc-input"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-success"
                  disabled={submitting || !formName.trim()}
                  data-testid="save-collection-submit-btn"
                >
                  {submitting
                    ? "Saving..."
                    : modalMode === "create"
                    ? "Create Collection"
                    : "Update Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === "delete" && selectedCol && (
        <div className="modal-backdrop-custom" onClick={handleCloseModal}>
          <div
            className="modal-dialog-custom"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header-custom">
              <h5 className="modal-title-custom" style={{ color: "#d9534f" }}>
                <i className="ion-trash-a" style={{ marginRight: "8px" }}></i>
                Delete Collection
              </h5>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
              >
                &times;
              </button>
            </div>

            <div className="modal-body-custom">
              {modalError && (
                <div
                  className="alert alert-danger"
                  style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                >
                  {modalError}
                </div>
              )}
              <p>
                Are you sure you want to delete the collection{" "}
                <strong>"{selectedCol.name}"</strong>?
              </p>
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
                <strong>Safe Deletion Guarantee:</strong> The collection will be removed, but all
                articles inside it will remain safe and unaffected in Conduit.
              </div>
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                data-testid="confirm-delete-collection-btn"
              >
                {submitting ? "Deleting..." : "Yes, Delete Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollectionsList;
