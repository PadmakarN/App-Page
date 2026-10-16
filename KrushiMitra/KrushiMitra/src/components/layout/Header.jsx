import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User, ShieldCheck, Mail, Sparkles, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ toggleSidebar }) {
  const { currentUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Global search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const userInitial = currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : '';

  // All available modules / menu items for searching
  const allModules = [
    { name: 'Dashboard', path: '/' },
    { name: 'Sales Entry', path: '/sales' },
    { name: 'Purchase Entry', path: '/purchase' },
    { name: 'Items Master', path: '/items' },
    { name: 'Print Services', path: '/services' },
    { name: 'Material Mapping', path: '/mapping' },
    { name: 'Customers', path: '/customers' },
    { name: 'Suppliers', path: '/suppliers' },
    { name: 'Stock Transactions', path: '/stocktransactions' },
    { name: 'Reports', path: '/reports' },
    { name: 'Settings', path: '/settings' },
    { name: 'Restore', path: '/restore' }
  ];

  const filteredModules = searchQuery.trim() === '' 
    ? [] 
    : allModules.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Close dropdown & search results on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectModule = (path) => {
    navigate(path);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shadow-xs">
      
      {/* Left: Sidebar Toggle & System Status */}
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar} 
          className="md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
          aria-label="Toggle Sidebar"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Center: Global Search Box (Visible on both Web & Mobile) */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4 relative" ref={searchRef}>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search modules (e.g. Sales, Reports)..."
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() !== '' && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 max-h-72 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              Matching Modules ({filteredModules.length})
            </div>
            {filteredModules.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 text-center">
                No module found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredModules.map((module) => (
                <button
                  key={module.path}
                  onClick={() => handleSelectModule(module.path)}
                  className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span>{module.name}</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-blue-500 bg-slate-100 group-hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors">
                    Open
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right: Profile Circle & Dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 cursor-pointer select-none group py-1 px-2 rounded-xl hover:bg-slate-100 transition-all"
          >
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-blue-200 shadow-xs group-hover:bg-blue-200 transition-all">
              {userInitial || <User size={18} />}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{currentUser?.email}</span>
              <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                <ShieldCheck size={11} /> Admin Access
              </span>
            </div>
          </div>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-700">
              <div className="px-4 py-3 border-b border-slate-100 mb-1">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
                  <Mail size={13} className="text-blue-500" /> Signed in as
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">{currentUser?.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold border border-blue-100">
                  <Sparkles size={10} /> Krushi Mitra Portal
                </div>
              </div>
              
              <div className="px-2 pt-1">
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}