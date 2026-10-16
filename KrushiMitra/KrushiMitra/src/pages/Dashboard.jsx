import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../pages/Services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  AlertTriangle, DollarSign, ShoppingBag, Package, 
  FileText, Plus, TrendingUp, ArrowUpRight, Activity, Calendar
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ 
    sales: 0, 
    purchases: 0, 
    stockCount: 0, 
    lowStockCount: 0, 
    billsCount: 0 
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    // Fetch Inventory Items & Low Stock
    const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
      let low = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (Number(data.currentStock || 0) <= Number(data.minimumStock || 0)) {
          low.push({ id: doc.id, ...data });
        }
      });
      setLowStockItems(low);
      setStats(s => ({ ...s, stockCount: snapshot.docs.length, lowStockCount: low.length }));
    });

    // Fetch Sales & Recent Sales
    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      let totalSales = 0;
      let salesList = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalSales += Number(data.grandTotal || 0);
        salesList.push({ id: doc.id, ...data });
      });
      setStats(s => ({ ...s, sales: totalSales, billsCount: snapshot.docs.length }));
      setRecentSales(salesList.slice(0, 5));
    });

    // Fetch Purchases
    const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snapshot) => {
      let totalPurchases = 0;
      snapshot.docs.forEach(doc => {
        totalPurchases += Number(doc.data().grandTotal || 0);
      });
      setStats(s => ({ ...s, purchases: totalPurchases }));
    });

    return () => { unsubItems(); unsubSales(); unsubPurchases(); };
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-800">
      
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full w-fit mb-1.5 border border-blue-100">
            <Activity size={12} /> Live Overview
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">KRUSHI MITRA Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Track your printing business statistics, inventory levels, and latest billing records.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/sales')} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> New Sale Entry
          </button>
        </div>
      </div>

      {/* Critical Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-xs animate-pulse flex items-start gap-3 border border-red-100">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="text-red-800 font-bold text-sm sm:text-base">Critical Low Stock Alert!</h3>
            <p className="text-red-700 text-xs sm:text-sm mt-0.5">
              {lowStockItems.length} items are running below minimum threshold limits. Review your inventory below.
            </p>
          </div>
        </div>
      )}

      {/* STATS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div className="flex justify-between items-start">
            <p className="text-xs sm:text-sm font-semibold text-slate-500">Total Sales</p>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">₹{stats.sales.toFixed(2)}</h3>
            <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp size={10} /> Revenue Collected
            </span>
          </div>
        </div>

        {/* Total Purchase */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div className="flex justify-between items-start">
            <p className="text-xs sm:text-sm font-semibold text-slate-500">Total Purchases</p>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">₹{stats.purchases.toFixed(2)}</h3>
            <span className="text-[10px] font-medium text-slate-400 mt-1 block">Expense Outflow</span>
          </div>
        </div>

        {/* Stock Items */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div className="flex justify-between items-start">
            <p className="text-xs sm:text-sm font-semibold text-slate-500">Stock Items</p>
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-105 transition-transform">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{stats.stockCount}</h3>
            <span className="text-[10px] font-medium text-slate-400 mt-1 block">Active Catalog Items</span>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div className="flex justify-between items-start">
            <p className="text-xs sm:text-sm font-semibold text-slate-500">Low Stock</p>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl group-hover:scale-105 transition-transform">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-extrabold text-red-600 tracking-tight">{stats.lowStockCount}</h3>
            <span className="text-[10px] font-medium text-red-500 mt-1 block">Needs Restocking</span>
          </div>
        </div>

        {/* Bills Count */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between col-span-2 lg:col-span-1 hover:border-slate-300 transition-all group">
          <div className="flex justify-between items-start">
            <p className="text-xs sm:text-sm font-semibold text-slate-500">Total Bills</p>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{stats.billsCount}</h3>
            <span className="text-[10px] font-medium text-slate-400 mt-1 block">Generated Invoices</span>
          </div>
        </div>

      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Sales Chart Box */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between min-h-[280px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Sales Chart</h3>
              <p className="text-xs text-slate-400">Performance overview across months</p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <Calendar size={12} /> 2026
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl p-6 text-slate-400 text-xs sm:text-sm bg-slate-50/50">
            <TrendingUp size={28} className="text-slate-300 mb-2" />
            [ Monthly Sales Bar Chart Integration Area ]
          </div>
        </div>

        {/* Sales Overview Chart Box */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between min-h-[280px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Sales Overview Analytics</h3>
              <p className="text-xs text-slate-400">Trend analysis & fluctuations</p>
            </div>
            <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100">
              Live Feed
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl p-6 text-slate-400 text-xs sm:text-sm bg-slate-50/50">
            <Activity size={28} className="text-slate-300 mb-2" />
            [ Sales Overview Line Chart Integration Area ]
          </div>
        </div>

      </div>

      {/* DATA LISTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Items List */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Low Stock Items List</h3>
              <p className="text-xs text-slate-400">Items that require immediate reorder</p>
            </div>
            <span className="text-xs font-bold bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100">
              {lowStockItems.length} items
            </span>
          </div>
          
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3.5 bg-red-50/40 rounded-xl border border-red-100/80 transition-all hover:bg-red-50">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{item.name}</h4>
                    <p className="text-xs text-red-600 mt-0.5 font-medium">Current Stock: <span className="font-bold">{item.currentStock}</span> | Min Limit: {item.minimumStock}</p>
                  </div>
                </div>
                <span className="bg-red-600 text-white text-[10px] sm:text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 shadow-xs">
                  Reorder
                </span>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-xs sm:text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200 my-auto">
                All inventory stock levels are safe and healthy!
              </div>
            )}
          </div>
        </div>

        {/* Recent Sales List */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Sales Bills</h3>
              <p className="text-xs text-slate-400">Latest transactions performed</p>
            </div>
            <button 
              onClick={() => navigate('/sales')} 
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowUpRight size={14} />
            </button>
          </div>
          
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {recentSales.map(sale => (
              <div key={sale.id} className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-slate-100/70 transition-all">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{sale.customerName || 'Walk-in Customer'}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Bill #{sale.billNumber || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 text-sm sm:text-base">₹{Number(sale.grandTotal || 0).toFixed(2)}</span>
                  <span className="block text-[10px] text-emerald-600 font-medium">Completed</span>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-xs sm:text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200 my-auto">
                No recent sales recorded yet.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}