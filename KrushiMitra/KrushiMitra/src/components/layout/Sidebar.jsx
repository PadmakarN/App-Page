import  { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, 
   Users, Truck, BarChart3, Settings, Search, X, RotateCcw, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // State to control Open Tabs dropdown visibility
  const [isOpenTabsVisible, setIsOpenTabsVisible] = useState(true);
  
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Sales Entry', path: '/sales', icon: ShoppingCart },
    { name: 'Purchase Entry', path: '/purchase', icon: ShoppingBag },
    { name: 'Items Master', path: '/items', icon: Package },
   //{ name: 'Print Services', path: '/services', icon: Printer },
   // { name: 'Material Mapping', path: '/mapping', icon: Layers },
    { name: 'Bill', path: '/bill', icon: ShoppingBag },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Suppliers', path: '/suppliers', icon: Truck },
    { name: 'Stock Transactions', path: '/stocktransactions', icon: Package },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Restore', path: '/restore', icon: RotateCcw }
  ];

  // Initialize openTabs with Dashboard by default so it's always there upon login/load
  const [openTabs, setOpenTabs] = useState(() => {
    const dashboardItem = menuItems.find(item => item.path === '/');
    return dashboardItem ? [dashboardItem] : [];
  });
  
  // State for dynamic Shopname from backend
  const [Shopname, setShopname] = useState('Krushi Mitra Agri Services');

  // Backend settings fetch effect
  useEffect(() => {
    console.log("fetch setting call");
    const fetchSettingsFromBackend = async () => {
      try {
        const response = await fetch('/api/settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
        
        if (response.ok) {
          const data = await response.json();
          console.log(response)  
          if (data && data.Shopname) {
            setShopname(data.Shopname);
          } else if (Array.isArray(data) && data.length > 0 && data[0].Shopname) {
            setShopname(data[0].Shopname);
          }
        }
      } catch (err) {
        console.error('Error fetching Shopname from backend:', err);
      }
    };

    fetchSettingsFromBackend();

    const handleShopNameUpdate = (e) => {
      if (e.detail && e.detail.Shopname) {
        setShopname(e.detail.Shopname);
      } else {
        fetchSettingsFromBackend();
      }
    };

    window.addEventListener('shopNameUpdated', handleShopNameUpdate);

    return () => {
      window.removeEventListener('shopNameUpdated', handleShopNameUpdate);
    };
  }, []);

  // Automatically add current visited page to open tabs
  useEffect(() => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    if (currentItem) {
      setOpenTabs(prevTabs => {
        if (prevTabs.some(tab => tab.path === currentItem.path)) {
          return prevTabs;
        }
        return [...prevTabs, currentItem];
      });
    }
  }, [location.pathname]);

  const handleCloseTab = (e, pathToRemove) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenTabs(prevTabs => prevTabs.filter(tab => tab.path !== pathToRemove));
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop / Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand / Header */}
        <div className="flex items-center justify-between h-16 px-5 bg-slate-950 text-white font-bold text-sm tracking-wide border-b border-slate-800/80">
          <span className="truncate" title={Shopname}>{Shopname}</span>
          
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input for Menu */}
        <div className="p-3 pb-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 text-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500 border border-slate-800 transition-all"
            />
          </div>
        </div>

        <nav className="p-3 pt-1 space-y-4 overflow-y-auto h-[calc(100vh-8rem)] scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* TOP OPEN TABS DROPDOWN SECTION */}
          {openTabs.length > 0 && searchQuery === '' && (
            <div className="space-y-1 pb-3 border-b border-slate-800">
              
              {/* Dropdown Click Header */}
              <button
                onClick={() => setIsOpenTabsVisible(!isOpenTabsVisible)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase hover:text-slate-200 transition-colors cursor-pointer rounded bg-slate-950/30 hover:bg-slate-800/40"
              >
                <span>Open Tabs ({openTabs.length})</span>
                {isOpenTabsVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {/* Dropdown List Items */}
              {isOpenTabsVisible && (
                <div className="space-y-1 pt-1 pl-1">
                  {openTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = location.pathname === tab.path;
                    return (
                      <Link
                        key={`tab-${tab.name}`}
                        to={tab.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all group ${
                          isActive 
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-xs' 
                            : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon size={14} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                          <span className="truncate">{tab.name}</span>
                        </div>
                        <button
                          onClick={(e) => handleCloseTab(e, tab.path)}
                          className="text-slate-500 hover:text-slate-200 p-0.5 rounded hover:bg-slate-700/50 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                          title="Close Tab"
                        >
                          <X size={12} />
                        </button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ALL / FILTERED MENU ITEMS SECTION */}
          <div className="space-y-1">
            {searchQuery !== '' && (
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-2 mb-1.5">Menu Results</p>
            )}
            {filteredMenuItems.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No menu found</p>
            ) : (
              filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-sm font-semibold' 
                        : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                    {item.name}
                  </Link>
                );
              })
            )}
          </div>

        </nav>
      </aside>
    </>
  );
}