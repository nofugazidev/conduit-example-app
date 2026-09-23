import React, { useState } from "react";
import SaveToCollectionModal from "./SaveToCollectionModal";

function SaveToCollectionButton({ article, className = "btn btn-sm btn-outline-primary", text = "Save to Collection" }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!article) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setModalOpen(true);
        }}
        data-testid={`save-collection-btn-${article.slug || article.id}`}
        title="Save to Collection"
        style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
      >
        <i className="ion-folder"></i>
        {text && <span>{text}</span>}
      </button>

      {modalOpen && (
        <SaveToCollectionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          article={article}
        />
      )}
    </>
  );
}

export default SaveToCollectionButton;
