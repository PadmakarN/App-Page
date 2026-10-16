import { money } from "./purchaseUtils";
import { PurchaseModal } from "./PurchaseDialogs";

const inputClass =
  "w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500";

// केवल purchase form का UI दिखाता है; सारी business logic hook से आती है।
export default function PurchaseForm({ model }) {
  const { form, items } = model;
  if (!model.isOpen) return null;
  return (
    <PurchaseModal
      title="New Purchase Entry"
      onClose={model.close}
      busy={model.saving}
    >
      <form onSubmit={model.submit} className="space-y-5">
        {model.error && (
          <p
            role="alert"
            className="text-sm text-red-700 bg-red-50 p-3 rounded-lg"
          >
            {model.error}
          </p>
        )}
        {model.itemsError && (
          <p role="alert" className="text-sm text-red-700">
            Items could not load: {model.itemsError}
          </p>
        )}
        <fieldset
          disabled={model.saving}
          className="space-y-5 disabled:opacity-70"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-xs font-semibold text-slate-600">
              Supplier Name
              <input
                id="purchaseSupplier"
                value={form.supplierName}
                onChange={(event) =>
                  model.changeHeader("supplierName", event.target.value)
                }
                required
                className={inputClass}
                placeholder="Supplier Name"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Invoice Number
              <input
                id="purchaseInvoice"
                value={form.invoiceNumber}
                onChange={(event) =>
                  model.changeHeader("invoiceNumber", event.target.value)
                }
                required
                className={inputClass}
                placeholder="Invoice Number"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Purchase Date
              <input
                id="purchaseDate"
                type="date"
                value={form.purchaseDate}
                onChange={(event) =>
                  model.changeHeader("purchaseDate", event.target.value)
                }
                required
                className={inputClass}
              />
            </label>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">
              Purchased Materials
            </h3>
            {model.itemsLoading && (
              <p className="text-sm text-slate-500">Loading materials...</p>
            )}
            {form.items.map((row, index) => (
              <div
                key={row.rowKey}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-xl border"
              >
                <label className="sm:col-span-6 text-xs text-slate-600">
                  Material {index + 1}
                  <select
                    id={`purchaseItem${index}`}
                    value={row.itemId}
                    onChange={(event) =>
                      model.changeItem(row.rowKey, event.target.value)
                    }
                    required
                    disabled={model.itemsLoading || Boolean(model.itemsError)}
                    className={inputClass}
                  >
                    <option value="">Select Raw Material</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.itemName}{" "}
                        {item.size ? `(${item.size})` : ""} (
                        {money(item.purchaseRate ?? item.price ?? 0)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2 text-xs text-slate-600">
                  Qty
                  <input
                    id={`purchaseQty${index}`}
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantity}
                    onChange={(event) =>
                      model.changeRow(row.rowKey, {
                        quantity: event.target.value,
                      })
                    }
                    required
                    className={inputClass}
                  />
                </label>
                <label className="sm:col-span-3 text-xs text-slate-600">
                  Amount
                  <input
                    readOnly
                    value={money(row.amount)}
                    className={`${inputClass} font-bold bg-slate-100`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => model.removeRow(row.rowKey)}
                  disabled={form.items.length === 1}
                  aria-label={`Remove row ${index + 1}`}
                  className="sm:col-span-1 h-10 text-red-600 bg-red-50 border border-red-100 rounded-lg disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={model.addRow}
              className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold text-xs"
            >
              + Add Another Item
            </button>
          </div>
          <p className="border-t pt-4 text-right font-bold text-slate-800">
            Grand Total: {money(model.grandTotal)}
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={model.close}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                model.saving || model.itemsLoading || Boolean(model.itemsError)
              }
              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm disabled:opacity-50"
            >
              {model.saving ? "Saving..." : "Save"}
            </button>
          </div>
        </fieldset>
      </form>
    </PurchaseModal>
  );
}
