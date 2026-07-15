"use client";

import RichTextEditor from "./RichTextEditor";
import ChatPanel from "./ChatPanel";

// This is the new wrapper for the Editor tab — puts the existing editor
// and the new chat panel side by side. RichTextEditor itself is completely
// untouched; this just adds a sibling next to it.
export default function EditorShell() {
  return (
    <div className="editor-shell-layout">
      <div className="editor-shell-main">
        <RichTextEditor />
      </div>
      <ChatPanel />
    </div>
  );
}