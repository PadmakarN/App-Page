import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  newPurchaseId,
  savePurchase,
  subscribeItems,
} from "./purchaseService";

import {
  dateKey,
  emptyRow,
  roundMoney,
} from "./purchaseUtils";

// खाली purchase form तैयार करता है।
function initialForm() {
  return {
    supplierName: "",
    invoiceNumber: "",
    purchaseDate: dateKey(),
    items: [emptyRow()],
  };
}

// Form inputs, item rows, amount और save की business logic संभालता है।
export default function usePurchaseForm(currentUser) {
  const [form, setForm] = useState(initialForm);

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const busy = useRef(false);
  const draftId = useRef(null);

  // Item master का live listener लगाता है और unmount पर बंद करता है।
  useEffect(() => {
    return subscribeItems(
      (rows) => {
        setItems(rows);
        setItemsError("");
        setItemsLoading(false);
      },
      (err) => {
        setItemsError(err.message);
        setItemsLoading(false);
      }
    );
  }, []);

  // नया purchase form और उसकी स्थायी draft ID बनाता है।
  function open() {
    if (busy.current) return;

    setForm(initialForm());
    draftId.current = newPurchaseId();

    setError("");
    setNotice("");
    setIsOpen(true);
  }

  // Save चलते समय form बंद नहीं होने देता।
  function close() {
    if (!busy.current) {
      setIsOpen(false);
    }
  }

  // Supplier, invoice या purchase date बदलता है।
  function changeHeader(name, value) {
    if (busy.current) return;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // चुनी हुई row बदलता है और amount फिर calculate करता है।
  function changeRow(rowKey, patch) {
    if (busy.current) return;

    setForm((previous) => ({
      ...previous,

      items: previous.items.map((row) => {
        if (row.rowKey !== rowKey) return row;

        const updated = {
          ...row,
          ...patch,
        };

        return {
          ...updated,

          amount: roundMoney(
            Number(updated.quantity || 0) *
              Number(updated.rate || 0)
          ),
        };
      }),
    }));
  }

  // Material चुनने पर item master से purchase rate भरता है।
  function changeItem(rowKey, itemId) {
    const item = items.find(
      (entry) => entry.id === itemId
    );

    changeRow(rowKey, {
      itemId,
      rate: Number(
        item?.purchaseRate ?? item?.price ?? 0
      ),
    });
  }

  // एक नई material row जोड़ता है।
  function addRow() {
    if (busy.current) return;

    setForm((previous) => ({
      ...previous,
      items: [...previous.items, emptyRow()],
    }));
  }

  // चुनी हुई material row हटाता है; कम से कम एक row रखता है।
  function removeRow(rowKey) {
    if (busy.current) return;

    if (form.items.length === 1) {
      setError("At least one item is required.");
      return;
    }

    setForm((previous) => ({
      ...previous,
      items: previous.items.filter(
        (row) => row.rowKey !== rowKey
      ),
    }));
  }

  // Double-click रोककर purchase और stock save करता है।
  async function submit(event) {
    event.preventDefault();

    if (busy.current) return;

    busy.current = true;
    setSaving(true);
    setError("");

    try {
      const result = await savePurchase(
        form,
        currentUser,
        draftId.current
      );

      setNotice(
        `Purchase ${result.purchaseNumber} saved. ` +
          "Stock updated successfully."
      );

      setIsOpen(false);
    } catch (err) {
      setError(err.message || "Purchase save failed.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  // सभी rows की रकम जोड़कर grand total निकालता है।
  const grandTotal = roundMoney(
    form.items.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    )
  );

  return {
    form,
    items,
    itemsLoading,
    itemsError,

    isOpen,
    saving,
    error,
    notice,
    grandTotal,

    open,
    close,
    changeHeader,
    changeRow,
    changeItem,
    addRow,
    removeRow,
    submit,
  };
}