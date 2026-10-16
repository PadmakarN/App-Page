import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ItemsMaster from './pages/Items/ItemsMaster';
import PrintServices from './pages/Services/PrintServices';
import MaterialMapping from './pages/Mapping/MaterialMapping';
import CustomersMaster from './pages/Customers/customers';
import ItemsCards from './pages/ItemsCards';
import SalesEntry from './pages/Sales/SalesEntry';
import PurchaseEntry from './pages/Purchase/PurchaseEntry';
import StockTransactions from './pages/StockTransactions/StockTransactions';
import Settings from './pages/Settings/Settings';
import Suppliers from './pages/Suppliers/Suppliers';
import Reports from './pages/Reports/Reports';
import RestoreModule from './pages/Settings/RestoreModule';

function ProtectedLayout() {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/items" element={<ItemsMaster />} />
            <Route path="/bill" element={<ItemsCards/>} />
            <Route path="/services" element={<PrintServices />} />
            <Route path="/mapping" element={<MaterialMapping />} />
            <Route path="/customers" element={<CustomersMaster/>} />
            <Route path="/sales" element={<SalesEntry />} />
            <Route path="/purchase" element={<PurchaseEntry />} />
            <Route path="/stocktransactions" element={<StockTransactions />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/Suppliers" element={<Suppliers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/restore" element={<RestoreModule />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}