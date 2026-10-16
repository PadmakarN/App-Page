
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  Search, Package, ShoppingCart, PackagePlus,
  CheckSquare, X, Eye, AlertTriangle
} from "lucide-react";
import { db } from "../pages/Services/firebase";

export default function ItemCards() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewItem, setViewItem] = useState(null);

  // Firebase realtime data
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "items"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        setItems(data);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error(err);
        setError("Items load करता आले नाहीत.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getStock = (item) =>
    Number(item.currentStock ?? item.quantity ?? 0);

  const getPrice = (item) =>
    Number(item.salesRate ?? item.purchaseRate ?? 0);
  const getimage=(item)=>
    item.image || "";

  // Search and filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const keyword = search.toLowerCase().trim();

      const matchesSearch = [
        item.name,
        item.itemCode,
        item.category,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(keyword)
      );

      const stock = getStock(item);

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "available" && stock > 0) ||
        (stockFilter === "out" && stock <= 0);

      return matchesSearch && matchesStock;
    });
  }, [items, search, stockFilter]);

  const selectedItems = items.filter((item) =>
    selectedIds.includes(item.id)
  );

  const allSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) =>
    selectedIds.includes(item.id)
    );

  const toggleItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    const visibleIds = filteredItems.map((item) => item.id);

    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])]
    );
  };

  // Transfer selected items to entry page
  const openEntry = (type) => {
    if (!selectedItems.length) {
      alert("Please select at least one item.");
      return;
    }

    if (
      type === "sales" &&
      selectedItems.some((item) => getStock(item) <= 0)
    ) {
      alert("Out of stock item selected. Please remove it.");
      return;
    }

    const entryItems = selectedItems.map((item) => ({
      itemId: item.id,
      name: item.name ?? "",
      quantity: 1,
      rate: getPrice(item),
      amount: getPrice(item),
      availableStock: getStock(item),
    }));

    navigate(
      type === "sales" ? "/sales" : "/purchase",
      {
        state: {
          selectedItems: entryItems,
          entryType: type,
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        Loading inventory...
      </div>
    );
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Inventory Items
            </h1>
            <p className="text-sm text-slate-500">
              Search, select and manage inventory
            </p>
          </div>

          <div className="rounded-lg bg-white px-4 py-2 shadow-sm">
            <span className="text-sm text-slate-500">
              Total Items
            </span>
            <p className="text-xl font-bold">{items.length}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SummaryCard
            label="Total Products"
            value={items.length}
          />
          <SummaryCard
            label="Available"
            value={items.filter((x) => getStock(x) > 0).length}
          />
          <SummaryCard
            label="Selected"
            value={selectedItems.length}
          />
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search item, code, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-2"
          >
            <option value="all">All Stock</option>
            <option value="available">In Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {/* Selection toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm font-medium">
              Select All ({filteredItems.length})
            </span>
          </label>

          <span className="text-sm text-slate-500">
            {selectedItems.length} selected
          </span>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const selected = selectedIds.includes(item.id);
            const stock = getStock(item);
            const price = getPrice(item);

            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                  selected
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-slate-200"
                }`}
              >
                <div className="relative flex h-44 items-center justify-center bg-slate-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name || "Product"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Package size={52} className="text-slate-300" />
                  )}

                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleItem(item.id)}
                    aria-label={`Select ${item.name}`}
                    className="absolute left-3 top-3 h-5 w-5 accent-blue-600"
                  />

                  <span
                    className={`absolute right-3 top-3 rounded-full px-2 py-1 text-xs font-semibold ${
                      stock > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {stock > 0 ? "In Stock" : "Out of Stock"}
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="truncate text-lg font-semibold text-slate-800">
                      {item.name || "Unnamed Item"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {item.category || "General"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-blue-700">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-slate-500">
                      Stock: {stock}
                    </span>
                  </div>

                  <button
                    onClick={() => setViewItem(item)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center text-slate-500">
            No matching items found.
          </div>
        )}

        {/* Bulk Sales/Purchase actions */}
        {selectedItems.length > 0 && (
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <CheckSquare size={22} />
              <span className="font-medium">
                {selectedItems.length} Items Selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="rounded-full p-1 hover:bg-slate-700"
                aria-label="Clear selection"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openEntry("sales")}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-700"
              >
                <ShoppingCart size={18} />
                Sales
              </button>

              <button
                onClick={() => openEntry("purchase")}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
              >
                <PackagePlus size={18} />
                Purchase
              </button>
            </div>
          </div>
        )}

        {/* View modal */}
        {viewItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setViewItem(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Item Details"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Item Details</h2>
                <button
                  onClick={() => setViewItem(null)}
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>

              {viewItem.imageUrl && (
                <img
                  src={viewItem.imageUrl}
                  alt={viewItem.name}
                  className="mb-4 h-48 w-full rounded-xl object-cover"
                />
              )}

              <div className="space-y-3 text-sm">
                <Detail label="Name" value={viewItem.name} />
                <Detail label="Code" value={viewItem.itemCode} />
                <Detail label="Category" value={viewItem.category} />
                <Detail
                  label="Price"
                  value={`₹${getPrice(viewItem)}`}
                />
                <Detail
                  label="Current Stock"
                  value={getStock(viewItem)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value ?? "-"}</span>
    </div>
  );
}
