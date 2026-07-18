"use client";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

// Warns before leaving the editor tab while an AI suggestion (or an
// in-progress multi-step plan) is still waiting for a decision. Switching
// tabs unmounts the editor entirely, so anything left unresolved would
// otherwise just sit there with no way to accept or reject it.
export default function SwitchTabConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="switch-tab-modal-card" onClick={(e) => e.stopPropagation()}>
        <p className="switch-tab-modal-title">Pending edits will be lost</p>
        <p className="switch-tab-modal-message">
          Switching to Personalize will discard any AI suggestions still waiting for review.
        </p>
        <div className="switch-tab-modal-actions">
          <button type="button" className="switch-tab-modal-cancel" onClick={onCancel}>
            Stay here
          </button>
          <button type="button" className="switch-tab-modal-confirm" onClick={onConfirm}>
            Switch anyway
          </button>
        </div>
      </div>
    </div>
  );
}
