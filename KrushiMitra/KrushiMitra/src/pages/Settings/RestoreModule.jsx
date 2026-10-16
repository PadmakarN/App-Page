import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import React, { useState, useEffect } from 'react';
import { db } from '../Services/firebase';
import { collection, doc, runTransaction, onSnapshot, serverTimestamp, deleteDoc, addDoc } from 'firebase/firestore';

export default function RestoreModule() {
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' or 'sales'
  
  const [trashList, setTrashList] = useState([]);
  const [trashSalesList, setTrashSalesList] = useState([]);
  
  const [trashSearch, setTrashSearch] = useState('');
  const [trashCurrentPage, setTrashCurrentPage] = useState(1);
  const trashItemsPerPage = 5;

  // Custom Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '' });

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3500);
  };

  // Fetch Trash Purchases (Real-time)
  useEffect(() => {
    const unsubTrash = onSnapshot(collection(db, 'trash_purchases'), (snap) => {
      setTrashList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Error fetching trash purchases:", err);
    });

    return () => unsubTrash();
  }, []);

  // Fetch Trash Sales (Real-time)
  useEffect(() => {
    const unsubSalesTrash = onSnapshot(collection(db, 'trash_sales'), (snap) => {
      setTrashSalesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Error fetching trash sales:", err);
    });

    return () => unsubSalesTrash();
  }, []);

  // Helper for Date formatting
  const formatDateStr = (timestamp) => {
    if (!timestamp) return 'N/A';
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(dateObj)) return 'N/A';
    return dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) + ', ' + 
            dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  };

  // Restore Purchase from Trash: Move back to purchases, re-add stock & log
  const executeRestorePurchase = async (purchase) => {
    try {
      await runTransaction(db, async (transaction) => {
        // Re-add Stock safely
        for (let item of (purchase.items || [])) {
          if (!item.itemId) continue;
          const itemRef = doc(db, 'items', item.itemId);
          const itemDoc = await transaction.get(itemRef);
          if (itemDoc.exists()) {
            const currentStock = itemDoc.data().currentStock ?? itemDoc.data().quantity ?? 0;
            const stockField = itemDoc.data().currentStock !== undefined ? 'currentStock' : 'quantity';
            transaction.update(itemRef, { [stockField]: Number(currentStock) + Number(item.quantity || 0) });
          }
        }
        // Move back to purchases collection
        const purchaseRef = doc(db, 'purchases', purchase.id);
        const { deletedAt, ...purchaseData } = purchase;
        transaction.set(purchaseRef, purchaseData);

        // Remove from trash_purchases collection
        transaction.delete(doc(db, 'trash_purchases', purchase.id));
      });

      // Add Restore Log
      await addDoc(collection(db, 'logs'), {
        action: 'RESTORE_PURCHASE',
        title: `Restored purchase record "${purchase.purchaseNumber || purchase.id}" from Trash`,
        purchaseNumber: purchase.purchaseNumber || '',
        supplierName: purchase.supplierName || '',
        invoiceNumber: purchase.invoiceNumber || '',
        timestamp: serverTimestamp()
      });

      showToast('Purchase record restored successfully and stock updated.');
    } catch (err) {
      showToast('Error restoring purchase: ' + err.message);
    }
  };

  const handleRestorePurchase = (purchase) => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Purchase Record',
      message: `Are you sure you want to restore purchase "${purchase.purchaseNumber || ''}"? Stock will be re-added.`,
      onConfirm: () => executeRestorePurchase(purchase)
    });
  };

  // Restore Sale from Trash: Move back to sales, deduct stock back & log
  const executeRestoreSale = async (sale) => {
    try {
      await runTransaction(db, async (transaction) => {
        // Deduct Stock back safely
        for (let item of (sale.items || [])) {
          if (!item.itemId) continue;
          const itemRef = doc(db, 'items', item.itemId);
          const itemDoc = await transaction.get(itemRef);
          if (itemDoc.exists()) {
            const currentStock = itemDoc.data().currentStock ?? itemDoc.data().quantity ?? 0;
            const stockField = itemDoc.data().currentStock !== undefined ? 'currentStock' : 'quantity';
            transaction.update(itemRef, { [stockField]: Number(currentStock) - Number(item.quantity || 0) });
          }
        }
        // Move back to sales collection
        const saleRef = doc(db, 'sales', sale.id);
        const { deletedAt, ...saleData } = sale;
        transaction.set(saleRef, saleData);

        // Remove from trash_sales collection
        transaction.delete(doc(db, 'trash_sales', sale.id));
      });

      // Add Restore Log
      await addDoc(collection(db, 'logs'), {
        action: 'RESTORE_SALE',
        title: `Restored sale record "${sale.billNumber || sale.id}" from Trash`,
        billNumber: sale.billNumber || '',
        customerName: sale.customerName || '',
        timestamp: serverTimestamp()
      });

      showToast('Sale record restored successfully and stock deducted.');
    } catch (err) {
      showToast('Error restoring sale: ' + err.message);
    }
  };

  const handleRestoreSale = (sale) => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Sale Record',
      message: `Are you sure you want to restore sale bill "${sale.billNumber || sale.id}"? Stock will be deducted accordingly.`,
      onConfirm: () => executeRestoreSale(sale)
    });
  };

  // Permanent Delete from Purchase Trash
  const executePermanentDeletePurchase = async (purchaseId, purchaseNumber) => {
    try {
      await deleteDoc(doc(db, 'trash_purchases', purchaseId));

      await addDoc(collection(db, 'logs'), {
        action: 'PERM_DELETE_PURCHASE',
        title: `Permanently deleted purchase record "${purchaseNumber || ''}"`,
        purchaseNumber: purchaseNumber || '',
        timestamp: serverTimestamp()
      });

      showToast('Purchase record permanently deleted.');
    } catch (err) {
      showToast('Error permanently deleting record: ' + err.message);
    }
  };

  const handlePermanentDeletePurchase = (purchaseId, purchaseNumber) => {
    setConfirmModal({
      isOpen: true,
      title: 'Permanent Deletion Warning',
      message: `WARNING: This will permanently delete purchase record "${purchaseNumber || ''}". You cannot undo this action. Proceed?`,
      onConfirm: () => executePermanentDeletePurchase(purchaseId, purchaseNumber)
    });
  };

  // Permanent Delete from Sale Trash
  const executePermanentDeleteSale = async (saleId, billNumber) => {
    try {
      await deleteDoc(doc(db, 'trash_sales', saleId));

      await addDoc(collection(db, 'logs'), {
        action: 'PERM_DELETE_SALE',
        title: `Permanently deleted sale record "${billNumber || ''}"`,
        billNumber: billNumber || '',
        timestamp: serverTimestamp()
      });

      showToast('Sale record permanently deleted.');
    } catch (err) {
      showToast('Error permanently deleting record: ' + err.message);
    }
  };

  const handlePermanentDeleteSale = (saleId, billNumber) => {
    setConfirmModal({
      isOpen: true,
      title: 'Permanent Deletion Warning',
      message: `WARNING: This will permanently delete sale bill "${billNumber || ''}". You cannot undo this action. Proceed?`,
      onConfirm: () => executePermanentDeleteSale(saleId, billNumber)
    });
  };

  // Active dataset based on selected tab
  const currentList = activeTab === 'purchases' ? trashList : trashSalesList;

  // Filter List with strict string conversion checks to prevent indexOf/toLowerCase errors
  const filteredList = currentList.filter(item => {
    if (!trashSearch) return true;
    const query = trashSearch.toLowerCase();
    if (activeTab === 'purchases') {
      const pNo = String(item.purchaseNumber || '').toLowerCase();
      const sName = String(item.supplierName || '').toLowerCase();
      const iNo = String(item.invoiceNumber || '').toLowerCase();
      return pNo.includes(query) || sName.includes(query) || iNo.includes(query);
    } else {
      const bNo = String(item.billNumber || '').toLowerCase();
      const cName = String(item.customerName || '').toLowerCase();
      return bNo.includes(query) || cName.includes(query);
    }
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredList.length / trashItemsPerPage) || 1;
  const indexOfLastItem = trashCurrentPage * trashItemsPerPage;
  const indexOfFirstItem = indexOfLastItem - trashItemsPerPage;
  const paginatedList = filteredList
    .sort((a, b) => (b.deletedAt?.seconds || 0) - (a.deletedAt?.seconds || 0))
    .slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <RestoreFromTrashOutlinedIcon className="text-amber-600 text-2xl sm:text-3xl" />
            Restore / Trash Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">Manage deleted purchase and sale records, restore them, or clear them permanently.</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('purchases'); setTrashCurrentPage(1); setTrashSearch(''); }}
          className={`px-5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'purchases'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Purchases Trash ({trashList.length})
        </button>
        <button
          onClick={() => { setActiveTab('sales'); setTrashCurrentPage(1); setTrashSearch(''); }}
          className={`px-5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'sales'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Sales Trash ({trashSalesList.length})
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-xs sm:text-sm text-slate-500">
            Total Deleted {activeTab === 'purchases' ? 'Purchases' : 'Sales'} in Trash: <span className="font-bold text-slate-800">{currentList.length}</span>
          </p>
          <div className="w-full sm:w-80">
            <input 
              type="text" 
              placeholder={activeTab === 'purchases' ? "Search by Purchase No, Supplier, Invoice..." : "Search by Bill No, Customer Name..."} 
              value={trashSearch} 
              onChange={e => { setTrashSearch(e.target.value); setTrashCurrentPage(1); }} 
              className="w-full border p-2.5 rounded-lg text-xs sm:text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="border rounded-xl overflow-x-auto relative">
          <table className="w-full text-left text-sm min-w-[750px]">
            <thead className="bg-slate-50 text-slate-600 border-b">
              {activeTab === 'purchases' ? (
                <tr>
                  <th className="p-4 sticky left-0 z-20 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Purchase No</th>
                  <th className="p-4">Supplier Name</th>
                  <th className="p-4">Invoice No</th>
                  <th className="p-4">Grand Total</th>
                  <th className="p-4">Deleted Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-4 sticky left-0 z-20 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Bill No</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Grand Total</th>
                  <th className="p-4">Deleted Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">Trash is empty or no matching records found.</td>
                </tr>
              ) : (
                paginatedList.map((item) => (
                  <tr key={item.id} className="border-b last:border-none hover:bg-slate-50">
                    {activeTab === 'purchases' ? (
                      <>
                        <td className="p-4 font-semibold text-slate-800 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{item.purchaseNumber || 'N/A'}</td>
                        <td className="p-4 text-slate-600">{item.supplierName || 'N/A'}</td>
                        <td className="p-4 text-slate-600">{item.invoiceNumber || 'N/A'}</td>
                        <td className="p-4 font-bold text-slate-800">₹{item.grandTotal ?? 0}</td>
                        <td className="p-4 text-xs text-slate-500 whitespace-nowrap">{formatDateStr(item.deletedAt)}</td>
                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                          <button 
                            onClick={() => handleRestorePurchase(item)} 
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                          >
                            ♻️ Restore
                          </button>
                          <button 
                            onClick={() => handlePermanentDeletePurchase(item.id, item.purchaseNumber)} 
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                          >
                            🗑️ Perm Delete
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 font-semibold text-slate-800 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{item.billNumber || 'N/A'}</td>
                        <td className="p-4 text-slate-600">{item.customerName || 'Walk-in Customer'}</td>
                        <td className="p-4 text-slate-600 uppercase text-xs font-semibold">{item.paymentMethod || 'Cash'}</td>
                        <td className="p-4 font-bold text-slate-800">₹{item.grandTotal ?? 0}</td>
                        <td className="p-4 text-xs text-slate-500 whitespace-nowrap">{formatDateStr(item.deletedAt)}</td>
                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                          <button 
                            onClick={() => handleRestoreSale(item)} 
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                          >
                            ♻️ Restore
                          </button>
                          <button 
                            onClick={() => handlePermanentDeleteSale(item.id, item.billNumber)} 
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                          >
                            🗑️ Perm Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredList.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {trashCurrentPage} of {totalPages} ({filteredList.length} total items)
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setTrashCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={trashCurrentPage === 1} 
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <button 
                onClick={() => setTrashCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={trashCurrentPage === totalPages} 
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Yes/No Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800">{confirmModal.title}</h3>
            <p className="text-sm text-slate-600">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-100 cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                  if (action) action();
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 cursor-pointer shadow-sm"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-emerald-400 text-lg">✔</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}