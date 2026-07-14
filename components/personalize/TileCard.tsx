"use client";

import { useState } from "react";
import type { PersonalizeTile } from "@/types/personalize";
import DeleteConfirmModal from "./DeleteConfirmModal";

type Props = {
  tile: PersonalizeTile;
  isActive: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TileCard({ tile, isActive, onApply, onEdit, onDelete }: Props) {
  // Tracks whether the delete confirmation modal is currently open for
  // THIS specific tile card.
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteModal(false);
  };

  return (
    <div className={`tile-card ${isActive ? "tile-card-active" : ""}`}>
      {!tile.isDefault && (
        <button
          type="button"
          className="tile-card-delete"
          onClick={() => setShowDeleteModal(true)}
          aria-label="Delete style"
        >
          ×
        </button>
      )}

      <h3 className="tile-card-title">{tile.title}</h3>
      <p className="tile-card-preview">{tile.prompt || "No prompt written yet"}</p>

      <div className="tile-card-actions">
        <button type="button" onClick={onApply}>
          {isActive ? "Applied" : "Apply"}
        </button>
        <button type="button" onClick={onEdit}>
          Edit
        </button>
      </div>

      {showDeleteModal && (
        <DeleteConfirmModal
          tileTitle={tile.title}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}