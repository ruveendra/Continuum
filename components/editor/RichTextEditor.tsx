"use client";

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Toolbar from "./Toolbar";

export function RichTextEditor() {

  const editor = useEditor({
    extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Placeholder.configure({
        placeholder: "Type here...",
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
    ],
    
    // Don't render immediately on the server to avoid SSR issues
    content: "",
    immediatelyRender: false,
  })

  if (!editor) return null;

  return (
    <div className="editor-shell">
      <Toolbar editor={editor} />

      <EditorContent
        editor={editor}
        className="editor-content"
      />
    </div>
  )

}
export default RichTextEditor
