import Inventory2Icon from "@mui/icons-material/Inventory2";
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";
import agricultureCategories from "./catergory";
import brand from "./brandname";
import { useState, useEffect, useRef } from "react";
import units from "./units";
import { db, auth } from "../Services/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export default function ItemsMaster() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  // Modal States & Editing/Viewing/Logging IDs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // Toast Notification State
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Dropdown Action Menu States (Smart positioning)
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brandname, setBrandName] = useState("");
  const [unit, setUnit] = useState("Pieces");
  const [image, setImage] = useState(null);
  const [currentStock, setCurrentStock] = useState(0);
  const [minimumStock, setMinimumStock] = useState(2);
  const [purchaseRate, setPurchaseRate] = useState(0);
  const [salesRate, setSalesRate] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Helper to show Toast Notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
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

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeMenuId]);

  // Real-time listeners to fetch items & logs from Firebase
  useEffect(() => {
    const unsubItems = onSnapshot(
      collection(db, "items"),
      (snap) => {
        setItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching items:", err);
        setLoading(false);
      },
    );

    const unsubLogs = onSnapshot(
      collection(db, "itemLogs"),
      (snap) => {
        const logsData = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        logsData.sort(
          (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
        );
        setActivityLogs(logsData);
      },
      (err) => {
        console.error("Error fetching logs:", err);
      },
    );

    return () => {
      unsubItems();
      unsubLogs();
    };
  }, []);

  // Helper to log item activities
  const logActivity = async (action, details) => {
    try {
      const loggedInUser = auth.currentUser;
      const performedBy =
        loggedInUser?.displayName || loggedInUser?.email || "Unknown User";

      await addDoc(collection(db, "itemLogs"), {
        action,
        details,
        user: performedBy,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  };

  // Handle Three-Dot Button Click & Calculate Smart Position
  const handleMenuToggle = (e, itemId) => {
    e.stopPropagation();
    if (activeMenuId === itemId) {
      setActiveMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;

      const topPos = spaceBelow < 200 ? rect.top - 180 : rect.bottom + 4;
      const leftPos = rect.right - 140;

      setMenuPosition({ top: topPos, left: leftPos });
      setActiveMenuId(itemId);
    }
  };

  // Open Modal for Add or Edit
  const handleOpenModal = (item = null) => {
    setActiveMenuId(null);
    if (item) {
      setEditingId(item.id);
      setName(item.name || "");
      setCategory(item.category || "Roll");
      setBrandName(item.setBrandName || "0");
      setUnit(item.unit || "Pieces");
      setCurrentStock(item.currentStock || 0);
      setMinimumStock(item.minimumStock || 2);
      setPurchaseRate(item.purchaseRate || 0);
      setSalesRate(item.salesRate);
      setImage(item.image);
    } else {
      setEditingId(null);
      setName("");
      setCategory("Roll");
      setBrandName("");
      setImage(null);
      setUnit("Pieces");
      setCurrentStock(0);
      setMinimumStock(2);
      setPurchaseRate(0);
      setSalesRate(0);
    }
    setIsModalOpen(true);
  };

  // Open View Details Modal
  const handleOpenView = (item) => {
    setActiveMenuId(null);
    setViewingItem(item);
    setIsViewModalOpen(true);
  };

  // Save or Update Raw Material in Firebase Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const oldItem = items.find((i) => i.id === editingId);
        let changes = [];
        if (oldItem.name !== name)
          changes.push(`Name: "${oldItem.name}" ➔ "${name}"`);
        if (oldItem.category !== category)
          changes.push(`Category: "${oldItem.category}" ➔ "${category}"`);
        if (oldItem.brandname !== brandname)
          changes.push(`BrandName: "${oldItem.brandname}" ➔ "${brandname}"`);
        if (oldItem.currentStock !== Number(currentStock))
          changes.push(`Stock: "${oldItem.currentStock}" ➔ "${currentStock}"`);
        if (oldItem.purchaseRate !== Number(purchaseRate))
          changes.push(`Rate: "₹${oldItem.purchaseRate}" ➔ "₹${purchaseRate}"`);
        if (oldItem.salesRate !== Number(salesRate))
          changes.push(`Rate: "₹${oldItem.salesRate}" ➔ "₹${salesRate}"`);
        const changeDetails =
          changes.length > 0 ? changes.join(", ") : "Minor details updated";

        await updateDoc(doc(db, "items", editingId), {
          name,
          category,
          brandname,
          unit,
          image,
          currentStock: Number(currentStock),
          minimumStock: Number(minimumStock),
          purchaseRate: Number(purchaseRate),
          SalesRate: Number(salesRate),
          updatedAt: serverTimestamp(),
        });
        await logActivity(
          "UPDATE",
          `Updated raw material "${name}". Changes: ${changeDetails}`,
        );
        showToast("Raw material updated successfully!", "success");
      } else {
        await addDoc(collection(db, "items"), {
          name,
          category,
          brandname,
          unit,
          image,
          currentStock: Number(currentStock),
          minimumStock: Number(minimumStock),
          purchaseRate: Number(purchaseRate),
          SalesRate: Number(salesRate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(
          "INSERT",
          `Added new raw material "${name}" (Brandname: ${brandname}, Stock: ${currentStock} ${unit})`,
        );
        showToast("Raw material added successfully!", "success");
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast("Error saving item: " + err.message, "error");
    }
  };

  // Delete Item from Firebase
  const handleDelete = async (item) => {
    setActiveMenuId(null);
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteDoc(doc(db, "items", item.id));
        await logActivity("DELETE", `Deleted raw material "${item.name}"`);
        showToast("Raw material deleted successfully!", "success");
      } catch (err) {
        showToast("Error deleting item: " + err.message, "error");
      }
    }
  };

  // PDF Generation Handler
  const handleExportPDF = () => {
    setActiveMenuId(null);
    window.print();
  };

  // Search and Filter Logic
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brandname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === "All" ||
      item.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto relative">
      {/* FLOATING TOAST NOTIFICATION */}
      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-all animate-bounce ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          <span>{toast.type === "error" ? "❌" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Inventory2Icon className="text-blue-600" fontSize="medium" /> Item
            & Stock Master
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Add Raw Material
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
            placeholder="Search by Item Name or Size..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => {
              setSelectedCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Categories</option>
            {agricultureCategories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
            {/* <option value="Roll">Seeds</option>
            <option value="Ink">Ink</option>
            <option value="Paper">Paper</option>  */}
          </select>
        </div>
      </div>

      {/* ADD / EDIT POP-UP MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {editingId ? "Edit Raw Material" : "Add New Raw Material"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {/* IMAGE URL + IMAGE PREVIEW SECTION */}
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {/* LEFT SIDE - IMAGE URL INPUT */}
                <div className="space-y-3">
                  {/* IMAGE REMOVE BUTTON */}
                  {image && (
                    <button
                      type="button"
                      onClick={() => {
                        // Image URL आणि error reset करतो.
                        setImage("");
                        setImageError(false);
                      }}
                      className="rounded-lg bg-red-50 px-4 py-2
                   text-sm font-medium text-red-600
                   hover:bg-red-100"
                    >
                     X
                    </button>
                  )}
                </div>

                {/* RIGHT SIDE - IMAGE PREVIEW */}
                <div className="w-full sm:w-64 sm:ml-auto space-y-2">
                  <div
                    className="rounded-xl border-2 
                 border-slate-300 bg-slate-50 p-3"
                  >
                    <div
                      className="flex h-40 items-center justify-center
                   overflow-hidden rounded-lg bg-white"
                    >
                      {image && !imageError ? (
                        <img
                          src={image}
                          alt={name || "Item Image"}
                          className="h-full w-full object-contain"
                          // Image load न झाल्यास error message दाखवतो.
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <p className="mb-2 text-4xl">📦</p>
                          <p className="text-xs">
                            {imageError
                              ? "Image could not be loaded"
                              : "No Image Selected"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. A0 Plotter Paper Roll"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Categories</option>
                  {agricultureCategories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Brand Name
                </label>
                <select
                  value={brandname}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Brand</option>
                  {brand.map((brand, index) => (
                    <option key={index} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>select unit</option>
                  {units.map((unit, index) => (
                    <option key={index} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Current Stock
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Current Stock"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  required
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Image URL
                </label>
                <input
                  type="string"
                  step="any"
                  placeholder="Image Url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  required
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Minimum Stock (Alert Limit)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Minimum Stock"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  required
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Purchase Rate (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Purchase Rate"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  required
                  className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sale Rate (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Sales Rate"
                  value={salesRate}
                  onChange={(e) => setSalesRate(e.target.value)}
                  required
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
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isViewModalOpen && viewingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                👁️ Raw Material Details
              </h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
                <span className="text-slate-500 font-medium">Item Name:</span>
                <span className="text-slate-800 font-bold">
                  {viewingItem.name}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
                <span className="text-slate-500 font-medium">Category:</span>
                <span className="text-slate-800 font-bold">
                  {viewingItem.category}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
                <span className="text-slate-500 font-medium">Brand Name:</span>
                <span className="text-slate-800 font-bold">
                  {viewingItem.brandname}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
                <span className="text-slate-500 font-medium">
                  Current Stock:
                </span>
                <span className="text-slate-800 font-bold">
                  {viewingItem.currentStock} {viewingItem.unit}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
                <span className="text-slate-500 font-medium">
                  Minimum Stock:
                </span>
                <span className="text-slate-800 font-bold">
                  {viewingItem.minimumStock}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
                <span className="text-slate-500 font-medium">
                  Purchase Rate:
                </span>
                <span className="text-slate-800 font-bold">
                  ₹{viewingItem.purchaseRate}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
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
                <ManageHistoryIcon /> Raw Materials Activity Logs
              </h3>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-6">
                  No activity logs found.
                </p>
              ) : (
                activityLogs.map((log) => {
                  let badgeBg = "bg-slate-100 text-slate-700";
                  if (log.action === "INSERT")
                    badgeBg = "bg-emerald-100 text-emerald-700";
                  if (log.action === "UPDATE")
                    badgeBg = "bg-blue-100 text-blue-700";
                  if (log.action === "DELETE")
                    badgeBg = "bg-rose-100 text-rose-700";

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 text-xs space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${badgeBg}`}
                        >
                          {log.action}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {log.timestamp?.toDate
                            ? log.timestamp.toDate().toLocaleString()
                            : "Just now"}
                        </span>
                      </div>
                      <p className="text-slate-800 font-semibold text-sm">
                        {log.details}
                      </p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        <span>👤 Performed by:</span>
                        <span className="text-slate-700 font-bold">
                          {log.user || "Unknown User"}
                        </span>
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

      {/* Items List Table Container with Sticky Sr No and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-base">
            Raw Materials Inventory
          </h2>
          <span className="text-xs sm:text-sm text-slate-500 font-medium">
            Showing:{" "}
            <span className="text-slate-800 font-bold">
              {filteredItems.length}
            </span>{" "}
            of {items.length} items
          </span>
        </div>

        {/* Table View with Horizontal Scroll & Sticky Columns */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-4 w-16 text-center sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  No
                </th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">BrandName</th>
                <th className="p-4">Current Stock</th>
                <th className="p-4">Min Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center w-20 sticky right-0 bg-slate-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-6 text-center text-slate-500 text-sm"
                  >
                    Loading items inventory...
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-6 text-center text-slate-500 text-sm"
                  >
                    No items found matching your search or filters.
                  </td>
                </tr>
              ) : (
                currentItems.map((item, index) => {
                  const seqNo = indexOfFirstItem + index + 1;
                  const isLow =
                    Number(item.currentStock) <= Number(item.minimumStock);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 text-sm hover:bg-slate-50"
                    >
                      <td className="p-4 text-center font-semibold text-slate-500 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {seqNo}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="p-4 text-slate-600">{item.category}</td>
                      <td className="p-4 text-slate-600">{item.brandname}</td>
                      <td className="p-4 font-bold text-slate-700">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="p-4 text-slate-500">
                        {item.minimumStock}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${isLow ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                        >
                          {isLow ? "LOW STOCK ALERT" : "Available"}
                        </span>
                      </td>
                      <td className="p-4 text-center sticky right-0 bg-white hover:bg-slate-50 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <button
                          onClick={(e) => handleMenuToggle(e, item.id)}
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

        {/* FLOATING DROPDOWN MENU (View, Edit, PDF/Print, and Delete options) */}
        {activeMenuId && (
          <div
            ref={menuRef}
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            className="fixed w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left text-xs font-semibold"
          >
            <button
              onClick={() => {
                const item = items.find((i) => i.id === activeMenuId);
                if (item) handleOpenView(item);
              }}
              className="w-full px-4 py-2 text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              👁️ View
            </button>
            <button
              onClick={() => {
                const item = items.find((i) => i.id === activeMenuId);
                if (item) handleOpenModal(item);
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
                const item = items.find((i) => i.id === activeMenuId);
                if (item) handleDelete(item);
              }}
              className="w-full px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
            >
              🗑️ Delete
            </button>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {!loading && filteredItems.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
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
