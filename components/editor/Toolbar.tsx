"use client";

import { Editor, useEditorState } from "@tiptap/react";
import type { Level } from "@tiptap/extension-heading";
import { UndoIcon, RedoIcon } from "./ToolbarIcons";

type Props = {
  editor: Editor;
};

const HEADING_OPTIONS: { value: string; label: string }[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "1", label: "Heading 1" },
  { value: "2", label: "Heading 2" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
  { value: "5", label: "Heading 5" },
  { value: "6", label: "Heading 6" },
];

function AlignIcon({ type }: { type: "left" | "center" | "right" | "justify" }) {
  const lines =
    type === "left"
      ? [14, 10, 12]
      : type === "center"
        ? [10, 14, 10]
        : type === "right"
          ? [14, 10, 12]
          : [14, 14, 14];

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {lines.map((width, index) => (
        <rect
          key={index}
          x={type === "right" ? 16 - width : type === "center" ? (16 - width) / 2 : 0}
          y={3 + index * 4}
          width={width}
          height="1.5"
          rx="0.75"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}



export default function Toolbar({ editor }: Props) {
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      headingLevel:
        [1, 2, 3, 4, 5, 6].find((level) =>
          editor.isActive("heading", { level })
        ) ?? 0,
      bulletList: editor.isActive("bulletList"),
      alignLeft: editor.isActive({ textAlign: "left" }),
      alignCenter: editor.isActive({ textAlign: "center" }),
      alignRight: editor.isActive({ textAlign: "right" }),
      alignJustify: editor.isActive({ textAlign: "justify" }),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const currentHeading =
    editorState.headingLevel === 0
      ? "paragraph"
      : String(editorState.headingLevel);

  const handleHeadingChange = (value: string) => {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
      return;
    }

    editor
      .chain()
      .focus()
      .setHeading({ level: Number(value) as Level })
      .run();
  };

  return (
    <div className="editor-toolbar">
      <button
        type="button"
        className={editorState.bold ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>

      <button
        type="button"
        className={editorState.italic ? "active" : ""}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </button>

      <button
        type="button"
        className={editorState.strike ? "active" : ""}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        S
      </button>

      <div className="toolbar-divider" />

      <select
        className="toolbar-select"
        value={currentHeading}
        onChange={(event) => handleHeadingChange(event.target.value)}
        aria-label="Text style"
      >
        {HEADING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={editorState.bulletList ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </button>

      <div className="toolbar-divider" />

      <button
        type="button"
        className={editorState.alignLeft ? "active" : ""}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align left"
        aria-label="Align left"
      >
        <AlignIcon type="left" />
      </button>

      <button
        type="button"
        className={editorState.alignCenter ? "active" : ""}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align center"
        aria-label="Align center"
      >
        <AlignIcon type="center" />
      </button>

      <button
        type="button"
        className={editorState.alignRight ? "active" : ""}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align right"
        aria-label="Align right"
      >
        <AlignIcon type="right" />
      </button>

      <button
        type="button"
        className={editorState.alignJustify ? "active" : ""}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        title="Justify"
        aria-label="Justify"
      >
        <AlignIcon type="justify" />
      </button>

      <div className="toolbar-divider" />

      <button
        type="button"
        disabled={!editorState.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
        aria-label="Undo"
      >
        <UndoIcon />
      </button>

      <button
        type="button"
        disabled={!editorState.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
        aria-label="Redo"
      >
        <RedoIcon />
      </button>
    </div>
  );
}
