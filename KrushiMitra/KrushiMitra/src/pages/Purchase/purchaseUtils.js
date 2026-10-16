// Date/Timestamp को JavaScript Date में बदलता है।
export function toDate(value) {
  if (!value) return null;

  const result = value.toDate
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(result.getTime()) ? null : result;
}

// स्थानीय तारीख बनाता है; UTC के कारण दिन बदलने से रोकता है।
export function dateKey(value = new Date()) {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = toDate(value);

  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// चुनी हुई purchase date को validate करता है।
export function parsePurchaseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new Error("Select a valid purchase date.");
  }

  const date = new Date(`${value}T00:00:00`);

  if (!toDate(date) || dateKey(date) !== value) {
    throw new Error("Invalid purchase date.");
  }

  return date;
}

// रकम को दो दशमलव तक round करता है।
export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// रकम को भारतीय रुपये के format में दिखाता है।
export function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
}

// तारीख और समय को पढ़ने योग्य format में दिखाता है।
export function formatDateTime(value) {
  return toDate(value)?.toLocaleString("en-IN") || "N/A";
}

// Purchase की तारीख देता है; पुराने records में createdAt उपयोग करता है।
export function purchaseDay(purchase) {
  return dateKey(purchase.purchaseDate || purchase.createdAt);
}

let rowSequence = 0;

// नई material row के default values बनाता है।
export function emptyRow() {
  return {
    rowKey: `row-${Date.now()}-${++rowSequence}`,
    itemId: "",
    quantity: 1,
    rate: 0,
    amount: 0,
  };
}

// Header और item rows validate करके amount फिर से calculate करता है।
export function validatePurchase(form) {
  const supplierName = String(form.supplierName || "").trim();
  const invoiceNumber = String(form.invoiceNumber || "").trim();

  if (!supplierName || !invoiceNumber) {
    throw new Error(
      "Supplier name and invoice number are required."
    );
  }

  parsePurchaseDate(form.purchaseDate);

  if (!Array.isArray(form.items) || !form.items.length) {
    throw new Error("At least one item is required.");
  }

  const items = form.items.map((row, index) => {
    const quantity = Number(row.quantity);
    const rate = Number(row.rate);

    if (
      !row.itemId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        `Row ${index + 1}: Select an item and enter a positive quantity.`
      );
    }

    if (
      row.rate === "" ||
      !Number.isFinite(rate) ||
      rate < 0
    ) {
      throw new Error(`Row ${index + 1}: Invalid rate.`);
    }

    const amount = roundMoney(quantity * rate);

    if (!Number.isFinite(amount)) {
      throw new Error(`Row ${index + 1}: Amount is too large.`);
    }

    return {
      itemId: row.itemId,
      quantity,
      rate,
      amount,
    };
  });

  const grandTotal = roundMoney(
    items.reduce((sum, row) => sum + row.amount, 0)
  );

  if (!Number.isFinite(grandTotal)) {
    throw new Error("Total amount is too large.");
  }

  return {
    supplierName,
    invoiceNumber,
    purchaseDate: form.purchaseDate,
    items,
    grandTotal,
  };
}

// सभी rows का stock calculate करता है।
// एक ही item कई rows में हो तो उसकी quantity क्रम से जोड़ता/घटाता है।
export function planStock(rows, records, direction = 1) {
  const balances = new Map();

  const movements = rows.map((row, index) => {
    const data = records.get(row.itemId);

    if (!data) {
      throw new Error(
        `Item not found: ${row.itemId || `row ${index + 1}`}`
      );
    }

    const stockField =
      data.currentStock != null ? "currentStock" : "quantity";

    const before = balances.has(row.itemId)
      ? balances.get(row.itemId).value
      : Number(data[stockField] ?? 0);

    const quantity = Number(row.quantity);

    if (
      !Number.isFinite(before) ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new Error(`Invalid stock/quantity: ${row.itemId}`);
    }

    const balanceAfter = Number(
      (before + direction * quantity).toFixed(9)
    );

    if (!Number.isFinite(balanceAfter)) {
      throw new Error("Stock value is too large.");
    }

    if (balanceAfter < 0) {
      throw new Error(
        `Cannot delete: stock for ${
          data.name || data.itemName || row.itemId
        } is already used.`
      );
    }

    balances.set(row.itemId, {
      field: stockField,
      value: balanceAfter,
    });

    return {
      ...row,
      quantity,
      itemName:
        data.name || data.itemName || row.itemName || "Item",
      balanceAfter,
    };
  });

  return {
    balances,
    movements,
  };
}

// Supplier, invoice और date filters लगाकर latest purchase पहले रखता है।
export function filterPurchases(purchases, filters) {
  const supplier = filters.supplier.trim().toLowerCase();
  const invoice = filters.invoice.trim().toLowerCase();

  return purchases
    .filter((purchase) => {
      const day = purchaseDay(purchase);

      return (
        String(purchase.supplierName || "")
          .toLowerCase()
          .includes(supplier) &&
        String(purchase.invoiceNumber || "")
          .toLowerCase()
          .includes(invoice) &&
        (!filters.fromDate ||
          (day && day >= filters.fromDate)) &&
        (!filters.toDate ||
          (day && day <= filters.toDate))
      );
    })
    .sort(
      (a, b) =>
        purchaseDay(b).localeCompare(purchaseDay(a)) ||
        (toDate(b.recordedAt || b.createdAt)?.getTime() || 0) -
          (toDate(a.recordedAt || a.createdAt)?.getTime() || 0) ||
        String(b.id).localeCompare(String(a.id))
    );
}