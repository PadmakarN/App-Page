import { db } from './firebase';
import { 
  collection, addDoc, runTransaction, serverTimestamp, getDocs, query, where 
} from 'firebase/firestore';

// Save Sale with Automatic Stock Deduction via Transaction
export async function saveSaleTransaction(saleData) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Reference to sales collection
      const newSaleRef = doc(collection(db, 'sales'));
      
      // 2. Calculate totals and process items
      let subtotal = 0;
      const processedItems = saleData.items.map(item => {
        const amount = item.quantity * item.rate;
        subtotal += amount;
        return { ...item, amount };
      });

      const grandTotal = subtotal - (saleData.discount || 0);

      // 3. Fetch material mappings for each service and prepare stock deductions
      for (const item of saleData.items) {
        // Find mappings for this print service
        const mappingQuery = query(
          collection(db, 'materialMappings'), 
          where('serviceId', '==', item.serviceId)
        );
        const mappingSnap = await getDocs(mappingQuery);

        // For each mapped raw material, deduct stock
        for (const mappingDoc of mappingSnap.docs) {
          const mapping = mappingDoc.data();
          const totalConsumption = mapping.consumptionQty * item.quantity;
          
          const itemRef = doc(db, 'items', mapping.itemId);
          const itemSnap = await transaction.get(itemRef);
          
          if (itemSnap.exists()) {
            const currentStock = itemSnap.data().currentStock || 0;
            const newStock = currentStock - totalConsumption;
            
            // Update item stock
            transaction.update(itemRef, { currentStock: newStock });

            // Record stock transaction log
            const stockTxRef = doc(collection(db, 'stockTransactions'));
            transaction.set(stockTxRef, {
              date: serverTimestamp(),
              itemName: mapping.itemName,
              transactionType: 'Sales Out',
              quantityIn: 0,
              quantityOut: totalConsumption,
              balanceAfter: newStock,
              referenceNumber: saleData.billNumber,
              notes: `Sold via Bill #${saleData.billNumber}`
            });
          }
        }
      }

      // 4. Save Sale Record
      transaction.set(newSaleRef, {
        billNumber: saleData.billNumber,
        customerName: saleData.customerName,
        mobileNumber: saleData.mobileNumber,
        items: processedItems,
        subtotal,
        discount: saleData.discount || 0,
        grandTotal,
        paymentMethod: saleData.paymentMethod || 'Cash',
        createdAt: serverTimestamp()
      });
    });

    return { success: true, message: 'Sale saved and stock updated successfully!' };
  } catch (error) {
    console.error('Error saving sale transaction: ', error);
    return { success: false, error: error.message };
  }
}