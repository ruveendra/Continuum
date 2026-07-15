"use client";

import { useState, useEffect } from "react";
import type { PersonalizeTile } from "@/types/personalize";

type Props = {
  tile: PersonalizeTile;
  onSave: (patch: Partial<PersonalizeTile>) => void;
  onClose: () => void;
};

// The right-side panel for editing one tile's title + prompt text.
// Uses LOCAL state for the input fields (title/prompt) rather than writing
// to the store on every keystroke — this means typing feels instant and
// nothing is saved until the user explicitly clicks Save, so accidental
// edits can be discarded by just closing the panel.
export default function TilePromptEditor({ tile, onSave, onClose }: Props) {
  const [title, setTitle] = useState(tile.title);
  const [prompt, setPrompt] = useState(tile.prompt);

  // If the user clicks Edit on a DIFFERENT tile while this panel is
  // already open, `tile` prop changes — this resets the local fields to
  // match the newly selected tile instead of showing stale text.
  useEffect(() => {
    setTitle(tile.title);
    setPrompt(tile.prompt);
  }, [tile]);

  const handleSave = () => {
    onSave({ title, prompt });
    onClose();
  };

  return (
    <div className="tile-editor-panel">
      <div className="tile-editor-header">
        <h3>Edit style</h3>
        <button type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <label className="tile-editor-label">
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="tile-editor-label tile-editor-prompt-field">
        Prompt
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe how the AI should write — tone, structure, dos and don'ts…"
        />
      </label>

      <div className="tile-editor-actions">
        <button type="button" className="tile-editor-cancel" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="tile-editor-save" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}