import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  addDoc,
} from "firebase/firestore";

import { db } from "../Services/firebase";

import {
  validatePurchase,
  parsePurchaseDate,
  planStock,
  purchaseDay,
  money,
} from "./purchaseUtils";

// Collection snapshot को document ID सहित rows में बदलता है।
function snapshotRows(snapshot) {
  return snapshot.docs.map((entry) => ({
    ...entry.data(),
    id: entry.id,
  }));
}

// Item master के live बदलाव सुनता है।
export function subscribeItems(onData, onError) {
  return onSnapshot(
    collection(db, "items"),
    (snapshot) => onData(snapshotRows(snapshot)),
    onError
  );
}

// Purchase list के live बदलाव सुनता है।
export function subscribePurchases(onData, onError) {
  return onSnapshot(
    collection(db, "purchases"),
    (snapshot) => onData(snapshotRows(snapshot)),
    onError
  );
}

// Purchase से संबंधित activity logs निकालकर latest पहले दिखाता है।
export function subscribePurchaseLogs(onData, onError) {
  return onSnapshot(
    collection(db, "logs"),
    (snapshot) => {
      const logs = snapshotRows(snapshot).filter(
        (log) =>
          log.referenceType === "Purchase" ||
          String(log.action || "").includes("PURCHASE") ||
          Boolean(log.purchaseNumber)
      );

      onData(
        logs.sort(
          (a, b) =>
            (b.timestamp?.seconds || 0) -
            (a.timestamp?.seconds || 0)
        )
      );
    },
    onError
  );
}

// Activity करने वाले user का नाम या email देता है।
function actor(user) {
  return user?.email || user?.name || "System User";
}

// कोई write करने से पहले सभी unique item documents पढ़ता है।
async function readItems(transaction, rows) {
  const records = new Map();

  const uniqueItemIds = new Set(
    rows.map((row) => row.itemId)
  );

  for (const itemId of uniqueItemIds) {
    if (!itemId) {
      throw new Error("Item ID is missing.");
    }

    const snapshot = await transaction.get(
      doc(db, "items", itemId)
    );

    if (!snapshot.exists()) {
      throw new Error(`Item not found: ${itemId}`);
    }

    records.set(itemId, snapshot.data());
  }

  return records;
}

// Purchase या reversal की stock transaction तैयार करता है।
// Reference में purchase number और date में purchase date रखता है।
function stockEntry(
  purchase,
  row,
  index,
  user,
  reversal = false
) {
  const sign = reversal ? -1 : 1;

  const purchaseDate =
    purchase.purchaseDate || purchase.createdAt;

  return {
    transactionType: reversal
      ? "Purchase Reversal"
      : "Purchase",

    type: reversal ? "OUT" : "IN",

    referenceType: "Purchase",
    referenceId: purchase.id,
    referenceNumber: purchase.purchaseNumber,

    purchaseNumber: purchase.purchaseNumber,
    purchaseDate,
    transactionDate: purchaseDate,

    itemId: row.itemId,
    itemName: row.itemName || "",
    lineNumber: index + 1,

    quantity: row.quantity,
    qty: sign * row.quantity,
    stockEffect: sign * row.quantity,
    balanceAfter: row.balanceAfter,

    rate: Number(row.rate || 0),
    amount: Number(row.amount || 0),

    supplierName: purchase.supplierName || "",
    invoiceNumber: purchase.invoiceNumber || "",

    performedBy: actor(user),
    createdAt: serverTimestamp(),
    isReversal: reversal,

    ...(reversal
      ? { reversedAt: serverTimestamp() }
      : {}),
  };
}

// नए form के लिए स्थायी document ID बनाता है।
// यह internal ID है; purchase number Save के समय बनेगा।
export function newPurchaseId() {
  return doc(collection(db, "purchases")).id;
}

