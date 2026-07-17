"use client";

import { useState } from "react";
import { usePersonalizeStore, MAX_TILES } from "@/lib/personalize/personalizeStore";
import TileCard from "./TileCard";
import TilePromptEditor from "./TilePromptEditor";
import { InfoIcon, PlusIcon } from "@/components/editor/ToolbarIcons";

export default function PersonalizeView() {
  const tiles = usePersonalizeStore((s) => s.tiles);
  const activeTileId = usePersonalizeStore((s) => s.activeTileId);
  const addTile = usePersonalizeStore((s) => s.addTile);
  const removeTile = usePersonalizeStore((s) => s.removeTile);
  const setActiveTile = usePersonalizeStore((s) => s.setActiveTile);

  const [capWarning, setCapWarning] = useState(false);
  const [editingTileId, setEditingTileId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const editingTile = tiles.find((t) => t.id === editingTileId) ?? null;
  const updateTile = usePersonalizeStore((s) => s.updateTile);

  const handleAddTile = () => {
    const created = addTile({
      id: crypto.randomUUID(),
      title: "Untitled style",
      prompt: "",
      isDefault: false, // anything created through the UI is always deletable
    });

    if (!created) {
      setCapWarning(true);
    }
  };

  const handleEdit = (tileId: string) => {
    setEditingTileId(tileId);
  };

 return (
  <div className="personalize-layout">
    <div className="personalize-view">
      <div className="personalize-header">
        <h2>Personalize Your Writing Style</h2>
        <button type="button" className="personalize-add-button" onClick={handleAddTile}>
          <PlusIcon />
          New style
        </button>
      </div>

      {capWarning && (
        <p className="personalize-cap-warning">
          Max {MAX_TILES} styles reached — delete one to add another.
        </p>
      )}

      <div className="personalize-grid">
        {tiles.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            isActive={tile.id === activeTileId}
            onApply={() => setActiveTile(tile.id)}
            onUnapply={() => setActiveTile(null)}
            onEdit={() => handleEdit(tile.id)}
            onDelete={() => removeTile(tile.id)}
          />
        ))}
      </div>
    </div>

    {/* Panel only renders when a tile is actively being edited — this is
        what makes it feel like a slide-in/appear panel rather than
        permanent screen real estate. */}
    {editingTile && (
      <TilePromptEditor
        tile={editingTile}
        onSave={(patch) => updateTile(editingTile.id, patch)}
        onClose={() => setEditingTileId(null)}
      />
    )}

    {showInfo && (
      <div className={`personalize-info-bubble${editingTile ? " personalize-info-bubble-shifted" : ""}`}>
        <div className="personalize-info-icon">
          <InfoIcon />
        </div>
        <div className="personalize-info-body">
          <div className="personalize-info-header">
            <p className="personalize-info-title">What&apos;s this?</p>
            <button
              type="button"
              className="personalize-info-close"
              onClick={() => setShowInfo(false)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <p className="personalize-info-text">
            This is where you shape the AI&apos;s voice. Each tile is a writing
            style you define, and whichever one is active guides how the AI
            writes and edits for you.
          </p>
        </div>
      </div>
    )}
  </div>
);
}