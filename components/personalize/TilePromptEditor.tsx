"use client";

import { useState, useEffect } from "react";
import type { PersonalizeTile } from "@/types/personalize";
import { EditIcon } from "@/components/editor/ToolbarIcons";

type Props = {
  tile: PersonalizeTile;
  onSave: (patch: Partial<PersonalizeTile>) => void;
  onClose: () => void;
};

const PROMPT_MAX_LENGTH = 600;

export default function TilePromptEditor({ tile, onSave, onClose }: Props) {
  const [title, setTitle] = useState(tile.title);
  const [prompt, setPrompt] = useState(tile.prompt);

  useEffect(() => {
    setTitle(tile.title);
    setPrompt(tile.prompt);
  }, [tile]);

  // Lets the Save button reflect real state — disabled when nothing's
  // actually changed, and the header can show an "unsaved" dot when it has.
  const hasChanges = title !== tile.title || prompt !== tile.prompt;

  const handleSave = () => {
    if (!hasChanges) return;
    onSave({ title, prompt });
    onClose();
  };

  return (
    <div className="tile-editor-panel">
      <div className="tile-editor-header">
        <div className="tile-editor-header-icon">
          <EditIcon />
        </div>
        <div className="tile-editor-header-text">
          <span className="tile-editor-header-title">Edit style</span>
          <span className="tile-editor-header-subtitle">
            {hasChanges && <span className="tile-editor-unsaved-dot" aria-hidden="true" />}
            {hasChanges ? "Unsaved changes" : tile.title}
          </span>
        </div>
        <button type="button" className="tile-editor-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="tile-editor-body">
        {tile.isDefault && (
          <div className="tile-editor-default-note">
            This is a built-in style, feel free to edit it, just know it can&apos;t be deleted
          </div>
        )}

        <label className="tile-editor-label">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Formal, Punchy, Academic…"
          />
        </label>

        <label className="tile-editor-label tile-editor-prompt-field">
          <div className="tile-editor-prompt-label-row">
            <span>Prompt</span>
            <span
              className={`tile-editor-char-count ${
                prompt.length > PROMPT_MAX_LENGTH ? "tile-editor-char-count-over" : ""
              }`}
            >
              {prompt.length}/{PROMPT_MAX_LENGTH}
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe how the AI should write — tone, structure, dos and don'ts…"
            maxLength={PROMPT_MAX_LENGTH}
          />
        </label>
      </div>

      <div className="tile-editor-actions">
        <button type="button" className="tile-editor-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="tile-editor-save"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          {hasChanges ? "Save changes" : "Saved"}
        </button>
      </div>
    </div>
  );
}