// Purchase number, purchase data, stock और logs
// एक ही transaction में save करता है।
export async function savePurchase(
  form,
  user,
  purchaseId
) {
  const validated = validatePurchase(form);

  if (!purchaseId) {
    throw new Error(
      "Purchase draft ID is missing. Close and reopen the form."
    );
  }

  // चुनी हुई purchase date से year निकालता है।
  const selectedDate = parsePurchaseDate(
    validated.purchaseDate
  );

  const purchaseYear = selectedDate.getFullYear();

  const purchaseDate = Timestamp.fromDate(
    selectedDate
  );

  const purchaseRef = doc(
    db,
    "purchases",
    purchaseId
  );

  const trashRef = doc(
    db,
    "trash_purchases",
    purchaseId
  );

  // प्रत्येक वर्ष का अलग purchase counter रखता है।
  // उदाहरण: counters/purchase_2026
  const counterRef = doc(
    db,
    "counters",
    `purchase_${purchaseYear}`
  );

  return runTransaction(db, async (transaction) => {
    // ========================================
    // पहले सभी READ operations
    // ========================================

    const existing = await transaction.get(
      purchaseRef
    );

    // उसी draft का retry होने पर stock और counter दोबारा नहीं बढ़ाता।
    if (existing.exists()) {
      return {
        id: purchaseId,
        purchaseNumber:
          existing.data().purchaseNumber,
      };
    }

    const trashed = await transaction.get(
      trashRef
    );

    if (trashed.exists()) {
      throw new Error(
        "This purchase was already deleted. Open a new purchase."
      );
    }

    // इस वर्ष का आखिरी सफल purchase sequence पढ़ता है।
    const counterSnapshot = await transaction.get(
      counterRef
    );

    const lastNumber = counterSnapshot.exists()
      ? counterSnapshot.data().lastNumber
      : 0;

    // गलत counter को silently reset नहीं करता।
    if (
      !Number.isSafeInteger(lastNumber) ||
      lastNumber < 0
    ) {
      throw new Error(
        `Invalid counter: counters/purchase_${purchaseYear}. ` +
          "lastNumber must be a non-negative integer."
      );
    }

    // पाँच अंकों की numbering सीमा जांचता है।
    if (lastNumber >= 99999) {
      throw new Error(
        `Purchase numbering limit reached for ${purchaseYear}.`
      );
    }

    const nextNumber = lastNumber + 1;

    // उदाहरण: PUR-2026-00001
    const purchaseNumber =
      `PUR-${purchaseYear}-` +
      String(nextNumber).padStart(5, "0");

    // Writes शुरू करने से पहले item documents पढ़ता है।
    const records = await readItems(
      transaction,
      validated.items
    );

    // Duplicate item rows सहित stock calculate करता है।
    const { balances, movements } = planStock(
      validated.items,
      records
    );

    const purchase = {
      ...validated,

      purchaseNumber,
      purchaseYear,
      purchaseSequence: nextNumber,

      purchaseDate,

      // पुराने screens के लिए purchase date रखता है।
      createdAt: purchaseDate,

      // वास्तविक save time अलग field में रखता है।
      recordedAt: serverTimestamp(),

      performedBy: actor(user),

      items: movements.map(
        ({ balanceAfter, ...row }) => row
      ),
    };

    // ========================================
    // अब सभी WRITE operations
    // ========================================

    // Counter और purchase साथ में commit होंगे।
    transaction.set(
      counterRef,
      {
        year: purchaseYear,
        lastNumber: nextNumber,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // हर unique item का final stock एक बार update करता है।
    for (const [itemId, balance] of balances) {
      transaction.update(
        doc(db, "items", itemId),
        {
          [balance.field]: balance.value,
        }
      );
    }

    // प्रत्येक purchase row की stock entry save करता है।
    movements.forEach((row, index) => {
      const stockRef = doc(
        db,
        "stockTransactions",
        `${purchaseId}_purchase_${index}`
      );

      transaction.set(
        stockRef,
        stockEntry(
          {
            ...purchase,
            id: purchaseId,
          },
          row,
          index,
          user
        )
      );
    });

    // Purchase header और details save करता है।
    transaction.set(
      purchaseRef,
      purchase
    );

    // Purchase activity log भी उसी transaction में लिखता है।
    transaction.set(
      doc(db, "logs", `${purchaseId}_insert`),
      {
        action: "INSERT_PURCHASE",
        referenceType: "Purchase",
        purchaseId,

        purchaseNumber,

        title:
          `Added purchase "${purchaseNumber}" ` +
          `for "${validated.supplierName}"`,

        description: movements
          .map(
            (row) =>
              `${row.itemName}: ${row.quantity}`
          )
          .join(", "),

        supplierName: validated.supplierName,
        invoiceNumber: validated.invoiceNumber,
        grandTotal: validated.grandTotal,

        performedBy: actor(user),
        timestamp: serverTimestamp(),
      }
    );

    return {
      id: purchaseId,
      purchaseNumber,
    };
  });
}

// Purchase को trash में भेजता है और stock reverse करता है।
// Counter कम नहीं करता, ताकि deleted purchase number दोबारा न बने।
export async function deletePurchase(
  purchaseId,
  user
) {
  const purchaseRef = doc(
    db,
    "purchases",
    purchaseId
  );

  return runTransaction(db, async (transaction) => {
    // UI के पुराने data की जगह fresh database record पढ़ता है।
    const snapshot = await transaction.get(
      purchaseRef
    );

    if (!snapshot.exists()) {
      throw new Error(
        "Purchase is already deleted or no longer exists."
      );
    }

    const purchase = {
      ...snapshot.data(),
      id: snapshot.id,
    };

    const rows = purchase.items || [];

    const records = await readItems(
      transaction,
      rows
    );

    const { balances, movements } = planStock(
      rows,
      records,
      -1
    );

    // सभी reads के बाद stock update करता है।
    for (const [itemId, balance] of balances) {
      transaction.update(
        doc(db, "items", itemId),
        {
          [balance.field]: balance.value,
        }
      );
    }

    // प्रत्येक item की reversal entry बनाता है।
    movements.forEach((row, index) => {
      const stockRef = doc(
        collection(db, "stockTransactions")
      );

      transaction.set(
        stockRef,
        stockEntry(
          purchase,
          row,
          index,
          user,
          true
        )
      );
    });

    // Purchase की copy trash में रखता है।
    transaction.set(
      doc(db, "trash_purchases", purchaseId),
      {
        ...purchase,
        deletedAt: serverTimestamp(),
        deletedBy: actor(user),
      }
    );

    transaction.delete(purchaseRef);

    // Delete activity log लिखता है।
    transaction.set(
      doc(collection(db, "logs")),
      {
        action: "DELETE_PURCHASE",
        referenceType: "Purchase",
        purchaseId,

        title:
          `Moved purchase "${purchase.purchaseNumber}" ` +
          "to Trash",

        purchaseNumber:
          purchase.purchaseNumber || "",

        supplierName:
          purchase.supplierName || "",

        invoiceNumber:
          purchase.invoiceNumber || "",

        performedBy: actor(user),
        timestamp: serverTimestamp(),
      }
    );
  });
}

// Purchase details खोलने की activity save करता है।
export function logPurchaseView(purchase, user) {
  return addDoc(
    collection(db, "logs"),
    {
      action: "VIEW_PURCHASE",
      referenceType: "Purchase",
      purchaseId: purchase.id,

      title:
        `Viewed purchase "${purchase.purchaseNumber}"`,

      purchaseNumber:
        purchase.purchaseNumber || "",

      supplierName:
        purchase.supplierName || "",

      invoiceNumber:
        purchase.invoiceNumber || "",

      performedBy: actor(user),
      timestamp: serverTimestamp(),
    }
  );
}

// Print HTML में user input को सुरक्षित text में बदलता है।
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}

// Purchase invoice की print window खोलता है।
export function printPurchase(purchase) {
  const printWindow = window.open(
    "",
    "_blank",
    "width=900,height=700"
  );

  if (!printWindow) {
    throw new Error(
      "Allow popups to print the purchase bill."
    );
  }

  printWindow.opener = null;

  const itemRows = (purchase.items || [])
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.itemName)}</td>
          <td>${escapeHtml(row.quantity)}</td>
          <td>${escapeHtml(money(row.rate))}</td>
          <td>${escapeHtml(money(row.amount))}</td>
        </tr>
      `
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />

        <title>
          Purchase Invoice -
          ${escapeHtml(purchase.purchaseNumber)}
        </title>

        <style>
          body {
            font: 14px Arial;
            padding: 24px;
          }

          h2 {
            text-align: center;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          td, th {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }

          .total {
            text-align: right;
            font-weight: bold;
          }
        </style>
      </head>

      <body>
        <h2>Purchase Invoice</h2>

        <p>
          <strong>Purchase No:</strong>
          ${escapeHtml(purchase.purchaseNumber)}
        </p>

        <p>
          <strong>Purchase Date:</strong>
          ${escapeHtml(purchaseDay(purchase))}
        </p>

        <p>
          <strong>Supplier:</strong>
          ${escapeHtml(purchase.supplierName)}
        </p>

        <p>
          <strong>Invoice No:</strong>
          ${escapeHtml(purchase.invoiceNumber)}
        </p>

        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <p class="total">
          Grand Total:
          ${escapeHtml(money(purchase.grandTotal))}
        </p>
      </body>
    </html>
  `);

  printWindow.document.close();

  // Printing पूरी होने पर print window बंद करता है।
  printWindow.onafterprint = () => {
    printWindow.close();
  };

  printWindow.focus();

  // Print content लिखने के बाद print dialog खोलता है।
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.print();
    }
  }, 300);
}