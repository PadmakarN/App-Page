import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../Services/firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import ReportIcon from '@mui/icons-material/Report';

// Pure Helper functions moved outside component to save memory allocations
const getSaleDateStr = (s) => {
  const rawDate = s?.date || s?.saleDate || s?.createdAt || '';
  if (!rawDate) return '';
  if (typeof rawDate.toDate === 'function') {
    return rawDate.toDate().toISOString().split('T')[0];
  }
  return String(rawDate).split('T')[0];
};

const getPurchaseDateStr = (p) => {
  const rawDate = p?.purchaseDate || p?.date || p?.createdAt || '';
  if (!rawDate) return 'N/A';
  if (typeof rawDate.toDate === 'function') {
    return rawDate.toDate().toISOString().split('T')[0];
  }
  return String(rawDate).split('T')[0];
};

const getSaleAmount = (s) => {
  const amt = s?.totalAmount ?? s?.grandTotal ?? s?.total ?? s?.amount ?? s?.netAmount ?? 0;
  return Number(amt) || 0;
};

const getItemPrice = (item) => {
  const price = item?.sellingPrice ?? item?.rate ?? item?.price ?? item?.unitPrice ?? item?.mrp ?? item?.amount ?? 0;
  return Number(price) || 0;
};

const reportOptions = [
  { id: 'daily', label: '📊 Daily Sales' },
  { id: 'monthly', label: '📅 Monthly Sales' },
  { id: 'range', label: '📆 Date Range Sales' },
  { id: 'itemwise', label: '🏷️ Service / Item-wise Report' },
  { id: 'purchase', label: '🛍️ Purchase Report' },
  { id: 'stock', label: '📦 Stock Report' },
  { id: 'lowstock', label: '⚠️ Low Stock Report' },
  { id: 'topselling', label: '🔥 Top Selling Services' },
  { id: 'customer', label: '👥 Customer-wise Sales' },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('daily');
  
  // Data States
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Records Limit State (100, 500, 1000, 1500, All)
  const [recordLimit, setRecordLimit] = useState(100);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Optimized Fetching strategy per activeTab
  useEffect(() => {
    let unsubscribe = null;
    setLoading(true);

    if (['daily', 'monthly', 'range', 'topselling', 'customer', 'itemwise'].includes(activeTab)) {
      unsubscribe = onSnapshot(collection(db, 'sales'), (snap) => {
        setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, () => setLoading(false));
    } else if (activeTab === 'purchase') {
      unsubscribe = onSnapshot(collection(db, 'purchases'), (snap) => {
        setPurchases(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, () => setLoading(false));
    } else if (activeTab === 'stock' || activeTab === 'lowstock') {
      unsubscribe = onSnapshot(collection(db, 'items'), (snap) => {
        setStockItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, () => setLoading(false));
    }

    if (activeTab === 'customer' && customers.length === 0) {
      getDocs(collection(db, 'customers')).then((snap) => {
        setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }).catch(() => {}).finally(() => setLoading(false));
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab]);

  // --- MEMOIZED COMPUTATIONS WITH LIMIT HANDLER ---

  const { dailySales, dailyTotal } = useMemo(() => {
    if (activeTab !== 'daily') return { dailySales: [], dailyTotal: 0 };
    const list = sales.filter(s => getSaleDateStr(s) === todayStr);
    const total = list.reduce((acc, curr) => acc + getSaleAmount(curr), 0);
    return { dailySales: list.slice(0, recordLimit), dailyTotal: total };
  }, [sales, todayStr, activeTab, recordLimit]);

  const { monthlySales, monthlyTotal } = useMemo(() => {
    if (activeTab !== 'monthly') return { monthlySales: [], monthlyTotal: 0 };
    const list = sales.filter(s => getSaleDateStr(s).startsWith(selectedMonth));
    const total = list.reduce((acc, curr) => acc + getSaleAmount(curr), 0);
    return { monthlySales: list.slice(0, recordLimit), monthlyTotal: total };
  }, [sales, selectedMonth, activeTab, recordLimit]);

  const { rangeSales, rangeTotal } = useMemo(() => {
    if (activeTab !== 'range' || !startDate || !endDate) return { rangeSales: [], rangeTotal: 0 };
    const list = sales.filter(s => {
      const dateStr = getSaleDateStr(s);
      return dateStr >= startDate && dateStr <= endDate;
    });
    const total = list.reduce((acc, curr) => acc + getSaleAmount(curr), 0);
    return { rangeSales: list.slice(0, recordLimit), rangeTotal: total };
  }, [sales, startDate, endDate, activeTab, recordLimit]);

  const lowStockItems = useMemo(() => {
    if (activeTab !== 'lowstock') return [];
    const list = stockItems.filter(item => Number(item.quantity ?? item.currentStock ?? 0) <= Number(item.lowStockLimit ?? 5));
    return list.slice(0, recordLimit);
  }, [stockItems, activeTab, recordLimit]);

  const { customerSales, customerTotal } = useMemo(() => {
    if (activeTab !== 'customer') return { customerSales: [], customerTotal: 0 };
    const list = sales.filter(s => selectedCustomer ? s.customerName === selectedCustomer : true);
    const total = list.reduce((acc, curr) => acc + getSaleAmount(curr), 0);
    return { customerSales: list.slice(0, recordLimit), customerTotal: total };
  }, [sales, selectedCustomer, activeTab, recordLimit]);

  const topSellingItems = useMemo(() => {
    if (activeTab !== 'topselling') return [];
    const itemMap = {};
    sales.forEach(sale => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const name = item.serviceName || item.itemName || item.name || 'Unknown Service';
          itemMap[name] = (itemMap[name] || 0) + Number(item.quantity || 0);
        });
      }
    });
    const entries = Object.entries(itemMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
    return entries.slice(0, recordLimit);
  }, [sales, activeTab, recordLimit]);

  const itemWiseRows = useMemo(() => {
    if (activeTab !== 'itemwise') return [];
    const rows = [];
    sales.forEach(sale => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item, idx) => {
          const price = Number(item.price || item.rate || item.sellingPrice || 0);
          const qty = Number(item.quantity || 0);
          rows.push({
            id: `${sale.id}_${item.itemId || item.name || idx}`,
            invoiceNumber: sale.invoiceNumber || 'N/A',
            customerName: sale.customerName || 'Walking Customer',
            date: getSaleDateStr(sale),
            serviceName: item.serviceName || item.itemName || item.name || item.title || 'General Service',
            quantity: qty,
            price: price,
            total: Number(item.total || item.amount || (qty * price))
          });
        });
      }
    });
    return rows.slice(0, recordLimit);
  }, [sales, activeTab, recordLimit]);

  const purchaseRows = useMemo(() => {
    if (activeTab !== 'purchase') return [];
    return purchases.slice(0, recordLimit);
  }, [purchases, activeTab, recordLimit]);

  const stockRows = useMemo(() => {
    if (activeTab !== 'stock') return [];
    return stockItems.slice(0, recordLimit);
  }, [stockItems, activeTab, recordLimit]);

  return (
    <div className="h-screen bg-slate-50/60 p-2 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
      <div className="max-w-7xl w-full mx-auto flex flex-col h-full space-y-2 sm:space-y-4">
        
        {/* FIXED TOP CONTAINER: Header, Select Report Type, and Report-Specific Fixed Top Bars */}
        <div className="shrink-0 space-y-2 sm:space-y-3">
          
          {/* Main Title Header - Compacted for mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs border border-slate-200/85">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl border border-blue-100 flex items-center justify-center">
                <ReportIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-bold tracking-tight text-slate-900">Business Reports</h1>
                </div>
            </div>
          </div>

          {/* Controls Bar: Report Type Dropdown & Records Limit Selector */}
          <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs border border-slate-200/85 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-col gap-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Report Type</label>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full sm:w-80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold bg-slate-50/80 border border-slate-300 text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {reportOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Show Records Limit</label>
              <select
                value={recordLimit}
                onChange={(e) => setRecordLimit(Number(e.target.value))}
                className="w-full sm:w-48 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold bg-slate-50/80 border border-slate-300 text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value={100}>100 Records</option>
                <option value={500}>500 Records</option>
                <option value={1000}>1000 Records</option>
                <option value={1500}>1500 Records</option>
                <option value={100000}>All Records</option>
              </select>
            </div>
          </div>

          {/* REPORT-SPECIFIC FIXED HEADER BARS (NEVER SCROLL) */}
          <>
            {/* 1. DAILY SALES TOP BAR */}
            {activeTab === 'daily' && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/85 shadow-xs gap-2 sm:gap-3">
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-slate-800">Today's Sales Summary</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Date: <span className="font-semibold text-slate-700">{todayStr}</span> • Showing top {dailySales.length} records</p>
                </div>
                <div className="bg-slate-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs text-left sm:text-right w-full sm:w-auto">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium uppercase tracking-wider">Total Revenue</span>
                  <span className="text-base sm:text-xl font-black text-blue-600">₹ {dailyTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* 2. MONTHLY SALES TOP BAR */}
            {activeTab === 'monthly' && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/85 shadow-xs gap-3 sm:gap-4">
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-slate-800">Monthly Sales Summary</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Showing top {monthlySales.length} records for selected month</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)} 
                    className="border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                  <div className="bg-slate-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium uppercase tracking-wider">Month Total</span>
                    <span className="text-base sm:text-xl font-black text-blue-600">₹ {monthlyTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DATE RANGE SALES TOP BAR */}
            {activeTab === 'range' && (
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/85 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white font-medium text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white font-medium text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="bg-slate-50 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs w-full lg:w-auto text-left lg:text-right">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium uppercase tracking-wider">Range Total</span>
                  <span className="text-base sm:text-xl font-black text-blue-600">₹ {rangeTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* 4. SERVICE / ITEM-WISE TOP BAR */}
            {activeTab === 'itemwise' && (
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/85 shadow-xs flex justify-between items-center">
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-slate-800">Service / Item-wise Sales Report</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Showing top {itemWiseRows.length} item records</p>
                </div>
                <div className="bg-slate-50 px-3 py-1 rounded-lg sm:rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  Records: {itemWiseRows.length}
                </div>
              </div>
            )}

            {/* 5. PURCHASE REPORT TOP BAR */}
            {activeTab === 'purchase' && (
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/85 shadow-xs flex justify-between items-center">
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-slate-800">All Purchase Orders</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Showing top {purchaseRows.length} purchase records</p>
                </div>
                <div className="bg-slate-50 px-3 py-1 rounded-lg sm:rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  Records: {purchaseRows.length}
                </div>
              </div>
            )}

            {/* 6. STOCK REPORT TOP BAR */}
            {activeTab === 'stock' && (
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/85 shadow-xs flex justify-between items-center">
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-slate-800">Complete Inventory Stock Status</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Showing top {stockRows.length} inventory items</p>
                </div>
                <div className="bg-slate-50 px-3 py-1 rounded-lg sm:rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  Records: {stockRows.length}
                </div>
              </div>
            )}

            {/* 7. LOW STOCK REPORT TOP BAR */}
            {activeTab === 'lowstock' && (
              <div className="bg-amber-50/80 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-amber-200/85 shadow-xs flex justify-between items-center">
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-amber-900">Low Stock Alert Report</h3>
                  <p className="text-[11px] sm:text-xs text-amber-700">Showing top {lowStockItems.length} low stock items</p>
                </div>
                <div className="bg-amber-100 text-amber-900 px-3 py-1 rounded-lg sm:rounded-xl border border-amber-200 text-xs font-extrabold shadow-2xs">
                  Records: {lowStockItems.length}
                </div>
              </div>
            )}

            {/* 8. TOP SELLING TOP BAR */}
            {activeTab === 'topselling' && (
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/85 shadow-xs flex justify-between items-center">
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-slate-800">Top Selling Services / Print Sizes</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Showing top {topSellingItems.length} ranked services</p>
                </div>
                <div className="bg-slate-50 px-3 py-1 rounded-lg sm:rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  Records: {topSellingItems.length}
                </div>
              </div>
            )}

            {/* 9. CUSTOMER-WISE SALES TOP BAR (FIXED: WON'T SCROLL ON MOBILE) */}
            {activeTab === 'customer' && (
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/85 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-full sm:w-auto">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Customer</label>
                  <select 
                    value={selectedCustomer} 
                    onChange={e => setSelectedCustomer(e.target.value)} 
                    className="border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-slate-50/80 font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72"
                  >
                    <option value="">All Customers</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.name || c.customerName}>
                        {c.name || c.customerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-slate-50 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs w-full sm:w-auto text-left sm:text-right">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium uppercase tracking-wider">Customer Total</span>
                  <span className="text-base sm:text-xl font-black text-blue-600">₹ {customerTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </>

        </div>

        {/* INDEPENDENTLY SCROLLABLE CONTENT AREA (ONLY TABLES & LISTS SCROLL WITH STICKY INVOICE NO) */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs border border-slate-200/85 p-3 sm:p-6 flex-1 overflow-y-auto overflow-x-auto">
          
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs sm:text-sm font-medium text-slate-500 animate-pulse">Loading report data from Firebase...</p>
            </div>
          ) : (
            <div className="min-w-[750px]">
              
              {/* 1. DAILY SALES TABLE */}
              {activeTab === 'daily' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Invoice No</th>
                          <th className="p-3.5">Customer Name</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailySales.length === 0 ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs">No sales recorded today.</td></tr>
                        ) : (
                          dailySales.map(s => (
                            <tr key={s.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-mono font-bold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{s.invoiceNumber || 'N/A'}</td>
                              <td className="p-3.5 font-semibold text-slate-700">{s.customerName || 'Walking Customer'}</td>
                              <td className="p-3.5 text-slate-500">{getSaleDateStr(s)}</td>
                              <td className="p-3.5 text-right font-bold text-slate-900">₹ {getSaleAmount(s).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. MONTHLY SALES TABLE */}
              {activeTab === 'monthly' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Invoice No</th>
                          <th className="p-3.5">Customer Name</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {monthlySales.length === 0 ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs">No sales recorded for this month.</td></tr>
                        ) : (
                          monthlySales.map(s => (
                            <tr key={s.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-mono font-bold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{s.invoiceNumber || 'N/A'}</td>
                              <td className="p-3.5 font-semibold text-slate-700">{s.customerName || 'Walking Customer'}</td>
                              <td className="p-3.5 text-slate-500">{getSaleDateStr(s)}</td>
                              <td className="p-3.5 text-right font-bold text-slate-900">₹ {getSaleAmount(s).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. DATE RANGE SALES TABLE */}
              {activeTab === 'range' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Invoice No</th>
                          <th className="p-3.5">Customer Name</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!startDate || !endDate ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs">Please select Start Date and End Date to view report.</td></tr>
                        ) : rangeSales.length === 0 ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs">No sales found in this date range.</td></tr>
                        ) : (
                          rangeSales.map(s => (
                            <tr key={s.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-mono font-bold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{s.invoiceNumber || 'N/A'}</td>
                              <td className="p-3.5 font-semibold text-slate-700">{s.customerName || 'Walking Customer'}</td>
                              <td className="p-3.5 text-slate-500">{getSaleDateStr(s)}</td>
                              <td className="p-3.5 text-right font-bold text-slate-900">₹ {getSaleAmount(s).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. SERVICE / ITEM-WISE TABLE */}
              {activeTab === 'itemwise' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Invoice No</th>
                          <th className="p-3.5">Customer Name</th>
                          <th className="p-3.5">Service / Item Name</th>
                          <th className="p-3.5 text-center">Quantity</th>
                          <th className="p-3.5 text-right">Price (₹)</th>
                          <th className="p-3.5 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemWiseRows.length === 0 ? (
                          <tr><td colSpan="6" className="p-8 text-center text-slate-400 text-xs">No service records found.</td></tr>
                        ) : (
                          itemWiseRows.map((row) => (
                            <tr key={row.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-mono font-bold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{row.invoiceNumber}</td>
                              <td className="p-3.5 font-semibold text-slate-700">{row.customerName}</td>
                              <td className="p-3.5 font-bold text-blue-600">{row.serviceName}</td>
                              <td className="p-3.5 text-center font-bold text-slate-800">{row.quantity}</td>
                              <td className="p-3.5 text-right font-medium text-slate-600">₹ {row.price.toFixed(2)}</td>
                              <td className="p-3.5 text-right font-bold text-slate-900">₹ {row.total.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. PURCHASE TABLE */}
              {activeTab === 'purchase' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5">Supplier Name</th>
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Bill No / Invoice No</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5 text-right">Total Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {purchaseRows.length === 0 ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs">No purchase records found.</td></tr>
                        ) : (
                          purchaseRows.map(p => (
                            <tr key={p.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 font-semibold text-slate-900">{p.supplierName || 'N/A'}</td>
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-mono text-slate-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{p.invoiceNumber || p.billNo || 'N/A'}</td>
                              <td className="p-3.5 text-slate-500">{getPurchaseDateStr(p)}</td>
                              <td className="p-3.5 text-right font-bold text-slate-900">₹ {Number(p.grandTotal || p.totalAmount || p.amount || 0).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. STOCK TABLE */}
              {activeTab === 'stock' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Item Name</th>
                          <th className="p-3.5">Category</th>
                          <th className="p-3.5 text-center">Current Stock Qty</th>
                          <th className="p-3.5 text-right">Selling Price (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockRows.length === 0 ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs">No items found in stock.</td></tr>
                        ) : (
                          stockRows.map(item => (
                            <tr key={item.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-semibold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{item.name || item.itemName}</td>
                              <td className="p-3.5 text-slate-600 font-medium">{item.category || 'General'}</td>
                              <td className="p-3.5 text-center font-bold text-blue-600">{item.currentStock ?? item.quantity ?? 0}</td>
                              <td className="p-3.5 text-right font-medium">₹ {getItemPrice(item).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. LOW STOCK TABLE */}
              {activeTab === 'lowstock' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Item Name</th>
                          <th className="p-3.5 text-center">Remaining Qty</th>
                          <th className="p-3.5 text-center">Minimum Limit</th>
                          <th className="p-3.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lowStockItems.length === 0 ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs">Great! No items are currently low in stock.</td></tr>
                        ) : (
                          lowStockItems.map(item => (
                            <tr key={item.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-semibold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{item.name || item.itemName}</td>
                              <td className="p-3.5 text-center font-bold text-rose-600">{item.currentStock ?? item.quantity ?? 0}</td>
                              <td className="p-3.5 text-center font-medium">{item.lowStockLimit || 5}</td>
                              <td className="p-3.5 text-right font-bold text-rose-600">Reorder Required</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 8. TOP SELLING TABLE */}
              {activeTab === 'topselling' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5 w-16 text-center">Rank</th>
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Service / Item Name</th>
                          <th className="p-3.5 text-right">Total Quantity Sold</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {topSellingItems.length === 0 ? (
                          <tr><td colSpan="3" className="p-8 text-center text-slate-400 text-xs">No service data available.</td></tr>
                        ) : (
                          topSellingItems.map((item, idx) => (
                            <tr key={idx} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 text-center font-bold text-slate-500">#{idx + 1}</td>
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-bold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{item.name}</td>
                              <td className="p-3.5 text-right font-black text-blue-600">{item.qty}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 9. CUSTOMER-WISE TABLE */}
              {activeTab === 'customer' && (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="p-3.5 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Invoice No</th>
                          <th className="p-3.5">Customer Name</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerSales.length === 0 ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs">No sales recorded for this customer.</td></tr>
                        ) : (
                          customerSales.map(s => (
                            <tr key={s.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 sticky left-0 bg-white z-10 font-mono font-bold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{s.invoiceNumber || 'N/A'}</td>
                              <td className="p-3.5 font-semibold text-slate-700">{s.customerName || 'Walking Customer'}</td>
                              <td className="p-3.5 text-slate-500">{getSaleDateStr(s)}</td>
                              <td className="p-3.5 text-right font-bold text-slate-900">₹ {getSaleAmount(s).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}