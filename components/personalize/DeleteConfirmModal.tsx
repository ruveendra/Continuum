"use client";

type Props = {
  tileTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// A simple, custom-styled confirmation modal — replaces window.confirm()
// so it matches the app's own look instead of the browser's native dialog.
export default function DeleteConfirmModal({ tileTitle, onConfirm, onCancel }: Props) {
  return (
    // The overlay covers the whole screen; clicking it counts as "cancel",
    // same as clicking outside most modals.
    <div className="modal-overlay" onClick={onCancel}>
      {/* stopPropagation prevents a click INSIDE the modal from bubbling
          up to the overlay and accidentally triggering onCancel */}
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <p className="modal-message">
          Delete <strong>{tileTitle}</strong>? This can&apos;t be undone.
        </p>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="modal-confirm" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}