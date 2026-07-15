"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import EditorShell from "@/components/editor/EditorShell";
import PersonalizeView from "@/components/personalize/PersonalizeView";

// The two possible views. Using a union type (not just `string`) means
// TypeScript will catch typos like "editro" at compile time instead of
// silently failing at runtime.
type ActiveTab = "editor" | "personalize";

// This component owns "which tab is currently showing" — the one piece of
// state the whole top-bar/tab-switching feature is built around.
export default function AppShell() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("editor");

  return (
    <div className="app-shell">
      <TopBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="app-shell-content">
        {activeTab === "editor" && <EditorShell />}
        {activeTab === "personalize" && <PersonalizeView />}
      </div>
    </div>
  );
}