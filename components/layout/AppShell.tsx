"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import SwitchTabConfirmModal from "./SwitchTabConfirmModal";
import EditorShell from "@/components/editor/EditorShell";
import PersonalizeView from "@/components/personalize/PersonalizeView";
import { useAISessionStore } from "@/lib/ai/aiSessionStore";
import { usePlanStore } from "@/lib/ai/planStore";

// The two possible views. Using a union type (not just `string`) means
// TypeScript will catch typos like "editro" at compile time instead of
// silently failing at runtime.
type ActiveTab = "editor" | "personalize";

// This component owns "which tab is currently showing" — the one piece of
// state the whole top-bar/tab-switching feature is built around.
export default function AppShell() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("editor");

  // Set only while the confirm modal is showing — holds the tab the user
  // was trying to switch to, so confirming knows where to actually go.
  const [pendingTab, setPendingTab] = useState<ActiveTab | null>(null);

  // Leaving the editor tab unmounts it entirely, so any pending AI
  // suggestion (a one-off edit, or a plan mid-step) would otherwise be
  // abandoned with no way to resolve it. Route the switch through a
  // confirmation instead of just letting it happen.
  const requestTabChange = (tab: ActiveTab) => {
    if (tab === activeTab) return;

    const hasPending =
      activeTab === "editor" &&
      (useAISessionStore.getState().sessions.length > 0 || usePlanStore.getState().activePlan !== null);

    if (hasPending) {
      setPendingTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const confirmTabChange = () => {
    // Order matters: clear the sessions and end the plan BEFORE switching,
    // so any in-progress plan loop sees its plan already gone the moment
    // it wakes up, instead of a race with the tab actually unmounting.
    useAISessionStore.getState().clearSessions();
    usePlanStore.getState().endPlan();
    if (pendingTab) setActiveTab(pendingTab);
    setPendingTab(null);
  };

  const cancelTabChange = () => setPendingTab(null);

  return (
    <div className="app-shell">
      <TopBar activeTab={activeTab} onTabChange={requestTabChange} />

      <div className="app-shell-content">
        {activeTab === "editor" && <EditorShell />}
        {activeTab === "personalize" && <PersonalizeView />}
      </div>

      {pendingTab && <SwitchTabConfirmModal onConfirm={confirmTabChange} onCancel={cancelTabChange} />}
    </div>
  );
}