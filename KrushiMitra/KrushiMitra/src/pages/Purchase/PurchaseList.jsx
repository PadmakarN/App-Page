import React from 'react';
import { money, purchaseDay } from './purchaseUtils';

const inputClass = 'w-full border p-2 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500';

// केवल filters, totals, purchase table और pagination का UI दिखाता है।
export default function PurchaseList({ model }) {
  return (
    <div className="space-y-5">
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-slate-500">Supplier Search
            <input placeholder="Search Supplier..." value={model.filters.supplier} onChange={(event) => model.changeFilter('supplier', event.target.value)} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-slate-500">Invoice Number Search
            <input placeholder="Search Invoice No..." value={model.filters.invoice} onChange={(event) => model.changeFilter('invoice', event.target.value)} className={inputClass} />
          </label>
          <button onClick={model.today} className="self-end bg-blue-50 text-blue-600 border border-blue-200 p-2 rounded-lg text-xs font-bold">📅 Set Today's Filter</button>
        </div>
        <div className="flex flex-wrap items-center justify-between pt-3 border-t gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <label>From <input aria-label="From date" type="date" value={model.filters.fromDate} onChange={(event) => model.changeFilter('fromDate', event.target.value)} className="border p-2 rounded-lg" /></label>
            <label>To <input aria-label="To date" type="date" value={model.filters.toDate} onChange={(event) => model.changeFilter('toDate', event.target.value)} className="border p-2 rounded-lg" /></label>
            <button onClick={model.clearFilters} className="text-red-500 font-semibold px-2">Clear All Filters</button>
          </div>
          <p className="text-xs text-slate-500">Matching Entries: <strong className="text-slate-800">{model.count}</strong></p>
        </div>
        {model.dateError && <p role="alert" className="text-red-600 text-sm">{model.dateError}</p>}
      </div>
      {model.loadError && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg">Could not load purchases: {model.loadError}</p>}
      {model.actionError && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg">{model.actionError}</p>}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b flex flex-wrap justify-between items-center gap-3">
          <h2 className="font-bold text-slate-800">Purchase History</h2>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <span className="bg-slate-100 px-3 py-1.5 rounded-lg">Total Qty: <span className="text-indigo-600">{model.totals.quantity}</span></span>
            <span className="bg-slate-100 px-3 py-1.5 rounded-lg">Total Amount: <span className="text-blue-600">{money(model.totals.amount)}</span></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b"><tr>
              <th className="p-4">Purchase No</th><th className="p-4">Purchase Date</th><th className="p-4">Supplier Name</th><th className="p-4">Invoice No</th><th className="p-4">Purchased Items</th><th className="p-4">Total Qty</th><th className="p-4">Grand Total</th><th className="p-4">Actions</th>
            </tr></thead>
            <tbody>
              {model.loading ? <tr><td colSpan={8} className="p-6 text-center text-slate-500">Loading purchase history...</td></tr>
                : !model.currentPurchases.length ? <tr><td colSpan={8} className="p-6 text-center text-slate-500">{model.loadError ? 'Purchase history unavailable.' : 'No purchase records found matching your filters.'}</td></tr>
                : model.currentPurchases.map((purchase, index) => (
                  <tr key={purchase.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-semibold text-blue-600"><span className="text-xs text-slate-400 mr-2">#{model.start + index + 1}</span>{purchase.purchaseNumber}</td>
                    <td className="p-4 whitespace-nowrap">{purchaseDay(purchase) || 'N/A'}</td>
                    <td className="p-4 font-medium">{purchase.supplierName}</td>
                    <td className="p-4">{purchase.invoiceNumber}</td>
                    <td className="p-4"><div className="flex flex-wrap gap-1">{(purchase.items || []).map((row, rowIndex) => <span key={rowIndex} className="bg-slate-100 px-2 py-1 rounded text-xs">{row.itemName} <strong className="text-blue-600">({row.quantity})</strong></span>)}</div></td>
                    <td className="p-4 font-bold text-indigo-600">{(purchase.items || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0)}</td>
                    <td className="p-4 font-bold whitespace-nowrap">{money(purchase.grandTotal)}</td>
                    <td className="p-4"><div className="flex gap-2 whitespace-nowrap">
                      <button onClick={() => model.view(purchase)} className="text-blue-700 bg-blue-50 px-2 py-1 rounded">View</button>
                      <button onClick={() => model.print(purchase)} className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded">Print</button>
                      <button onClick={() => model.requestDelete(purchase)} disabled={model.deleting} className="text-amber-700 bg-amber-50 px-2 py-1 rounded disabled:opacity-50">Delete</button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!model.loading && model.count > 0 && <div className="p-4 border-t flex items-center justify-between text-xs">
          <span className="text-slate-500">Page {model.currentPage} of {model.totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => model.changePage(-1)} disabled={model.currentPage === 1} className="px-3 py-2 border rounded-lg disabled:opacity-50">Previous</button>
            <button onClick={() => model.changePage(1)} disabled={model.currentPage === model.totalPages} className="px-3 py-2 border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
