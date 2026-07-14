"use client";

type Props = {
  activeTab: "editor" | "personalize";
  onTabChange: (tab: "editor" | "personalize") => void;
};

// Purely presentational — TopBar doesn't own any state itself, it just
// displays whatever `activeTab` it's given and calls `onTabChange` when
// clicked. This is the same pattern as Toolbar.tsx (which doesn't own
// editor state either, just receives the `editor` instance as a prop).
export default function TopBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="top-bar">
      <button
        type="button"
        className={activeTab === "editor" ? "active" : ""}
        onClick={() => onTabChange("editor")}
      >
        Editor
      </button>
      <button
        type="button"
        className={activeTab === "personalize" ? "active" : ""}
        onClick={() => onTabChange("personalize")}
      >
        Personalize
      </button>
    </div>
  );
}