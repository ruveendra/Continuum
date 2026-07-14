"use client";

import { useState } from "react";
import { usePersonalizeStore, MAX_TILES } from "@/lib/personalize/personalizeStore";
import TileCard from "./TileCard";

export default function PersonalizeView() {
  const tiles = usePersonalizeStore((s) => s.tiles);
  const activeTileId = usePersonalizeStore((s) => s.activeTileId);
  const addTile = usePersonalizeStore((s) => s.addTile);
  const removeTile = usePersonalizeStore((s) => s.removeTile);
  const setActiveTile = usePersonalizeStore((s) => s.setActiveTile);

  const [capWarning, setCapWarning] = useState(false);

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
    console.log("Edit clicked for tile:", tileId);
  };

  return (
    <div className="personalize-view">
      <div className="personalize-header">
        <h2>Personalize</h2>
        <button type="button" onClick={handleAddTile}>
          + New style
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
            onEdit={() => handleEdit(tile.id)}
            onDelete={() => removeTile(tile.id)}
          />
        ))}
      </div>
    </div>
  );
}