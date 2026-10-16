import React, { useState, useEffect } from 'react';
import { db } from '../Services/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

import { CheckCircle2, X } from 'lucide-react';
import ShopIcon from '@mui/icons-material/Shop';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const [isLogsOpen, setIsLogsOpen] = useState(false);

  const [originalData, setOriginalData] = useState({});
  const [logs, setLogs] = useState([]);

  // ==============================
  // SETTINGS STATE
  // ==============================

  const [shopName, setShopName] = useState('');
  const [shopLogo, setShopLogo] = useState('');

  // TWO NAMES
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');

  // TWO MOBILE NUMBERS
  const [mobileNumber1, setMobileNumber1] = useState('');
  const [mobileNumber2, setMobileNumber2] = useState('');

  // EMAIL
  const [email, setEmail] = useState('');

  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [lowStockLimit, setLowStockLimit] = useState(5);

  // ==============================
  // TOAST
  // ==============================

  const showToast = (message, type = 'success') => {
    setToast({
      show: true,
      message,
      type
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: '',
        type: 'success'
      });
    }, 3500);
  };

  // ==============================
  // LOAD SETTINGS
  // ==============================

  useEffect(() => {
    const fetchSettingsAndLogs = async () => {
      try {
        const docRef = doc(db, 'settings', 'shopSettings');

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setOriginalData(data);

          setShopName(data.shopName || '');
          setShopLogo(data.shopLogo || '');

          // TWO NAMES
          setName1(data.name1 || '');
          setName2(data.name2 || '');

          // TWO MOBILE NUMBERS
          setMobileNumber1(data.mobileNumber1 || '');
          setMobileNumber2(data.mobileNumber2 || '');

          // EMAIL
          setEmail(data.email || '');

          setAddress(data.address || '');
          setGstNumber(data.gstNumber || '');
          setInvoicePrefix(data.invoicePrefix || 'INV-');
          setLowStockLimit(data.lowStockLimit ?? 5);
        }

        // ==============================
        // FETCH LOGS
        // ==============================

        const q = query(
          collection(db, 'settings_logs'),
          orderBy('timestamp', 'desc'),
          limit(15)
        );

        const querySnapshot = await getDocs(q);

        const fetchedLogs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setLogs(fetchedLogs);

      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsAndLogs();
  }, []);

  // ==============================
  // SAVE SETTINGS
  // ==============================

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    setSaving(true);

    try {
      const updatedData = {
        shopName: shopName.trim(),
        shopLogo: shopLogo.trim(),

        // TWO NAMES
        name1: name1.trim(),
        name2: name2.trim(),

        // TWO MOBILE NUMBERS
        mobileNumber1: mobileNumber1.trim(),
        mobileNumber2: mobileNumber2.trim(),

        // EMAIL
        email: email.trim(),

        address: address.trim(),

        gstNumber: gstNumber.trim().toUpperCase(),

        invoicePrefix: invoicePrefix.trim(),

        lowStockLimit: Number(lowStockLimit),

        updatedAt: serverTimestamp()
      };

      // ==============================
      // FIELD LABELS
      // ==============================

      const fieldLabels = {
        shopName: 'Shop Name',
        shopLogo: 'Shop Logo',

        name1: 'Name 1',
        name2: 'Name 2',

        mobileNumber1: 'Mobile Number 1',
        mobileNumber2: 'Mobile Number 2',

        email: 'Email',

        address: 'Business Address',

        gstNumber: 'GST Number',

        invoicePrefix: 'Invoice Prefix',

        lowStockLimit: 'Low Stock Limit'
      };

      // ==============================
      // DETECT CHANGES
      // ==============================

      const changesSummary = [];

      Object.keys(updatedData).forEach((key) => {

        if (key === 'updatedAt') return;

        const oldValue = originalData[key] ?? '';
        const newValue = updatedData[key] ?? '';

        if (String(oldValue) !== String(newValue)) {

          changesSummary.push({
            field: fieldLabels[key] || key,
            oldVal:
              oldValue === '' || oldValue === null
                ? '(Empty)'
                : oldValue,
            newVal:
              newValue === '' || newValue === null
                ? '(Empty)'
                : newValue
          });

        }
      });

      // ==============================
      // SAVE TO FIREBASE
      // ==============================

      await setDoc(
        doc(db, 'settings', 'shopSettings'),
        updatedData,
        {
          merge: true
        }
      );

      // ==============================
      // SAVE LOG
      // ==============================

      if (changesSummary.length > 0) {

        const logEntry = {
          changes: changesSummary,
          timestamp: new Date()
        };

        await addDoc(
          collection(db, 'settings_logs'),
          logEntry
        );

        setLogs(prev => [
          {
            id: Date.now().toString(),
            ...logEntry
          },
          ...prev.slice(0, 14)
        ]);
      }

      // ==============================
      // UPDATE ORIGINAL DATA
      // ==============================

      setOriginalData({
        ...updatedData,
        updatedAt: new Date()
      });

      // ==============================
      // SIDEBAR LIVE UPDATE
      // ==============================

      window.dispatchEvent(
        new CustomEvent('shopNameUpdated', {
          detail: {
            Shopname: shopName
          }
        })
      );

      showToast('Settings Saved Successfully!');

    } catch (err) {

      console.error('Save Settings Error:', err);

      showToast(
        'Error saving settings: ' + err.message,
        'error'
      );

    } finally {
      setSaving(false);
    }
  };

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Loading settings...
      </div>
    );
  }

  // ==============================
  // UI
  // ==============================

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto relative">

      {/* ==============================
          TOAST
      ============================== */}

      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-white shadow-lg text-sm transition-all duration-300 ${
            toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-emerald-600'
          }`}
        >
          <CheckCircle2 size={18} />

          <span>
            {toast.message}
          </span>
        </div>
      )}

      {/* ==============================
          HEADER
      ============================== */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2.5">

          <ShopIcon
            sx={{
              fontSize: 28,
              color: '#2563eb'
            }}
          />

          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            Shop Settings
          </h1>

        </div>

        <button
          onClick={() => setIsLogsOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          title="View Change History"
        >

          <ManageHistoryIcon
            sx={{
              fontSize: 20
            }}
          />

          <span>
            View Logs
          </span>

        </button>

      </div>

      {/* ==============================
          SETTINGS FORM
      ============================== */}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        <form
          onSubmit={handleSaveSettings}
          className="p-5 sm:p-6 space-y-5"
        >

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* ==============================
                SHOP NAME
            ============================== */}

            <div className="sm:col-span-2">

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Shop / Business Name
              </label>

              <input
                type="text"
                value={shopName}
                onChange={(e) =>
                  setShopName(e.target.value)
                }
                required
                placeholder="Enter shop name"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* ==============================
                SHOP LOGO
            ============================== */}

            <div className="sm:col-span-2">

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Shop Logo URL / Image Link
              </label>

              <input
                type="url"
                value={shopLogo}
                onChange={(e) =>
                  setShopLogo(e.target.value)
                }
                placeholder="https://example.com/logo.png"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* ==============================
                NAME 1
            ============================== */}

            <div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Name
              </label>

              <input
                type="text"
                value={name1}
                onChange={(e) =>
                  setName1(e.target.value)
                }
                placeholder="Enter first name"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* ==============================
                NAME 2
            ============================== */}

            <div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Name
              </label>

              <input
                type="text"
                value={name2}
                onChange={(e) =>
                  setName2(e.target.value)
                }
                placeholder="Enter second name"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* ==============================
                MOBILE 1
            ============================== */}

            <div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mobile No.
              </label>

              <input
                type="tel"
                value={mobileNumber1}
                onChange={(e) =>
                  setMobileNumber1(e.target.value)
                }
                required
                placeholder="Enter mobile number"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* ==============================
                MOBILE 2
            ============================== */}

            <div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mobile No.
              </label>

              <input
                type="tel"
                value={mobileNumber2}
                onChange={(e) =>
                  setMobileNumber2(e.target.value)
                }
                placeholder="Enter second mobile number"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* ==============================
                EMAIL
            ============================== */}

            <div className="sm:col-span-2">

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="example@gmail.com"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* ==============================
                GST
            ============================== */}

            <div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                GST No.
              </label>

              <input
                type="text"
                value={gstNumber}
                onChange={(e) =>
                  setGstNumber(e.target.value.toUpperCase())
                }
                placeholder="GST Number"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
              />

            </div>

            {/* ==============================
                INVOICE PREFIX
            ============================== */}

            <div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Invoice Prefix
              </label>

              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) =>
                  setInvoicePrefix(e.target.value)
                }
                required
                placeholder="INV-"
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />

            </div>

            {/* ==============================
                ADDRESS
            ============================== */}

            <div className="sm:col-span-2">

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Business Address
              </label>

              <textarea
                rows="3"
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                required
                placeholder="Enter complete business address"
                className="w-full border border-slate-300 p-3 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* ==============================
                LOW STOCK
            ============================== */}

            <div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Low Stock Default Limit
              </label>

              <input
                type="number"
                min="0"
                value={lowStockLimit}
                onChange={(e) =>
                  setLowStockLimit(e.target.value)
                }
                required
                className="w-full h-10 border border-slate-300 px-3.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>

          {/* ==============================
              ACTIONS
          ============================== */}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >

              {saving
                ? 'Saving...'
                : 'Save'}

            </button>

          </div>

        </form>

      </div>

      {/* ==============================
          LOGS MODAL
      ============================== */}

      {isLogsOpen && (

        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">

            {/* HEADER */}

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">

              <div className="flex items-center gap-2 text-slate-800 font-bold text-base">

                <ManageHistoryIcon
                  sx={{
                    fontSize: 22,
                    color: '#2563eb'
                  }}
                />

                <h2>
                  Settings Modification History
                </h2>

              </div>

              <button
                onClick={() =>
                  setIsLogsOpen(false)
                }
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

            </div>

            {/* BODY */}

            <div className="p-6 overflow-y-auto space-y-3 flex-1">

              {logs.length === 0 ? (

                <p className="text-xs text-slate-400 text-center py-8">
                  No modification history recorded yet.
                </p>

              ) : (

                logs.map((log) => (

                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                  >

                    <div className="text-slate-400 font-medium">

                      {log.timestamp?.seconds
                        ? new Date(
                            log.timestamp.seconds * 1000
                          ).toLocaleString(
                            'en-IN',
                            {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            }
                          )
                        : 'Just now'}

                    </div>

                    <div className="space-y-1">

                      {log.changes?.map(
                        (ch, idx) => (

                          <div
                            key={idx}
                            className="flex flex-wrap items-center gap-1.5 text-slate-700"
                          >

                            <span className="font-semibold text-slate-900">
                              {ch.field}:
                            </span>

                            <span className="line-through text-red-500 bg-red-50 px-1 rounded">
                              {ch.oldVal}
                            </span>

                            <span>
                              ➔
                            </span>

                            <span className="text-emerald-600 bg-emerald-50 font-medium px-1 rounded">
                              {ch.newVal}
                            </span>

                          </div>

                        )
                      )}

                    </div>

                  </div>

                ))

              )}

            </div>

            {/* FOOTER */}

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">

              <button
                onClick={() =>
                  setIsLogsOpen(false)
                }
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}