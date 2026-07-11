"use client";

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from "@tiptap/extension-placeholder";

export function RichTextEditor() {

  const editor = useEditor({
    extensions: [StarterKit,
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

  return (
    <div className="editor-shell">
      <EditorContent editor={editor} className="editor-content" />
    </div>
  )

}
export default RichTextEditor
