import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../Services/firebase';
import { collection, addDoc, updateDoc, onSnapshot, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';

export default function MaterialMapping() {
  const [services, setServices] = useState([]);
  const [items, setItems] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Dropdown Action Menu States
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [selectedService, setSelectedService] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Helper to show Toast Notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Close menu when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    const handleScroll = () => {
      if (activeMenuId) setActiveMenuId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeMenuId]);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'printServices')),
      getDocs(collection(db, 'items'))
    ]).then(([serviceSnap, itemSnap]) => {
      setServices(serviceSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setItems(itemSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(err => console.error("Error fetching dropdowns:", err));

    const unsubMappings = onSnapshot(collection(db, 'materialMappings'), snap => {
      setMappings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error("Error fetching mappings:", err);
      setLoading(false);
    });

    const unsubLogs = onSnapshot(collection(db, 'materialMappingLogs'), snap => {
      const logsData = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      logsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setActivityLogs(logsData);
    }, err => {
      console.error("Error fetching logs:", err);
    });

    return () => {
      unsubMappings();
      unsubLogs();
    };
  }, []);

  // Helper to log mapping activities
  const logActivity = async (action, details) => {
    try {
      const loggedInUser = auth.currentUser;
      const performedBy = loggedInUser?.displayName || loggedInUser?.email || 'Unknown User';

      await addDoc(collection(db, 'materialMappingLogs'), {
        action,
        details,
        user: performedBy,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  };

  // Handle Three-Dot Button Click & Calculate Smart Position
  const handleMenuToggle = (e, mId) => {
    e.stopPropagation();
    if (activeMenuId === mId) {
      setActiveMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const topPos = spaceBelow < 180 ? rect.top - 160 : rect.bottom + 4;
      const leftPos = rect.right - 140;

      setMenuPosition({ top: topPos, left: leftPos });
      setActiveMenuId(mId);
    }
  };

  const handleOpenModal = (mapping = null) => {
    setActiveMenuId(null);
    if (mapping) {
      setEditingId(mapping.id);
      setSelectedService(mapping.serviceId || '');
      setSelectedItem(mapping.itemId || '');
      setQuantity(mapping.consumptionQty || 1);
    } else {
      setEditingId(null);
      setSelectedService('');
      setSelectedItem('');
      setQuantity(1);
    }
    setIsModalOpen(true);
  };

  const handleViewMapping = (mapping) => {
    setSelectedMapping(mapping);
    setIsViewModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const service = services.find(s => s.id === selectedService);
    const item = items.find(i => i.id === selectedItem);

    if (!service || !item) {
      showToast('Please select valid service and raw material.', 'error');
      return;
    }

    try {
      if (editingId) {
        const oldMapping = mappings.find(m => m.id === editingId);
        let changes = [];
        if (oldMapping.serviceName !== service.name) changes.push(`Service: "${oldMapping.serviceName}" ➔ "${service.name}"`);
        if (oldMapping.itemName !== item.name) changes.push(`Raw Material: "${oldMapping.itemName}" ➔ "${item.name}"`);
        if (oldMapping.consumptionQty !== Number(quantity)) changes.push(`Qty: "${oldMapping.consumptionQty}" ➔ "${quantity}"`);

        const changeDetails = changes.length > 0 ? changes.join(', ') : 'Minor details updated';

        await updateDoc(doc(db, 'materialMappings', editingId), {
          serviceId: service.id,
          serviceName: service.name,
          itemId: item.id,
          itemName: item.name,
          consumptionQty: Number(quantity)
        });
        await logActivity('UPDATE', `Updated mapping for "${service.name}". Changes: ${changeDetails}`);
        showToast('Material mapping updated successfully!', 'success');
      } else {
        await addDoc(collection(db, 'materialMappings'), {
          serviceId: service.id,
          serviceName: service.name,
          itemId: item.id,
          itemName: item.name,
          consumptionQty: Number(quantity),
          createdAt: serverTimestamp()
        });
        await logActivity('INSERT', `Added new mapping: "${service.name}" uses "${item.name}" (Qty: ${quantity})`);
        showToast('Material mapped successfully!', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Error saving mapping: ' + err.message, 'error');
    }
  };

  const handleDelete = async (mapping) => {
    setActiveMenuId(null);
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      try {
        await deleteDoc(doc(db, 'materialMappings', mapping.id));
        await logActivity('DELETE', `Deleted mapping for "${mapping.serviceName}"`);
        showToast('Material mapping deleted successfully!', 'success');
      } catch (err) {
        showToast('Error deleting mapping: ' + err.message, 'error');
      }
    }
  };

  // PDF Generation Handler
  const handleExportPDF = () => {
    setActiveMenuId(null);
    window.print();
  };

  // Search Filter Logic
  const filteredMappings = mappings.filter(m => 
    m.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMappings.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMappings = filteredMappings.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto relative">
      
      {/* FLOATING TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-all animate-bounce ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          <span>{toast.type === 'error' ? '❌' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header, Action Buttons (PDF removed from here and placed inside 3-dot) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <AccountTreeIcon className="text-blue-600" fontSize="medium" /> Print Type to Raw Material Mapping
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Add Mapping
          </button>
          <button 
            onClick={() => setIsLogModalOpen(true)} 
            className="bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition-all shadow-sm text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <ManageHistoryIcon fontSize="small" /> View Logs
          </button>
        </div>
      </div>

      {/* SEARCH & COUNT BAR */}
      <div className="bg-white px-4 py-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 min-h-[64px]">
        <div className="w-full sm:w-80">
          <input 
            type="text" 
            placeholder="Search service or raw material..." 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
            className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
        </div>
        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          Showing <span className="text-slate-800 font-bold">{filteredMappings.length}</span> of <span className="text-slate-800 font-bold">{mappings.length}</span> mappings
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {editingId ? 'Edit Material Mapping' : 'Add Material Mapping'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Print Service</label>
                <select 
                  value={selectedService} 
                  onChange={e => setSelectedService(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Service --</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} {s.size ? `(${s.size})` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Raw Material</label>
                <select 
                  value={selectedItem} 
                  onChange={e => setSelectedItem(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Raw Material --</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} {i.size ? `(${i.size})` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Consumption Qty per Print</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="Consumption Qty" 
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-md cursor-pointer">
                  {editingId ? 'Update Mapping' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isViewModalOpen && selectedMapping && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">Mapping Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">Print Service</span>
                <span className="font-bold text-slate-800 text-base">{selectedMapping.serviceName}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">Raw Material</span>
                <span className="font-medium text-slate-700">{selectedMapping.itemName}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">Consumption Qty per Print</span>
                <span className="font-bold text-slate-700 text-base">{selectedMapping.consumptionQty}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer"
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
                <ManageHistoryIcon /> Material Mapping Activity Logs
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
                    <div key={log.id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${badgeBg}`}>
                          {log.action}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-800 font-semibold text-sm">{log.details}</p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        <span>👤 Performed by:</span>
                        <span className="text-slate-700 font-bold">{log.user || 'Unknown User'}</span>
                      </div>
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

      {/* Mappings Table with Sticky Seq No and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-4 w-16 text-center sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                <th className="p-4">Matrrial Name</th>
                <th className="p-4">Raw Material</th>
                <th className="p-4">Consumption Qty per Print</th>
                <th className="p-4 text-center w-20 sticky right-0 bg-slate-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 text-sm">
                    Loading mappings...
                  </td>
                </tr>
              ) : currentMappings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 text-sm">
                    No material mappings found.
                  </td>
                </tr>
              ) : (
                currentMappings.map((m, index) => {
                  const seqNo = indexOfFirstItem + index + 1;

                  return (
                    <tr key={m.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      <td className="p-4 text-center font-semibold text-slate-500 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {seqNo}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{m.serviceName}</td>
                      <td className="p-4 text-slate-600">{m.itemName}</td>
                      <td className="p-4 font-bold text-slate-700">{m.consumptionQty}</td>
                      
                      <td className="p-4 text-center sticky right-0 bg-white hover:bg-slate-50 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <button 
                          onClick={(e) => handleMenuToggle(e, m.id)}
                          className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center mx-auto text-slate-600 font-bold transition-colors cursor-pointer"
                        >
                          ⋮
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FLOATING DROPDOWN MENU (Now includes PDF option) */}
        {activeMenuId && (
          <div 
            ref={menuRef}
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            className="fixed w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left text-xs font-semibold"
          >
            <button 
              onClick={() => {
                const m = mappings.find(item => item.id === activeMenuId);
                if (m) handleViewMapping(m);
              }} 
              className="w-full px-4 py-2 text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              👁️ View
            </button>
            <button 
              onClick={() => {
                const m = mappings.find(item => item.id === activeMenuId);
                if (m) handleOpenModal(m);
              }} 
              className="w-full px-4 py-2 text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
            >
              ✏️ Edit
            </button>
            <button 
              onClick={handleExportPDF} 
              className="w-full px-4 py-2 text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
            >
              🖨️ PDF / Print
            </button>
            <button 
              onClick={() => {
                const m = mappings.find(item => item.id === activeMenuId);
                if (m) handleDelete(m);
              }} 
              className="w-full px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
            >
              🗑️ Delete
            </button>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {!loading && filteredMappings.length > 0 && (
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