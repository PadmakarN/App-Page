import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  deletePurchase,
  logPurchaseView,
  printPurchase,
  subscribePurchases,
  subscribePurchaseLogs,
} from "./purchaseService";

import {
  dateKey,
  filterPurchases,
} from "./purchaseUtils";

const EMPTY_FILTERS = {
  supplier: "",
  invoice: "",
  fromDate: "",
  toDate: "",
};

// List loading, filters, pagination, view, print, delete और logs संभालता है।
export default function usePurchaseList(currentUser) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [viewed, setViewed] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");

  const deleteBusy = useRef(false);

  const itemsPerPage = 5;

  // Purchase history के live बदलाव सुनता है।
  useEffect(() => {
    return subscribePurchases(
      (rows) => {
        setPurchases(rows);
        setLoading(false);
        setLoadError("");
      },
      (err) => {
        setLoadError(err.message);
        setLoading(false);
      }
    );
  }, []);

  // Logs modal खुलने पर listener लगाता है और बंद होने पर हटा देता है।
  useEffect(() => {
    if (!logsOpen) return undefined;

    setLogsLoading(true);
    setLogsError("");

    return subscribePurchaseLogs(
      (rows) => {
        setLogs(rows);
        setLogsLoading(false);
      },
      (err) => {
        setLogsError(err.message);
        setLogsLoading(false);
      }
    );
  }, [logsOpen]);

  // Filters बदलने पर matching purchases निकालता है।
  const filtered = useMemo(
    () => filterPurchases(purchases, filters),
    [purchases, filters]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / itemsPerPage)
  );

  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * itemsPerPage;

  const currentPurchases = filtered.slice(
    start,
    start + itemsPerPage
  );

  // सभी filtered records की quantity और amount जोड़ता है।
  const totals = useMemo(
    () =>
      filtered.reduce(
        (sum, purchase) => ({
          amount:
            sum.amount +
            Number(purchase.grandTotal || 0),

          quantity:
            sum.quantity +
            (purchase.items || []).reduce(
              (qty, row) =>
                qty + Number(row.quantity || 0),
              0
            ),
        }),
        {
          amount: 0,
          quantity: 0,
        }
      ),
    [filtered]
  );

  // Delete/filter के बाद page सीमा से बाहर जाने से रोकता है।
  useEffect(() => {
    setPage((previous) =>
      Math.min(previous, totalPages)
    );
  }, [totalPages]);

  // Filter बदलकर पहले page पर वापस लाता है।
  function changeFilter(name, value) {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPage(1);
  }

  // दोनों date filters में आज की तारीख रखता है।
  function today() {
    setFilters((previous) => ({
      ...previous,
      fromDate: dateKey(),
      toDate: dateKey(),
    }));

    setPage(1);
  }

  // सभी filters साफ करता है।
  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  // पिछला या अगला page दिखाता है।
  function changePage(delta) {
    setPage(
      Math.max(
        1,
        Math.min(currentPage + delta, totalPages)
      )
    );
  }

  // Purchase details खोलता है और view activity लिखता है।
  async function view(purchase) {
    setViewed(purchase);
    setActionError("");

    try {
      await logPurchaseView(
        purchase,
        currentUser
      );
    } catch (err) {
      setActionError(
        `Details opened, but view log failed: ${err.message}`
      );
    }
  }

  // Details modal बंद करता है।
  function closeView() {
    setViewed(null);
  }

  // Purchase print करता है और popup error संभालता है।
  function print(purchase) {
    setActionError("");

    try {
      printPurchase(purchase);
    } catch (err) {
      setActionError(err.message);
    }
  }

  // Delete confirmation modal खोलता है।
  function requestDelete(purchase) {
    setActionError("");
    setPendingDelete(purchase);
  }

  // Delete चल रहा हो तो modal बंद होने से रोकता है।
  function cancelDelete() {
    if (!deleteBusy.current) {
      setPendingDelete(null);
    }
  }

  // पुष्टि के बाद purchase delete और stock reverse करता है।
  async function confirmDelete() {
    if (!pendingDelete || deleteBusy.current) return;

    deleteBusy.current = true;
    setDeleting(true);
    setActionError("");

    try {
      await deletePurchase(
        pendingDelete.id,
        currentUser
      );

      if (viewed?.id === pendingDelete.id) {
        setViewed(null);
      }

      setPendingDelete(null);
    } catch (err) {
      setActionError(err.message || "Delete failed.");
    } finally {
      deleteBusy.current = false;
      setDeleting(false);
    }
  }

  // Activity logs modal खोलता है।
  function openLogs() {
    setLogsOpen(true);
  }

  // Activity logs modal बंद करता है।
  function closeLogs() {
    setLogsOpen(false);
  }

  const dateError =
    filters.fromDate &&
    filters.toDate &&
    filters.fromDate > filters.toDate
      ? "From date must not be after To date."
      : "";

  return {
    loading,
    loadError,
    actionError,

    filters,
    dateError,

    currentPage,
    totalPages,
    start,
    currentPurchases,

    count: filtered.length,
    totals,

    viewed,
    pendingDelete,
    deleting,

    logsOpen,
    logs,
    logsLoading,
    logsError,

    changeFilter,
    today,
    clearFilters,
    changePage,

    view,
    closeView,
    print,

    requestDelete,
    cancelDelete,
    confirmDelete,

    openLogs,
    closeLogs,
  };
}