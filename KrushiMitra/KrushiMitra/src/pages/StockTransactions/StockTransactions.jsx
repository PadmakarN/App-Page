import React, { useState, useEffect, useRef } from 'react';
import { db } from '../Services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';

export default function StockTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedTx, setSelectedTx] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // Dropdown Action Menu State
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Form States
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemName, setItemName] = useState('');
  const [transactionType, setTransactionType] = useState('Purchase In');
  const [quantity, setQuantity] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Helper function to format date as "28 Apr 2026"
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time listener for Stock Transactions & Activity Logs from Firebase
  useEffect(() => {
    const unsubTx = onSnapshot(collection(db, 'stockTransactions'), (snap) => {
      const data = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      // Sort globally by date descending for UI display
      data.sort((a, b) => new Date(b.date) - new Date(b.date));
      setTransactions(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching transactions:", err);
      setLoading(false);
    });

    const unsubLogs = onSnapshot(collection(db, 'stockTransactionLogs'), (snap) => {
      const logsData = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      logsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setActivityLogs(logsData);
    }, (err) => {
      console.error("Error fetching logs:", err);
    });

    return () => {
      unsubTx();
      unsubLogs();
    };
  }, []);

  // Helper to log actions
  const logActivity = async (action, details) => {
    try {
      await addDoc(collection(db, 'stockTransactionLogs'), {
        action,
        details,
        user: 'Current User',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  };

  // Recalculate and update running balances for a specific item chronologically
  const recalculateItemBalances = async (targetItemName, allTransactions, transactionToSkipId = null) => {
    const normalizedTarget = targetItemName.trim().toLowerCase();
    
    // Get all transactions for this item, sorted chronologically ASCENDING (oldest to newest)
    const itemTxs = allTransactions
      .filter(t => t.itemName?.trim().toLowerCase() === normalizedTarget && t.id !== transactionToSkipId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const batch = writeBatch(db);

    itemTxs.forEach(tx => {
      const qtyIn = Number(tx.quantityIn) || 0;
      const qtyOut = Number(tx.quantityOut) || 0;
      
      if (tx.transactionType === 'Sales Out') {
        runningBalance -= qtyOut;
      } else {
        runningBalance += qtyIn;
      }

      tx.balanceAfter = runningBalance;
      const docRef = doc(db, 'stockTransactions', tx.id);
      batch.update(docRef, { balanceAfter: runningBalance });
    });

    await batch.commit();
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setModalMode('add');
    setDate(new Date().toISOString().split('T')[0]);
    setItemName('');
    setTransactionType('Purchase In');
    setQuantity('');
    setReferenceNo('');
    setNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (tx) => {
    setModalMode('edit');
    setSelectedTx(tx);
    setDate(tx.date || new Date().toISOString().split('T')[0]);
    setItemName(tx.itemName || '');
    setTransactionType(tx.transactionType || 'Purchase In');
    setQuantity((tx.quantityIn || tx.quantityOut || '').toString());
    setReferenceNo(tx.referenceNo === 'N/A' ? '' : (tx.referenceNo || ''));
    setNotes(tx.notes || '');
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  // Open View Modal
  const handleOpenViewModal = (tx) => {
    setSelectedTx(tx);
    setIsViewModalOpen(true);
    setOpenMenuId(null);
  };

  // Delete Transaction
  const handleDelete = async (tx) => {
    setOpenMenuId(null);
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        const targetItem = tx.itemName;
        await deleteDoc(doc(db, 'stockTransactions', tx.id));
        
        // Recalculate remaining items chronologically
        await recalculateItemBalances(targetItem, transactions, tx.id);

        await logActivity('DELETE', `Deleted transaction for item "${tx.itemName}" (${tx.transactionType}, Qty: ${tx.quantityIn || tx.quantityOut})`);
        alert('Transaction deleted successfully!');
      } catch (err) {
        alert('Error deleting transaction: ' + err.message);
      }
    }
  };

  // Save / Update Transaction to Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }

    let qtyIn = 0;
    let qtyOut = 0;

    if (transactionType === 'Opening Stock' || transactionType === 'Purchase In' || transactionType === 'Manual Adjustment') {
      qtyIn = qty;
    } else if (transactionType === 'Sales Out') {
      qtyOut = qty;
    }

    try {
      if (modalMode === 'add') {
        // Temporarily construct new doc placeholder for calculation
        const newTxData = {
          date,
          itemName,
          transactionType,
          quantityIn: qtyIn,
          quantityOut: qtyOut,
          balanceAfter: 0,
          referenceNo: referenceNo || 'N/A',
          notes: notes || '',
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'stockTransactions'), newTxData);
        
        // Combine current list with new item for recalculation
        const updatedList = [...transactions, { id: docRef.id, ...newTxData }];
        await recalculateItemBalances(itemName, updatedList);

        await logActivity('INSERT', `Added new transaction for item "${itemName}" (${transactionType}, Qty: ${qty})`);
        alert('Stock transaction recorded successfully!');
      } else {
        const oldItemName = selectedTx.itemName;
        const docRef = doc(db, 'stockTransactions', selectedTx.id);
        
        await updateDoc(docRef, {
          date,
          itemName,
          transactionType,
          quantityIn: qtyIn,
          quantityOut: qtyOut,
          referenceNo: referenceNo || 'N/A',
          notes: notes || ''
        });

        // Update local array snapshot representation for correct cascade calculation
        const updatedList = transactions.map(t => t.id === selectedTx.id ? {
          ...t,
          date,
          itemName,
          transactionType,
          quantityIn: qtyIn,
          quantityOut: qtyOut
        } : t);

        // If item name was changed, recalculate both old and new item timelines
        if (oldItemName.trim().toLowerCase() !== itemName.trim().toLowerCase()) {
          await recalculateItemBalances(oldItemName, updatedList);
        }
        await recalculateItemBalances(itemName, updatedList);

        await logActivity('UPDATE', `Updated transaction for item "${itemName}" (${transactionType}, Qty: ${qty})`);
        alert('Stock transaction updated successfully!');
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Error saving transaction: ' + err.message);
    }
  };

  // Filter & Search Logic
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'All' || t.transactionType === filterType;

    return matchesSearch && matchesType;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header, Add Button & View Log Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <WorkHistoryIcon className="text-blue-600" fontSize="medium" /> Stock Transaction History
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenAddModal} 
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Add Transaction
          </button>
          <button 
            onClick={() => setIsLogModalOpen(true)} 
            className="bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition-all shadow-sm text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <ManageHistoryIcon fontSize="small" /> View Logs
          </button>
        </div>
      </div>

      {/* SEARCH, FILTER & COUNT BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search item, reference, notes..." 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
            className="w-full sm:w-72 h-10 border border-slate-300 px-3.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
          <select 
            value={filterType} 
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }} 
            className="w-full sm:w-48 h-10 border border-slate-300 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
          >
            <option value="All">All Types</option>
            <option value="Opening Stock">Opening Stock</option>
            <option value="Purchase In">Purchase In</option>
            <option value="Sales Out">Sales Out</option>
            <option value="Manual Adjustment">Manual Adjustment</option>
          </select>
        </div>
        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          Showing <span className="text-slate-800 font-bold">{filteredTransactions.length}</span> of <span className="text-slate-800 font-bold">{transactions.length}</span> records
        </div>
      </div>

      {/* ADD / EDIT TRANSACTION MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {modalMode === 'add' ? 'New Stock Transaction' : 'Edit Stock Transaction'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Transaction Type</label>
                <select 
                  value={transactionType} 
                  onChange={e => setTransactionType(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Purchase In">Purchase In</option>
                  <option value="Sales Out">Sales Out</option>
                  <option value="Opening Stock">Opening Stock</option>
                  <option value="Manual Adjustment">Manual Adjustment</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Flex Banner Roll / Visiting Cards" 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="e.g. 100" 
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reference Number</label>
                <input 
                  type="text" 
                  placeholder="Invoice / Bill / PO No" 
                  value={referenceNo} 
                  onChange={e => setReferenceNo(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Remarks</label>
                <textarea 
                  rows="2"
                  placeholder="Optional details about this movement" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-md cursor-pointer"
                >
                  {modalMode === 'add' ? 'Save' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isViewModalOpen && selectedTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">Transaction Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-slate-500">Date:</span>
                <span className="text-slate-800 font-medium">{formatDateDisplay(selectedTx.date)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-slate-500">Item Name:</span>
                <span className="text-slate-800 font-bold">{selectedTx.itemName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-slate-500">Transaction Type:</span>
                <span className="font-semibold text-blue-600">{selectedTx.transactionType}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-slate-500">Quantity In:</span>
                <span className="text-emerald-600 font-semibold">{selectedTx.quantityIn || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-slate-500">Quantity Out:</span>
                <span className="text-rose-600 font-semibold">{selectedTx.quantityOut || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-slate-500">Balance After:</span>
                <span className="text-slate-900 font-extrabold">{selectedTx.balanceAfter}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-slate-500">Reference No:</span>
                <span className="text-slate-800">{selectedTx.referenceNo}</span>
              </div>
              <div>
                <span className="block font-semibold text-slate-500 mb-1">Notes / Remarks:</span>
                <p className="bg-slate-50 p-2.5 rounded-lg border text-slate-700 text-xs">{selectedTx.notes || 'No notes added.'}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW LOGS MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ManageHistoryIcon /> Activity Logs
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>
            
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-6">No activity logs found.</p>
              ) : (
                activityLogs.map((log) => {
                  let badgeBg = "bg-slate-100 text-slate-700";
                  if (log.action === 'INSERT') badgeBg = "bg-emerald-100 text-emerald-700";
                  if (log.action === 'UPDATE') badgeBg = "bg-blue-100 text-blue-700";
                  if (log.action === 'DELETE') badgeBg = "bg-rose-100 text-rose-700";

                  return (
                    <div key={log.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${badgeBg}`}>
                          {log.action}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">{log.details}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button 
                onClick={() => setIsLogModalOpen(false)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1150px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-4 sticky left-0 bg-slate-50 z-20 w-16 text-center">No</th>
                <th className="p-4 sticky left-16 bg-slate-50 z-25 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Transaction Type</th>
                <th className="p-4 text-center">Quantity In</th>
                <th className="p-4 text-center">Quantity Out</th>
                <th className="p-4 text-center font-bold">Balance After</th>
                <th className="p-4">Reference & Notes</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-slate-500 text-sm">
                    Loading stock transactions...
                  </td>
                </tr>
              ) : currentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-slate-500 text-sm">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                currentTransactions.map((t, index) => {
                  let badgeColor = "bg-slate-100 text-slate-700";
                  if (t.transactionType === 'Purchase In') badgeColor = "bg-emerald-100 text-emerald-700";
                  if (t.transactionType === 'Sales Out') badgeColor = "bg-rose-100 text-rose-700";
                  if (t.transactionType === 'Opening Stock') badgeColor = "bg-blue-100 text-blue-700";
                  if (t.transactionType === 'Manual Adjustment') badgeColor = "bg-amber-100 text-amber-700";

                  const serialNumber = indexOfFirstItem + index + 1;

                  return (
                    <tr key={t.id} className="border-b border-slate-100 text-sm hover:bg-slate-50 relative">
                      <td className="p-4 text-center text-slate-500 font-semibold whitespace-nowrap sticky left-0 bg-white hover:bg-slate-50 z-10">
                        {serialNumber}
                      </td>
                      <td className="p-4 text-slate-600 font-medium whitespace-nowrap sticky left-16 bg-white hover:bg-slate-50 z-15 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {formatDateDisplay(t.date)}
                      </td>
                      <td className="p-4 font-bold text-slate-800">{t.itemName}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${badgeColor}`}>
                          {t.transactionType}
                        </span>
                      </td>
                      <td className="p-4 text-center text-emerald-600 font-semibold">
                        {t.quantityIn > 0 ? `+${t.quantityIn}` : '-'}
                      </td>
                      <td className="p-4 text-center text-rose-600 font-semibold">
                        {t.quantityOut > 0 ? `-${t.quantityOut}` : '-'}
                      </td>
                      <td className="p-4 text-center font-extrabold text-slate-900 bg-slate-50/50">
                        {t.balanceAfter}
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-semibold text-slate-700">Ref: {t.referenceNo}</div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">{t.notes}</div>
                      </td>
                      
                      {/* 3-DOT ACTIONS DROPDOWN */}
                      <td className="p-4 text-center relative">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                          className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 mx-auto cursor-pointer"
                        >
                          ⋮
                        </button>

                        {openMenuId === t.id && (
                          <div ref={menuRef} className="absolute right-10 top-12 w-36 bg-white border border-slate-200 shadow-xl rounded-xl z-30 py-1.5 text-left text-xs font-semibold">
                            <button 
                              onClick={() => handleOpenViewModal(t)}
                              className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                            >
                              👁️ View
                            </button>
                            <button 
                              onClick={() => handleOpenEditModal(t)}
                              className="w-full px-4 py-2 hover:bg-slate-50 text-blue-600 flex items-center gap-2 cursor-pointer"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(t)}
                              className="w-full px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {!loading && filteredTransactions.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1} 
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages} 
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}