"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import RichTextEditor from "./RichTextEditor";
import ChatPanel from "./ChatPanel";

export default function EditorShell() {
  const [editor, setEditor] = useState<Editor | null>(null);

  return (
    <div className="editor-shell-layout">
      <div className="editor-shell-main">
        <RichTextEditor onEditorReady={setEditor} />
      </div>
      {editor && <ChatPanel editor={editor} />}
    </div>
  );
}