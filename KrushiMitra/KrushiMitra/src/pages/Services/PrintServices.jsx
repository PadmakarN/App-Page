import PrintIcon from "@mui/icons-material/Print";
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../Services/firebase';
import { collection, addDoc, updateDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export default function PrintServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State & Editing ID
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Dropdown Action Menu States (Smart positioning just like MaterialMapping)
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  // Form States
  const [name, setName] = useState('');
  const [size, setSize] = useState('A0');
  const [sellingRate, setSellingRate] = useState('');
  const [active, setActive] = useState(true);

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

  // Fetch Print Services & Logs in real-time from Firebase
  useEffect(() => {
    const unsubServices = onSnapshot(collection(db, 'printServices'), (snap) => {
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching print services:", err);
      setLoading(false);
    });

    const unsubLogs = onSnapshot(collection(db, 'printServiceLogs'), snap => {
      const logsData = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      logsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setActivityLogs(logsData);
    }, err => {
      console.error("Error fetching logs:", err);
    });

    return () => {
      unsubServices();
      unsubLogs();
    };
  }, []);

  // Helper to log print service activities
  const logActivity = async (action, details) => {
    try {
      const loggedInUser = auth.currentUser;
      const performedBy = loggedInUser?.displayName || loggedInUser?.email || 'Unknown User';

      await addDoc(collection(db, 'printServiceLogs'), {
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
  const handleMenuToggle = (e, sId) => {
    e.stopPropagation();
    if (activeMenuId === sId) {
      setActiveMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const topPos = spaceBelow < 180 ? rect.top - 140 : rect.bottom + 4;
      const leftPos = rect.right - 140;

      setMenuPosition({ top: topPos, left: leftPos });
      setActiveMenuId(sId);
    }
  };

  // Open Modal for Add or Edit
  const handleOpenModal = (service = null) => {
    setActiveMenuId(null);
    if (service) {
      setEditingId(service.id);
      setName(service.name || '');
      setSize(service.size || 'A0');
      setSellingRate(service.sellingRate || '');
      setActive(service.active !== undefined ? service.active : true);
    } else {
      setEditingId(null);
      setName('');
      setSize('A0');
      setSellingRate('');
      setActive(true);
    }
    setIsModalOpen(true);
  };

  // Save or Update Service to Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const oldService = services.find(s => s.id === editingId);
        let changes = [];
        if (oldService.name !== name) changes.push(`Name: "${oldService.name}" ➔ "${name}"`);
        if (oldService.size !== size) changes.push(`Size: "${oldService.size}" ➔ "${size}"`);
        if (oldService.sellingRate !== Number(sellingRate)) changes.push(`Rate: "₹${oldService.sellingRate}" ➔ "₹${sellingRate}"`);
        if (oldService.active !== active) changes.push(`Status: "${oldService.active ? 'Active' : 'Inactive'}" ➔ "${active ? 'Active' : 'Inactive'}"`);

        const changeDetails = changes.length > 0 ? changes.join(', ') : 'Minor details updated';

        await updateDoc(doc(db, 'printServices', editingId), {
          name, 
          size, 
          sellingRate: Number(sellingRate), 
          active,
          updatedAt: serverTimestamp()
        });
        await logActivity('UPDATE', `Updated print service "${name}". Changes: ${changeDetails}`);
        showToast('Record  updated successfully!', 'success');
      } else {
        await addDoc(collection(db, 'printServices'), {
          name, 
          size, 
          sellingRate: Number(sellingRate), 
          active, 
          createdAt: serverTimestamp()
        });
        await logActivity('INSERT', `Added new print service "${name}" (Size: ${size}, Rate: ₹${sellingRate})`);
        showToast('Print service created successfully!', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Error saving service: ' + err.message, 'error');
    }
  };

  // Toggle Active / Inactive Status
  const handleToggleStatus = async (id, currentStatus) => {
    setActiveMenuId(null);
    try {
      const s = services.find(item => item.id === id);
      await updateDoc(doc(db, 'printServices', id), {
        active: !currentStatus
      });
      await logActivity('UPDATE', `Toggled status for "${s?.name || 'Service'}" to ${!currentStatus ? 'Active' : 'Inactive'}`);
      showToast(`Status updated to ${!currentStatus ? 'Active' : 'Inactive'}!`, 'success');
    } catch (err) {
      showToast('Error updating status: ' + err.message, 'error');
    }
  };

  // Delete Service from Firebase
  const handleDelete = async (service) => {
    setActiveMenuId(null);
    if (window.confirm('Are you sure you want to delete this print service?')) {
      try {
        await deleteDoc(doc(db, 'printServices', service.id));
        await logActivity('DELETE', `Deleted print service "${service.name}"`);
        showToast('Print service deleted successfully!', 'success');
      } catch (err) {
        showToast('Error deleting service: ' + err.message, 'error');
      }
    }
  };

  // PDF Generation Handler
  const handleExportPDF = () => {
    setActiveMenuId(null);
    window.print();
  };

  // Search and Filter Logic
  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.size.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Active' && s.active) || 
                          (statusFilter === 'Inactive' && !s.active);
    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentServices = filteredServices.slice(indexOfFirstItem, indexOfLastItem);

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

      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <PrintIcon className="text-blue-600" fontSize="medium" /> Print Service Master
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Add New Service
          </button>
          <button 
            onClick={() => setIsLogModalOpen(true)} 
            className="bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition-all shadow-sm text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <ManageHistoryIcon fontSize="small" /> View Logs
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1">
          <input 
            type="text" 
            placeholder="Search by Service Name or Size..." 
            value={searchTerm} 
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
            className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
            className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* POP-UP MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {editingId ? 'Edit Print Service' : 'Add Print Service'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Service Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. A0 Plotter Print / Letter head" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Print Size</label>
                <select 
                  value={size} 
                  onChange={e => setSize(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A0">A0</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="A3">A3</option>
                  <option value="A4">A4</option>
                  <option value="Letter head">Letter head</option>
                  <option value="Legal">Legal</option>
                  <option value="Custom">Custom / Roll</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Rate (₹)</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="Enter Selling Rate" 
                  value={sellingRate} 
                  onChange={e => setSellingRate(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="activeStatus"
                  checked={active} 
                  onChange={e => setActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="activeStatus" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active Service (Available in Sales Entry)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-md cursor-pointer">
                  {editingId ? 'Update Service' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW LOGS MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ManageHistoryIcon /> Print Service Activity Logs
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

      {/* Services List Card / Table Container with Sticky Sr No and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-base">Print Services List</h2>
          <span className="text-xs sm:text-sm text-slate-500 font-medium">
            Showing: <span className="text-slate-800 font-bold">{filteredServices.length}</span> of {services.length}
          </span>
        </div>

        {/* Table View with Horizontal Scroll & Sticky Columns */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-4 w-16 text-center sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                <th className="p-4">Service Name</th>
                <th className="p-4">Print Size</th>
                <th className="p-4">Selling Rate</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center w-20 sticky right-0 bg-slate-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500 text-sm">
                    Loading services from Firebase...
                  </td>
                </tr>
              ) : currentServices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500 text-sm">
                    No print services found matching your search.
                  </td>
                </tr>
              ) : (
                currentServices.map((s, index) => {
                  const seqNo = indexOfFirstItem + index + 1;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      <td className="p-4 text-center font-semibold text-slate-500 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {seqNo}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{s.name}</td>
                      <td className="p-4 text-slate-600">{s.size}</td>
                      <td className="p-4 font-bold text-slate-700">₹{s.sellingRate}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleStatus(s.id, s.active)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                            s.active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          {s.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="p-4 text-center sticky right-0 bg-white hover:bg-slate-50 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <button 
                          onClick={(e) => handleMenuToggle(e, s.id)}
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

        {/* FLOATING DROPDOWN MENU (Smart positioning with PDF/Print option) */}
        {activeMenuId && (
          <div 
            ref={menuRef}
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            className="fixed w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left text-xs font-semibold"
          >
            <button 
              onClick={() => {
                const s = services.find(item => item.id === activeMenuId);
                if (s) handleOpenModal(s);
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
                const s = services.find(item => item.id === activeMenuId);
                if (s) handleDelete(s);
              }} 
              className="w-full px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
            >
              🗑️ Delete
            </button>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {!loading && filteredServices.length > 0 && (
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