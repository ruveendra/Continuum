"use client";

import { useEditor, EditorContent, Editor } from '@tiptap/react'
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
import { SessionHighlight, sessionHighlightPluginKey } from '@/lib/editor/highlightExtension'
import { useAISessionStore } from '@/lib/ai/aiSessionStore'
import SelectionTooltip from './SelectionTooltip'
import PinnedSessionTooltip from './PinnedSessionTooltip'



function TiptapEditor({ ydoc, onEditorReady }: { ydoc: Y.Doc; onEditorReady?: (editor: Editor) => void }) {
  const setSelection = useEditorStore((state) => state.setSelection)

  // Subscribing to `sessions` here means THIS component re-renders whenever
  // the session list changes (added/removed/status updated) — which is
  // exactly what we need, since we .map() over sessions below to render one
  // PinnedSessionTooltip per session.
  const sessions = useAISessionStore((state) => state.sessions)

  const extensions = useMemo(() => [
    StarterKit.configure({
      bulletList: { keepMarks: true, keepAttributes: false },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({
      placeholder: "Type here...",
      showOnlyWhenEditable: true,
      showOnlyCurrent: false,
    }),
    Collaboration.configure({ document: ydoc }),
    SessionHighlight, // registers our custom highlight plugin with Tiptap
  ], [ydoc])

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    onSelectionUpdate: ({ editor }) => {
      setSelection(getEditorSelection(editor))
    },
  })

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // This is the bridge between Zustand (outside ProseMirror) and the
  // highlight plugin (inside ProseMirror) — see the long comment in
  // highlightExtension.ts for why this is necessary. Every time ANY session
  // changes, we dispatch an essentially "no-op" transaction carrying a
  // special flag (setMeta), which the plugin's `apply` function checks for
  // to know "please rebuild your decorations from the current session list."
  useEffect(() => {
    if (!editor) return
    const unsubscribe = useAISessionStore.subscribe(() => {
      editor.view.dispatch(
        editor.state.tr.setMeta(sessionHighlightPluginKey, true)
      )
    })
    return unsubscribe // cleanup on unmount, avoids a memory leak / stale subscription
  }, [editor])

  if (!editor) return null;

  return (
    <div className="editor-shell">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="editor-content" />

      {/* The live tooltip — always present, only visibly renders when there's a selection */}
      <SelectionTooltip editor={editor} />

      {/* One pinned tooltip per active session — this is how multiple
          concurrent AI suggestions each get their own persistent UI */}
      {sessions.map((session) => (
        <PinnedSessionTooltip key={session.id} editor={editor} session={session} />
      ))}
    </div>
  )
}

type Props = {
  onEditorReady?: (editor: Editor) => void;
};

export function RichTextEditor({ onEditorReady }: Props) {
  
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)

  useEffect(() => {
    const doc = new Y.Doc()
    const websocketProvider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_SYNC_SERVER_URL || 'ws://localhost:1234',
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

  return <TiptapEditor ydoc={ydoc} onEditorReady={onEditorReady} />
}

export default RichTextEditor