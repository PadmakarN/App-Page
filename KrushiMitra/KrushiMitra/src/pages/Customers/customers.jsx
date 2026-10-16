import PeopleIcon from "@mui/icons-material/People";
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../Services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, serverTimestamp } from 'firebase/firestore';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [paymentTerms, setPaymentTerms] = useState('Immediate');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('Active');

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

  // Real-time listener for Customers & Activity Logs from Firebase
  useEffect(() => {
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching customers:", err);
      setLoading(false);
    });

    const unsubLogs = onSnapshot(collection(db, 'customerLogs'), (snap) => {
      const logsData = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      logsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setActivityLogs(logsData);
    }, (err) => {
      console.error("Error fetching logs:", err);
    });

    return () => {
      unsubCustomers();
      unsubLogs();
    };
  }, []);

  // Helper to log customer activities dynamically fetching logged-in user name/email
  const logActivity = async (action, details) => {
    try {
      const loggedInUser = auth.currentUser;
      const performedBy = loggedInUser?.displayName || loggedInUser?.email || 'Unknown User';

      await addDoc(collection(db, 'customerLogs'), {
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
  const handleMenuToggle = (e, cId) => {
    e.stopPropagation();
    if (activeMenuId === cId) {
      setActiveMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const topPos = spaceBelow < 150 ? rect.top - 130 : rect.bottom + 4;
      const leftPos = rect.right - 130;

      setMenuPosition({ top: topPos, left: leftPos });
      setActiveMenuId(cId);
    }
  };

  // Open Add Modal & Reset Form
  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedCustomer(null);
    setName('');
    setMobile('');
    setAddress('');
    setGstNo('');
    setCity('');
    setState('');
    setCountry('India');
    setPaymentTerms('Immediate');
    setRemarks('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  // Open Edit Modal with existing data
  const handleOpenEditModal = (customer) => {
    setIsEditMode(true);
    setSelectedCustomer(customer);
    setName(customer.name || '');
    setMobile(customer.mobile || '');
    setAddress(customer.address || '');
    setGstNo(customer.gstNo || '');
    setCity(customer.city || '');
    setState(customer.state || '');
    setCountry(customer.country || 'India');
    setPaymentTerms(customer.paymentTerms || 'Immediate');
    setRemarks(customer.remarks || '');
    setStatus(customer.status || 'Active');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  // Open View Modal
  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
    setActiveMenuId(null);
  };

  // Save or Update Customer in Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEditMode && selectedCustomer) {
        const docRef = doc(db, 'customers', selectedCustomer.id);
        
        // Track specific field modifications for the activity log
        let changes = [];
        if (selectedCustomer.name !== name) changes.push(`Name: "${selectedCustomer.name}" ➔ "${name}"`);
        if (selectedCustomer.mobile !== mobile) changes.push(`Mobile: "${selectedCustomer.mobile || 'None'}" ➔ "${mobile}"`);
        if (selectedCustomer.city !== city) changes.push(`City: "${selectedCustomer.city}" ➔ "${city}"`);
        if (selectedCustomer.status !== status) changes.push(`Status: "${selectedCustomer.status}" ➔ "${status}"`);
        if (selectedCustomer.gstNo !== (gstNo ? gstNo.toUpperCase() : '')) changes.push(`GST: "${selectedCustomer.gstNo || 'None'}" ➔ "${gstNo ? gstNo.toUpperCase() : 'None'}"`);

        const changeDetails = changes.length > 0 ? changes.join(', ') : 'Minor details updated';

        await updateDoc(docRef, {
          name,
          mobile,
          address,
          gstNo: gstNo ? gstNo.toUpperCase() : '',
          city,
          state,
          country,
          paymentTerms,
          remarks,
          status,
          updatedAt: serverTimestamp()
        });
        await logActivity('UPDATE', `Updated customer "${name}". Changes: ${changeDetails}`);
        showToast('Customer updated successfully!', 'success');
      } else {
        await addDoc(collection(db, 'customers'), {
          name,
          mobile,
          address,
          gstNo: gstNo ? gstNo.toUpperCase() : '',
          city,
          state,
          country,
          paymentTerms,
          remarks,
          status,
          createdAt: serverTimestamp()
        });
        await logActivity('INSERT', `Added new customer "${name}" (City: ${city}, Mobile: ${mobile})`);
        showToast('Customer added successfully!', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Error saving customer: ' + err.message, 'error');
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (customer) => {
    setActiveMenuId(null);
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteDoc(doc(db, 'customers', customer.id));
        await logActivity('DELETE', `Deleted customer "${customer.name}"`);
        showToast('Customer deleted successfully!', 'success');
      } catch (err) {
        showToast('Error deleting customer: ' + err.message, 'error');
      }
    }
  };

  // Search Filter Logic
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.gstNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

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

      {/* Header, Add Button & View Log Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <PeopleIcon className="text-blue-600" fontSize="medium" /> Customer Master
          </h1>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button 
            onClick={handleOpenAddModal} 
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Add New Customer
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
            placeholder="Search by name, mobile, GST, city..." 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
            className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
        </div>
        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          Showing <span className="text-slate-800 font-bold">{filteredCustomers.length}</span> of <span className="text-slate-800 font-bold">{customers.length}</span> customers
        </div>
      </div>

      {/* ADD / EDIT POP-UP MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {isEditMode ? 'Edit Customer Details' : 'Add Customer Details'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Customer / Company Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Acme Enterprises" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number</label>
                <input 
                  type="tel" 
                  placeholder="10-digit mobile number" 
                  value={mobile} 
                  onChange={e => setMobile(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">GST Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. 27AAAAA0000A1Z5" 
                  value={gstNo} 
                  onChange={e => setGstNo(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono" 
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <textarea 
                  rows="2"
                  placeholder="Street address, area, landmark" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                <input 
                  type="text" 
                  placeholder="e.g. Nashik / Sinnar" 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                <input 
                  type="text" 
                  placeholder="e.g. Maharashtra" 
                  value={state} 
                  onChange={e => setState(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Country</label>
                <input 
                  type="text" 
                  value={country} 
                  onChange={e => setCountry(e.target.value)} 
                  required 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Terms</label>
                <select 
                  value={paymentTerms} 
                  onChange={e => setPaymentTerms(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Advance">Advance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                <input 
                  type="text" 
                  placeholder="Optional notes" 
                  value={remarks} 
                  onChange={e => setRemarks(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-md cursor-pointer"
                >
                  {isEditMode ? 'Update Customer' : 'Save'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS POP-UP MODAL */}
      {isViewModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">Customer Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg sm:col-span-2">
                <span className="block text-xs text-slate-400 font-semibold">Customer Name</span>
                <span className="font-bold text-slate-800 text-base">{selectedCustomer.name}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">Mobile Number</span>
                <span className="font-medium text-slate-700">{selectedCustomer.mobile}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">GST Number</span>
                <span className="font-mono text-xs font-bold text-slate-700">{selectedCustomer.gstNo || 'N/A'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg sm:col-span-2">
                <span className="block text-xs text-slate-400 font-semibold">Address</span>
                <span className="text-slate-700">{selectedCustomer.address || 'N/A'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">City</span>
                <span className="text-slate-700">{selectedCustomer.city}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">State & Country</span>
                <span className="text-slate-700">{selectedCustomer.state}, {selectedCustomer.country}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">Payment Terms</span>
                <span className="font-semibold text-slate-700">{selectedCustomer.paymentTerms}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-400 font-semibold">Status</span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${selectedCustomer.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {selectedCustomer.status}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg sm:col-span-2">
                <span className="block text-xs text-slate-400 font-semibold">Remarks / Notes</span>
                <span className="text-slate-700">{selectedCustomer.remarks || 'None'}</span>
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

      {/* VIEW LOGS MODAL WITH PERFORMED BY USER NAME */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ManageHistoryIcon /> Customer Activity Logs
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

      {/* Customers List Table with Sticky Seq No and Actions on Mobile Scroll */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-4 w-16 text-center sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">GST No</th>
                <th className="p-4">City / State</th>
                <th className="p-4">Payment Terms</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center w-20 sticky right-0 bg-slate-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500 text-sm">
                    Loading customers from Firebase...
                  </td>
                </tr>
              ) : currentCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500 text-sm">
                    No matching customers found.
                  </td>
                </tr>
              ) : (
                currentCustomers.map((c, index) => {
                  const seqNo = indexOfFirstItem + index + 1;

                  return (
                    <tr key={c.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      {/* Sticky Seq No Column */}
                      <td className="p-4 text-center font-semibold text-slate-500 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {seqNo}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">{c.address}</div>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{c.mobile}</td>
                      <td className="p-4 font-mono text-xs text-slate-600">{c.gstNo || 'N/A'}</td>
                      <td className="p-4 text-slate-600">{c.city}, {c.state}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">
                          {c.paymentTerms}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {c.status}
                        </span>
                      </td>
                      
                      {/* Sticky Actions Column */}
                      <td className="p-4 text-center sticky right-0 bg-white hover:bg-slate-50 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <button 
                          onClick={(e) => handleMenuToggle(e, c.id)}
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

        {/* FLOATING DROPDOWN MENU */}
        {activeMenuId && (
          <div 
            ref={menuRef}
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            className="fixed w-32 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left text-xs font-semibold"
          >
            <button 
              onClick={() => {
                const c = customers.find(item => item.id === activeMenuId);
                if (c) handleViewCustomer(c);
              }} 
              className="w-full px-4 py-2 text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              👁️ View
            </button>
            <button 
              onClick={() => {
                const c = customers.find(item => item.id === activeMenuId);
                if (c) handleOpenEditModal(c);
              }} 
              className="w-full px-4 py-2 text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
            >
              ✏️ Edit
            </button>
            <button 
              onClick={() => {
                const c = customers.find(item => item.id === activeMenuId);
                if (c) handleDeleteCustomer(c);
              }} 
              className="w-full px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
            >
              🗑️ Delete
            </button>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {!loading && filteredCustomers.length > 0 && (
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