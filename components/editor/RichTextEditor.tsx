"use client";

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Toolbar from "./Toolbar";
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useEffect, useState, useMemo } from 'react'
import { useEditorStore } from '@/lib/editor/editorStore'
import { getEditorSelection } from '@/lib/editor/selection'

// Inner component: only ever mounted once ydoc is guaranteed non-null
function TiptapEditor({ ydoc }: { ydoc: Y.Doc }) {
  const setSelection = useEditorStore((state) => state.setSelection) //temp

  const extensions = useMemo(() => [
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
    Collaboration.configure({
      document: ydoc,
    }),
  ], [ydoc])

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    onSelectionUpdate: ({ editor }) => {
      setSelection(getEditorSelection(editor))
    },
  })

  if (!editor) return null;

  return (
    <div className="editor-shell">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  )
}

// Outer component: owns the Yjs lifecycle
export function RichTextEditor() {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)

  useEffect(() => {
    const doc = new Y.Doc()
    const websocketProvider = new WebsocketProvider(
      'ws://localhost:1234',
      'continuum-room',
      doc
    )
    const idbProvider = new IndexeddbPersistence('continuum-room', doc)

    websocketProvider.on('status', (event: any) => {
      console.log('WebSocket status:', event.status)
    })

    websocketProvider.on('connection-error', (error: any) => {
      console.error('WebSocket connection error:', error)
    })

    idbProvider.whenSynced.then(() => {
      console.log('Loaded data from IndexedDB')
    })

    setYdoc(doc)

    return () => {
      websocketProvider.destroy()
      idbProvider.destroy()
      doc.destroy()
    }
  }, [])

  if (!ydoc) return <div>Loading...</div>;

  return <TiptapEditor ydoc={ydoc} />
}

export default RichTextEditor