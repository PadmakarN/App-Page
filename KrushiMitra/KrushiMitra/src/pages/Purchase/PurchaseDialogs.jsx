import React, { useEffect, useRef } from "react";
import { money, purchaseDay, formatDateTime } from "./purchaseUtils";

// Native dialog से modal, focus trap और background scroll lock संभालता है।
export function PurchaseModal({ title, onClose, busy = false, children }) {
  const dialogRef = useRef(null);
  // Modal खुलने पर focus अंदर ले जाता है; बंद होने पर पुराना focus/scroll लौटाता है।
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  // Escape पर भी parent के close नियम लागू करता है।
  function cancel(event) {
    event.preventDefault();
    if (!busy) onClose();
  }
  return (
    <dialog
      ref={dialogRef}
      onCancel={cancel}
      aria-label={title}
      className="m-auto w-[calc(100%_-_2rem)] max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
     style={{
    position: "fixed",
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
    margin: 0,
    width: "calc(100vw - 32px)",
    maxWidth: "768px",
    maxHeight: "85dvh",
    overflowY: "auto",
    boxSizing: "border-box",
    border: "none",
    backgroundColor: "#ffffff",
  }}
    >
      <div className="flex justify-between items-center gap-4 border-b pb-3 mb-5">
        <h3 className="text-lg font-bold text-slate-800 break-all">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
          className="text-slate-500 font-bold text-lg disabled:opacity-40"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}

// View, delete confirmation और activity logs के UI दिखाता है।
export default function PurchaseDialogs({ model }) {
  const purchase = model.viewed;
  return (
    <>
      {purchase && (
        <PurchaseModal
          title={`Purchase Code: ${purchase.purchaseNumber}`}
          onClose={model.closeView}
        >
          <p className="text-sm text-slate-500 mb-3">
            Purchase Date: {purchaseDay(purchase)}
          </p>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-sm mb-4">
            <p>
              <span className="text-slate-500 block text-xs">
                Supplier Name
              </span>
              <strong>{purchase.supplierName}</strong>
            </p>
            <p>
              <span className="text-slate-500 block text-xs">
                Invoice Number
              </span>
              <strong>{purchase.invoiceNumber}</strong>
            </p>
          </div>
          <div className="border rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[350px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3">Material Name</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Rate</th>
                  <th className="p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(purchase.items || []).map((row, index) => (
                  <tr key={index} className="border-b last:border-none">
                    <td className="p-3">{row.itemName}</td>
                    <td className="p-3">{row.quantity}</td>
                    <td className="p-3">{money(row.rate)}</td>
                    <td className="p-3 font-bold">{money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-right font-bold py-4">
            Grand Total: {money(purchase.grandTotal)}
          </p>
          {model.actionError && (
            <p role="alert" className="text-red-700 text-sm mb-3">
              {model.actionError}
            </p>
          )}
          <div className="flex justify-between border-t pt-3">
            <button
              onClick={() => model.print(purchase)}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm"
            >
              🖨️ Print Bill
            </button>
            <button
              onClick={model.closeView}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </PurchaseModal>
      )}
      {model.pendingDelete && (
        <PurchaseModal
          title="Delete purchase?"
          onClose={model.cancelDelete}
          busy={model.deleting}
        >
          <p className="text-sm text-slate-600">
            Purchase <strong>{model.pendingDelete.purchaseNumber}</strong> (
            {model.pendingDelete.supplierName}) will move to Trash and its
            purchased quantity will be deducted from stock.
          </p>
          {model.actionError && (
            <p
              role="alert"
              className="text-red-700 bg-red-50 p-3 rounded-lg mt-4"
            >
              {model.actionError}
            </p>
          )}
          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={model.cancelDelete}
              disabled={model.deleting}
              className="border px-4 py-2 rounded-lg disabled:opacity-50"
            >
              No
            </button>
            <button
              onClick={model.confirmDelete}
              disabled={model.deleting}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {model.deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </PurchaseModal>
      )}
      {model.logsOpen && (
        <PurchaseModal
          title="Purchase Entry Activity Logs"
          onClose={model.closeLogs}
        >
          <div className="space-y-3">
            {model.logsLoading && (
              <p className="text-slate-500 text-sm">Loading activity logs...</p>
            )}
            {model.logsError && (
              <p role="alert" className="text-red-700 text-sm">
                {model.logsError}
              </p>
            )}
            {!model.logsLoading &&
              !model.logsError &&
              model.logs.length === 0 && (
                <p className="text-slate-500">No activity logs recorded yet.</p>
              )}
            {model.logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-slate-200 space-y-2"
              >
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <strong className="rounded-full bg-blue-50 text-blue-700 px-2 py-1">
                    {String(log.action || "ACTIVITY").replace("_PURCHASE", "")}
                  </strong>
                  <span className="text-slate-500">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
                <p className="font-semibold text-sm">
                  {log.title || log.description}
                </p>
                {log.title && log.description && (
                  <p className="text-sm text-slate-600">{log.description}</p>
                )}
                <p className="text-xs text-slate-500">
                  Performed by: {log.performedBy || "System User"}
                </p>
              </div>
            ))}
          </div>
        </PurchaseModal>
      )}
    </>
  );
}
