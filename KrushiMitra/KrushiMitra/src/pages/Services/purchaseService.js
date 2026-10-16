import { db } from './firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

export async function savePurchaseTransaction(purchaseData) {
  try {
    await runTransaction(db, async (transaction) => {
      const newPurchaseRef = doc(collection(db, 'purchases'));
      
      let subtotal = 0;
      const processedItems = purchaseData.items.map(item => {
        const amount = item.quantity * item.rate;
        subtotal += amount;
        return { ...item, amount };
      });

      const grandTotal = subtotal + (purchaseData.tax || 0) - (purchaseData.discount || 0);

      // Update stock for each purchased item
      for (const item of purchaseData.items) {
        const itemRef = doc(db, 'items', item.itemId);
        const itemSnap = await transaction.get(itemRef);

        if (itemSnap.exists()) {
          const currentStock = itemSnap.data().currentStock || 0;
          const newStock = currentStock + Number(item.quantity);

          // Update Stock
          transaction.update(itemRef, { 
            currentStock: newStock,
            purchaseRate: item.rate 
          });

          // Log Transaction
          const stockTxRef = doc(collection(db, 'stockTransactions'));
          transaction.set(stockTxRef, {
            date: serverTimestamp(),
            itemName: item.itemName,
            transactionType: 'Purchase In',
            quantityIn: Number(item.quantity),
            quantityOut: 0,
            balanceAfter: newStock,
            referenceNumber: purchaseData.invoiceNumber,
            notes: `Purchased from ${purchaseData.supplierName}`
          });
        }
      }

      // Save Purchase Entry
      transaction.set(newPurchaseRef, {
        purchaseNumber: purchaseData.purchaseNumber,
        supplierName: purchaseData.supplierName,
        invoiceNumber: purchaseData.invoiceNumber,
        items: processedItems,
        subtotal,
        tax: purchaseData.tax || 0,
        discount: purchaseData.discount || 0,
        grandTotal,
        createdAt: serverTimestamp()
      });
    });

    return { success: true, message: 'Purchase saved and inventory updated!' };
  } catch (error) {
    console.error('Error saving purchase: ', error);
    return { success: false, error: error.message };
  }
}