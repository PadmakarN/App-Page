
import { useState, useEffect } from 'react';
import { db } from '../Services/firebase';

import {
  collection,
  getDocs,
  doc,
  runTransaction,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

export default function SalesEntry() {
  const [services, setServices] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // SHOP / PRINT SETTINGS
  // ==========================================
  const [shopSettings, setShopSettings] = useState({
    shopName: 'Print Studio',
    address: '',
    contactName1: '',
    mobileNumber1: '',
    contactName2: '',
    mobileNumber2: '',
    email: '',
    gstNumber: '',
    thankYouMessage: 'Thank You! Visit Again.'
  });

  // ==========================================
  // MODAL STATES
  // ==========================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const [printSale, setPrintSale] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleToDelete, setSaleToDelete] = useState(null);

  // ==========================================
  // DROPDOWN
  // ==========================================
  const [activeDropdown, setActiveDropdown] = useState(null);

  // ==========================================
  // TOAST
  // ==========================================
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  // ==========================================
  // FORM STATES
  // ==========================================
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [billItems, setBillItems] = useState([
    {
      serviceId: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }
  ]);

  const [discount, setDiscount] = useState(0);

  // ==========================================
  // SEARCH STATES
  // ==========================================
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchBillNo, setSearchBillNo] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ==========================================
  // PAGINATION
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // ==========================================
  // GET CURRENT USER
  // ==========================================
  const getPerformedBy = () => {
    return (
      localStorage.getItem('userName') ||
      localStorage.getItem('username') ||
      localStorage.getItem('name') ||
      localStorage.getItem('userEmail') ||
      'Current User'
    );
  };

  // ==========================================
  // TOAST
  // ==========================================
  const showToast = (message, type = 'success') => {
    setToast({
      show: true,
      message,
      type
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: '',
        type: 'success'
      });
    }, 4000);
  };

  // ==========================================
  // DATE FORMAT
  // ==========================================
  const formatDateTime = (timestamp) => {
    if (!timestamp?.toDate) return 'Just now';

    return timestamp.toDate().toLocaleString('en-IN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // ==========================================
  // BILL DATE
  // ==========================================
  const formatBillDate = (timestamp) => {
    if (!timestamp?.toDate) {
      return new Date().toLocaleDateString('en-IN');
    }

    return timestamp.toDate().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // ==========================================
  // ESCAPE HTML
  // ==========================================
  const escapeHtml = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // ==========================================
  // MOBILE NUMBERS
  // ==========================================
  // IMPORTANT:
  // No spaces around /
  // Example:
  // Mobile: 0045009409/0065022283
  // ==========================================
  const getMobileNumbers = () => {
    return [
      shopSettings.mobileNumber1,
      shopSettings.mobileNumber2
    ]
      .filter(
        (number) =>
          number &&
          String(number).trim()
      )
      .map((number) =>
        String(number).trim()
      )
      .join('/');
  };

  // ==========================================
  // CLOSE DROPDOWN OUTSIDE CLICK
  // ==========================================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener(
      'click',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'click',
        handleClickOutside
      );
    };
  }, []);

  // ==========================================
  // FETCH SERVICES + MAPPINGS + SHOP SETTINGS
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Sales now consume stock items directly.
        // Existing UI/state names are intentionally kept unchanged.
        const itemsSnap = await getDocs(
          collection(db, 'items')
        );

        setServices(
          itemsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }))
        );

        // Material mapping is no longer used for stock deduction.
        setMappings([]);
      } catch (error) {
        console.error(
          'Error fetching data:',
          error
        );
      }
    };

    fetchData();

    // ==========================================
    // SHOP SETTINGS REAL-TIME
    // ==========================================
    const settingsRef = doc(
      db,
      'settings',
      'shopSettings'
    );

    const unsubSettings = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setShopSettings({
            shopName:
              data.shopName ||
              data.name ||
              data.businessName ||
              'Print Studio',

            address:
              data.address ||
              data.shopAddress ||
              data.businessAddress ||
              '',

            contactName1:
              data.contactName1 ||
              '',

            mobileNumber1:
              data.mobileNumber1 ||
              '',

            contactName2:
              data.contactName2 ||
              '',

            mobileNumber2:
              data.mobileNumber2 ||
              '',

            email:
              data.email ||
              data.emailAddress ||
              '',

            gstNumber:
              data.gstNumber ||
              data.gstNo ||
              data.GSTNumber ||
              '',

            thankYouMessage:
              data.thankYouMessage ||
              data.thankYou ||
              'Thank You! Visit Again.'
          });
        }
      },
      (error) => {
        console.error(
          'Error fetching shop settings:',
          error
        );
      }
    );

    // ==========================================
    // SALES
    // ==========================================
    const unsubSales = onSnapshot(
      collection(db, 'sales'),
      (snap) => {
        const salesData = snap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }));

        setSalesList(salesData);
        setLoading(false);
      },
      (error) => {
        console.error(
          'Error fetching sales:',
          error
        );

        setLoading(false);
      }
    );

    // ==========================================
    // ACTIVITY LOGS
    // ==========================================
    const unsubLogs = onSnapshot(
      collection(db, 'salesActivityLogs'),
      (snap) => {
        const logs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }));

        logs.sort((a, b) => {
          const aTime =
            a.createdAt?.toDate?.()?.getTime() || 0;

          const bTime =
            b.createdAt?.toDate?.()?.getTime() || 0;

          return bTime - aTime;
        });

        setActivityLogs(logs);
      },
      (error) => {
        console.error(
          'Error fetching activity logs:',
          error
        );
      }
    );

    return () => {
      unsubSales();
      unsubLogs();
      unsubSettings();
    };
  }, []);

  // ==========================================
  // TODAY FILTER
  // ==========================================
  const handleTodayFilter = () => {
    const todayStr = new Date()
      .toISOString()
      .split('T')[0];

    setFromDate(todayStr);
    setToDate(todayStr);
    setCurrentPage(1);
  };

  // ==========================================
  // OPEN NEW SALE
  // ==========================================
  const handleOpenModal = () => {
    setCustomerName('');
    setMobileNumber('');
    setPaymentMethod('Cash');

    setBillItems([
      {
        serviceId: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ]);

    setDiscount(0);
    setIsModalOpen(true);
  };

  // ==========================================
  // VIEW SALE
  // ==========================================
  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setIsViewModalOpen(true);
    setActiveDropdown(null);
  };

  // ==========================================
  // SERVICE CHANGE
  // ==========================================
  const handleServiceChange = (
    index,
    serviceId
  ) => {
    const service = services.find(
      (s) => s.id === serviceId
    );

    const newItems = [...billItems];

    newItems[index].serviceId = serviceId;

    newItems[index].rate = Number(
      service?.sellingRate || 0
    );

    newItems[index].amount =
      Number(newItems[index].quantity) *
      Number(newItems[index].rate);

    setBillItems(newItems);
  };

  // ==========================================
  // QUANTITY CHANGE
  // ==========================================
  const handleQtyChange = (
    index,
    qty
  ) => {
    const newItems = [...billItems];

    const quantity = Math.max(
      1,
      Number(qty) || 1
    );

    newItems[index].quantity = quantity;

    newItems[index].amount =
      quantity *
      Number(newItems[index].rate || 0);

    setBillItems(newItems);
  };

  // ==========================================
  // ADD ITEM
  // ==========================================
  const addItemRow = () => {
    setBillItems([
      ...billItems,
      {
        serviceId: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ]);
  };

  // ==========================================
  // REMOVE ITEM
  // ==========================================
  const removeItemRow = (index) => {
    if (billItems.length === 1) {
      showToast(
        'At least one item is required in the bill.',
        'error'
      );
      return;
    }

    setBillItems(
      billItems.filter(
        (_, i) => i !== index
      )
    );
  };

  // ==========================================
  // CALCULATIONS
  // ==========================================
  const subtotal = billItems.reduce(
    (acc, curr) =>
      acc + Number(curr.amount || 0),
    0
  );

  const safeDiscount = Math.max(
    0,
    Number(discount) || 0
  );

  const grandTotal = Math.max(
    0,
    subtotal - safeDiscount
  );

  // ==========================================
  // ACTIVITY LOG
  // ==========================================
  const createActivityLog = (
    transaction,
    {
      action,
      saleId,
      billNumber,
      customerName,
      mobileNumber = '',
      changes = [],
      description = ''
    }
  ) => {
    const logRef = doc(
      collection(
        db,
        'salesActivityLogs'
      )
    );

    transaction.set(logRef, {
      action,
      module: 'Sales',
      saleId,
      billNumber,
      customerName,
      mobileNumber,
      performedBy: getPerformedBy(),
      description,
      changes,
      createdAt: serverTimestamp()
    });
  };

  // ==========================================
  // GET CHANGED FIELDS
  // ==========================================
  const getChangedFields = (
    oldSale,
    newSale
  ) => {
    const changes = [];

    const fields = [
      {
        key: 'customerName',
        label: 'Customer Name'
      },
      {
        key: 'mobileNumber',
        label: 'Mobile Number'
      },
      {
        key: 'paymentMethod',
        label: 'Payment Method'
      },
      {
        key: 'discount',
        label: 'Discount'
      },
      {
        key: 'subtotal',
        label: 'Subtotal'
      },
      {
        key: 'grandTotal',
        label: 'Total'
      }
    ];

    fields.forEach((field) => {
      const oldValue =
        oldSale?.[field.key] ?? '';

      const newValue =
        newSale?.[field.key] ?? '';

      if (
        String(oldValue) !==
        String(newValue)
      ) {
        changes.push({
          field: field.label,
          oldValue: String(oldValue),
          newValue: String(newValue)
        });
      }
    });

    const oldItems = JSON.stringify(
      oldSale?.items || []
    );

    const newItems = JSON.stringify(
      newSale?.items || []
    );

    if (oldItems !== newItems) {
      changes.push({
        field: 'Purchased Items',
        oldValue: 'Previous items',
        newValue: 'Items updated'
      });
    }

    return changes;
  };

  // ==========================================
  // SAVE SALE
  // ==========================================
  const handleSaveSale = async (e) => {
    e.preventDefault();

    const invalidItem =
      billItems.find(
        (item) => !item.serviceId
      );

    if (invalidItem) {
      showToast(
        'Please select a service for all items.',
        'error'
      );
      return;
    }

    const invalidQty =
      billItems.find(
        (item) =>
          Number(item.quantity || 0) <= 0
      );

    if (invalidQty) {
      showToast(
        'Quantity must be greater than zero.',
        'error'
      );
      return;
    }

    if (safeDiscount > subtotal) {
      showToast(
        'Discount cannot be greater than subtotal.',
        'error'
      );
      return;
    }

    try {
      const todayStr =
        new Date()
          .toISOString()
          .split('T')[0];

      const billNo =
        'BILL-' +
        Date.now()
          .toString()
          .slice(-6);

      await runTransaction(
        db,
        async (transaction) => {
          // ==========================================
          // DIRECT ITEM STOCK OUT
          // Sales = Stock - Qty
          // ==========================================
          for (const item of billItems) {
            const itemId = item.serviceId;
            const deductQty =
              Number(item.quantity || 0);

            const itemRef = doc(
              db,
              'items',
              itemId
            );

            const itemDoc =
              await transaction.get(
                itemRef
              );

            if (!itemDoc.exists()) {
              throw new Error(
                'Selected stock item not found!'
              );
            }

            const itemData =
              itemDoc.data();

            const currentStock =
              Number(
                itemData.currentStock ??
                  itemData.quantity ??
                  0
              );

            const stockField =
              itemData.currentStock !==
              undefined
                ? 'currentStock'
                : 'quantity';

            const itemName =
              itemData.name ||
              itemData.itemName ||
              'Unknown Item';

            if (
              currentStock <
              deductQty
            ) {
              throw new Error(
                `Insufficient stock for ${itemName}. Required: ${deductQty}, Available: ${currentStock}`
              );
            }

            const newBalance =
              currentStock -
              deductQty;

            transaction.update(
              itemRef,
              {
                [stockField]:
                  newBalance
              }
            );

            // ==========================================
            // STOCK TRANSACTION
            // Sales = OUT / negative stock effect
            // ==========================================
            const stockTxRef =
              doc(
                collection(
                  db,
                  'stockTransactions'
                )
              );

            transaction.set(
              stockTxRef,
              {
                date: todayStr,
                itemId,
                itemName,
                transactionType:
                  'Sales',
                type: 'OUT',
                referenceType:
                  'Sales',
                referenceId:
                  billNo,
                referenceNumber:
                  billNo,
                quantityIn: 0,
                quantityOut:
                  deductQty,
                quantity:
                  deductQty,
                qty:
                  -deductQty,
                stockEffect:
                  -deductQty,
                balanceAfter:
                  newBalance,
                referenceNo:
                  billNo,
                customerName:
                  customerName.trim() ||
                  'Walk-in',
                notes:
                  `Sale to ${
                    customerName.trim() ||
                    'Walk-in'
                  }`,
                performedBy:
                  getPerformedBy(),
                createdAt:
                  serverTimestamp(),
                isReversal: false
              }
            );
          }

          // ==========================================
          // SALE ITEMS
          // ==========================================
          const saleItems =
            billItems.map(
              (item) => {
                const stockItem =
                  services.find(
                    (s) =>
                      s.id ===
                      item.serviceId
                  );

                return {
                  ...item,
                  serviceName:
                    stockItem?.name ||
                    stockItem?.itemName ||
                    ''
                };
              }
            );

          // ==========================================
          // CREATE SALE
          // ==========================================
          const saleRef =
            doc(
              collection(
                db,
                'sales'
              )
            );

          const finalCustomerName =
            customerName.trim() ||
            'Walk-in';

          const finalMobileNumber =
            mobileNumber.trim() ||
            'N/A';

          const saleData = {
            billNumber:
              billNo,
            customerName:
              finalCustomerName,
            mobileNumber:
              finalMobileNumber,
            paymentMethod,
            items:
              saleItems,
            subtotal,
            discount:
              safeDiscount,
            grandTotal,
            createdAt:
              serverTimestamp()
          };

          transaction.set(
            saleRef,
            saleData
          );

          // ==========================================
          // INSERT LOG
          // ==========================================
          createActivityLog(
            transaction,
            {
              action: 'INSERT',

              saleId:
                saleRef.id,

              billNumber:
                billNo,

              customerName:
                finalCustomerName,

              mobileNumber:
                finalMobileNumber,

              description:
                `Added new sale bill "${billNo}" for customer "${finalCustomerName}"`,

              changes: [
                {
                  field:
                    'Customer Name',
                  oldValue: '',
                  newValue:
                    finalCustomerName
                },
                {
                  field:
                    'Mobile Number',
                  oldValue: '',
                  newValue:
                    finalMobileNumber
                },
                {
                  field:
                    'Payment Method',
                  oldValue: '',
                  newValue:
                    paymentMethod
                },
                {
                  field:
                    'Total',
                  oldValue: '',
                  newValue:
                    `₹${grandTotal}`
                }
              ]
            }
          );
        }
      );

      setIsModalOpen(false);

      showToast(
        'Sale saved successfully!',
        'success'
      );
    } catch (error) {
      console.error(
        'Sale transaction error:',
        error
      );

      showToast(
        'Transaction failed: ' +
          error.message,
        'error'
      );
    }
  };

  // ==========================================
  // UPDATE SALE
  // ==========================================
  const updateSaleWithLog = async (
    saleId,
    updatedData
  ) => {
    try {
      await runTransaction(
        db,
        async (transaction) => {
          const saleRef =
            doc(
              db,
              'sales',
              saleId
            );

          const saleDoc =
            await transaction.get(
              saleRef
            );

          if (!saleDoc.exists()) {
            throw new Error(
              'Sale record not found.'
            );
          }

          const oldSale =
            saleDoc.data();

          const changes =
            getChangedFields(
              oldSale,
              updatedData
            );

          transaction.update(
            saleRef,
            updatedData
          );

          createActivityLog(
            transaction,
            {
              action: 'UPDATE',

              saleId,

              billNumber:
                oldSale.billNumber,

              customerName:
                updatedData.customerName ||
                oldSale.customerName,

              mobileNumber:
                updatedData.mobileNumber ||
                oldSale.mobileNumber,

              description:
                `Updated sale bill "${oldSale.billNumber}"`,

              changes
            }
          );
        }
      );

      showToast(
        'Sale updated successfully!',
        'success'
      );
    } catch (error) {
      console.error(
        'Update sale error:',
        error
      );

      showToast(
        'Update failed: ' +
          error.message,
        'error'
      );
    }
  };

  // ==========================================
  // DELETE
  // ==========================================
  const handleDeleteSale = (sale) => {
    setActiveDropdown(null);
    setSaleToDelete(sale);
    setIsDeleteModalOpen(true);
  };

  // ==========================================
  // CONFIRM DELETE
  // ==========================================
  const confirmDeleteSale =
    async () => {
      if (!saleToDelete) return;

      try {
        await runTransaction(
          db,
          async (transaction) => {
            const saleRef =
              doc(
                db,
                'sales',
                saleToDelete.id
              );

            const trashSaleRef =
              doc(
                db,
                'trash_sales',
                saleToDelete.id
              );

            const saleDoc =
              await transaction.get(
                saleRef
              );

            if (!saleDoc.exists()) {
              throw new Error(
                'Sale record not found.'
              );
            }

            const saleData =
              saleDoc.data();

            // ==========================================
            // REVERSE SALES STOCK
            // Deleted Sale = Stock + Qty
            // ==========================================
            for (
              const saleItem of
                saleData.items || []
            ) {
              const itemId =
                saleItem.serviceId;

              const restoreQty =
                Number(
                  saleItem.quantity || 0
                );

              if (!itemId || restoreQty <= 0) {
                continue;
              }

              const itemRef = doc(
                db,
                'items',
                itemId
              );

              const itemDoc =
                await transaction.get(
                  itemRef
                );

              if (!itemDoc.exists()) {
                throw new Error(
                  `Stock item not found while deleting sale: ${itemId}`
                );
              }

              const itemData =
                itemDoc.data();

              const currentStock =
                Number(
                  itemData.currentStock ??
                    itemData.quantity ??
                    0
                );

              const stockField =
                itemData.currentStock !==
                undefined
                  ? 'currentStock'
                  : 'quantity';

              const itemName =
                itemData.name ||
                itemData.itemName ||
                saleItem.serviceName ||
                'Unknown Item';

              const newBalance =
                currentStock +
                restoreQty;

              transaction.update(
                itemRef,
                {
                  [stockField]:
                    newBalance
                }
              );

              // ==========================================
              // STOCK TRANSACTION REVERSAL
              // Deleted Sale = IN / positive stock effect
              // ==========================================
              const stockTxRef =
                doc(
                  collection(
                    db,
                    'stockTransactions'
                  )
                );

              transaction.set(
                stockTxRef,
                {
                  date:
                    new Date()
                      .toISOString()
                      .split('T')[0],
                  itemId,
                  itemName,
                  transactionType:
                    'Sales Reversal',
                  type: 'IN',
                  referenceType:
                    'Sales',
                  referenceId:
                    saleToDelete.id,
                  referenceNumber:
                    saleData.billNumber,
                  quantityIn:
                    restoreQty,
                  quantityOut: 0,
                  quantity:
                    restoreQty,
                  qty:
                    restoreQty,
                  stockEffect:
                    restoreQty,
                  balanceAfter:
                    newBalance,
                  referenceNo:
                    saleData.billNumber,
                  customerName:
                    saleData.customerName ||
                    'Walk-in',
                  notes:
                    `Reversal of deleted sale ${saleData.billNumber}`,
                  performedBy:
                    getPerformedBy(),
                  createdAt:
                    serverTimestamp(),
                  isReversal: true
                }
              );
            }

            transaction.set(
              trashSaleRef,
              {
                ...saleData,
                originalId:
                  saleToDelete.id,
                deletedAt:
                  serverTimestamp(),
                deletedBy:
                  getPerformedBy(),
                deletedReason:
                  'Deleted from Sales History'
              }
            );

            createActivityLog(
              transaction,
              {
                action: 'DELETE',

                saleId:
                  saleToDelete.id,

                billNumber:
                  saleData.billNumber,

                customerName:
                  saleData.customerName,

                mobileNumber:
                  saleData.mobileNumber,

                description:
                  `Deleted sale bill "${saleData.billNumber}" for customer "${saleData.customerName}"`,

                changes: [
                  {
                    field:
                      'Bill Status',
                    oldValue:
                      'Active',
                    newValue:
                      'Moved to Restore / Trash'
                  },
                  {
                    field:
                      'Grand Total',
                    oldValue:
                      `₹${
                        saleData.grandTotal ||
                        0
                      }`,
                    newValue:
                      'Deleted'
                  }
                ]
              }
            );

            transaction.delete(
              saleRef
            );
          }
        );

        setIsDeleteModalOpen(
          false
        );

        setSaleToDelete(null);

        showToast(
          'Bill moved to Restore / Trash successfully.',
          'success'
        );
      } catch (error) {
        console.error(
          'Error moving sale to trash:',
          error
        );

        showToast(
          'Error deleting bill: ' +
            error.message,
          'error'
        );
      }
    };

  // ==========================================
  // OPEN PRINT PREVIEW
  // ==========================================
  const openPrintPreview = (sale) => {
    setActiveDropdown(null);
    setPrintSale(sale);
    setIsPrintPreviewOpen(true);
  };

  // ==========================================
  // CLOSE PRINT PREVIEW
  // ==========================================
  const closePrintPreview = () => {
    setIsPrintPreviewOpen(false);
    setPrintSale(null);
  };

  // ==========================================
  // PRINT BILL
  // ==========================================
  const handlePrintBill = (sale) => {
    if (!sale) return;

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=500,height=800'
      );

    if (!printWindow) {
      showToast(
        'Please allow popups to print the bill.',
        'error'
      );
      return;
    }

    const hasDiscount =
      Number(sale.discount || 0) > 0;

    const itemsHTML =
      sale.items
        ?.map(
          (item) => `
            <tr>
              <td class="item-name">
                ${escapeHtml(
                  item.serviceName || ''
                )}
              </td>

              <td class="center">
                ${item.quantity || 0}
              </td>

              <td class="right">
                ₹${Number(
                  item.rate || 0
                ).toFixed(2)}
              </td>

              <td class="right">
                ₹${Number(
                  item.amount || 0
                ).toFixed(2)}
              </td>
            </tr>
          `
        )
        .join('') || '';

    const discountHTML =
      hasDiscount
        ? `
          <div class="summary-row">
            <span>Discount</span>
            <span>
              ₹${Number(
                sale.discount || 0
              ).toFixed(2)}
            </span>
          </div>
        `
        : '';

    const shopAddress =
      shopSettings.address
        ? `
          <div class="shop-address">
            ${escapeHtml(
              shopSettings.address
            )}
          </div>
        `
        : '';

    // ==========================================
    // MOBILE FORMAT
    // NO SPACE AROUND /
    // 7745009409/9665022283
    // ==========================================
    const mobileNumbers =
      getMobileNumbers();

    const shopContacts =
      mobileNumbers
        ? `
          <div class="shop-mobile">
            Mobile: ${escapeHtml(
              mobileNumbers
            )}
          </div>
        `
        : '';

    const shopEmail =
      shopSettings.email
        ? `
          <div class="shop-email">
            ${escapeHtml(
              shopSettings.email
            )}
          </div>
        `
        : '';

    const gst =
      shopSettings.gstNumber
        ? `
          <div class="shop-gst">
            GST No: ${escapeHtml(
              shopSettings.gstNumber
            )}
          </div>
        `
        : '';

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>
        <head>

          <meta charset="UTF-8" />

          <title>
            ${escapeHtml(
              sale.billNumber
            )}
          </title>

          <style>

            * {
              box-sizing: border-box;
            }

            @page {
              size: 80mm auto;
              margin: 0;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 80mm;
              background: #fff;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              color: #111;

              font-size: 11px;

              line-height: 1.4;

              padding: 4mm;
            }

            .invoice {
              width: 100%;
            }

            .shop-header {
              text-align: center;
              padding-bottom: 8px;
            }

            .shop-name {
              font-size: 20px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              margin-bottom: 4px;
            }

            .shop-address {
              font-size: 10px;
              line-height: 1.4;
              white-space: pre-line;
              margin-bottom: 2px;
            }

            .shop-mobile,
            .shop-email,
            .shop-gst {
              font-size: 10px;
              margin-top: 2px;
            }

            .separator {
              border-top: 1px dashed #111;
              margin: 7px 0;
            }

            .bill-title {
              text-align: center;
              font-size: 14px;
              font-weight: 800;
              margin: 5px 0;
              text-transform: uppercase;
            }

            .bill-info {
              font-size: 10px;
            }

            .bill-info-row {
              display: flex;
              justify-content: space-between;
              gap: 5px;
              margin: 2px 0;
            }

            .bill-info-row span:first-child {
              font-weight: 700;
            }

            .customer-box {
              margin-top: 5px;
              padding: 5px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
            }

            th {
              border-top: 1px solid #111;
              border-bottom: 1px solid #111;
              padding: 5px 2px;
              font-size: 9px;
              font-weight: 800;
            }

            td {
              padding: 5px 2px;
              vertical-align: top;
              font-size: 9px;
              border-bottom: 1px dotted #999;
            }

            .item-name {
              width: 43%;
              word-break: break-word;
            }

            .center {
              text-align: center;
            }

            .right {
              text-align: right;
            }

            .summary {
              margin-top: 8px;
              border-top: 1px dashed #111;
              padding-top: 6px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              margin: 3px 0;
            }

            .grand-total {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              font-weight: 800;
              border-top: 1px solid #111;
              border-bottom: 1px double #111;
              padding: 6px 0;
              margin-top: 5px;
            }

            .payment {
              margin-top: 7px;
              font-size: 10px;
              font-weight: 700;
            }

            .thank-you {
              text-align: center;
              margin-top: 12px;
              padding-top: 7px;
              border-top: 1px dashed #111;
              font-size: 11px;
              font-weight: 700;
            }

            .footer {
              text-align: center;
              font-size: 8px;
              margin-top: 5px;
            }

            @media print {
              body {
                width: 80mm;
              }
            }

          </style>

        </head>

        <body>

          <div class="invoice">

            <div class="shop-header">

              <div class="shop-name">
                ${escapeHtml(
                  shopSettings.shopName ||
                    'Print Studio'
                )}
              </div>

              ${shopAddress}

              ${shopContacts}

              ${shopEmail}

              ${gst}

            </div>

            <div class="separator"></div>

            <div class="bill-title">
              TAX / SALES BILL
            </div>

            <div class="bill-info">

              <div class="bill-info-row">
                <span>Bill No:</span>

                <span>
                  ${escapeHtml(
                    sale.billNumber
                  )}
                </span>
              </div>

              <div class="bill-info-row">
                <span>Date:</span>

                <span>
                  ${formatBillDate(
                    sale.createdAt
                  )}
                </span>
              </div>

            </div>

            <div class="customer-box">

              <div class="bill-info-row">
                <span>Customer:</span>

                <span>
                  ${escapeHtml(
                    sale.customerName ||
                      'Walk-in'
                  )}
                </span>
              </div>

              <div class="bill-info-row">
                <span>Mobile:</span>

                <span>
                  ${escapeHtml(
                    sale.mobileNumber ||
                      'N/A'
                  )}
                </span>
              </div>

            </div>

            <table>

              <thead>

                <tr>

                  <th class="item-name">
                    ITEM
                  </th>

                  <th class="center">
                    QTY
                  </th>

                  <th class="right">
                    RATE
                  </th>

                  <th class="right">
                    AMOUNT
                  </th>

                </tr>

              </thead>

              <tbody>
                ${itemsHTML}
              </tbody>

            </table>

            <div class="summary">

              <div class="summary-row">

                <span>
                  Subtotal
                </span>

                <span>
                  ₹${Number(
                    sale.subtotal || 0
                  ).toFixed(2)}
                </span>

              </div>

              ${discountHTML}

              <div class="grand-total">

                <span>
                  GRAND TOTAL
                </span>

                <span>
                  ₹${Number(
                    sale.grandTotal || 0
                  ).toFixed(2)}
                </span>

              </div>

            </div>

            <div class="payment">

              Payment:
              ${escapeHtml(
                sale.paymentMethod ||
                  'Cash'
              )}

            </div>

            <div class="thank-you">

              ${escapeHtml(
                shopSettings.thankYouMessage ||
                  'Thank You! Visit Again.'
              )}

            </div>

            <div class="footer">
              Powered by Print Studio Billing
            </div>

          </div>

          <script>

            window.onload = function() {

              setTimeout(function() {

                window.print();

              }, 300);

            };

            window.onafterprint = function() {

              setTimeout(function() {

                window.close();

              }, 300);

            };

          </script>

        </body>

      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
  };

  // ==========================================
  // DOWNLOAD PDF
  // ==========================================
  const handleDownloadPDF = (sale) => {
    setActiveDropdown(null);

    handlePrintBill(sale);
  };

  // ==========================================
  // FILTER SALES
  // ==========================================
  const filteredSales =
    salesList.filter(
      (sale) => {
        if (
          searchCustomer &&
          !sale.customerName
            ?.toLowerCase()
            .includes(
              searchCustomer.toLowerCase()
            )
        ) {
          return false;
        }

        if (
          searchBillNo &&
          !sale.billNumber
            ?.toLowerCase()
            .includes(
              searchBillNo.toLowerCase()
            )
        ) {
          return false;
        }

        if (
          searchMobile &&
          !sale.mobileNumber?.includes(
            searchMobile
          )
        ) {
          return false;
        }

        if (
          sale.createdAt?.toDate
        ) {
          const saleDate =
            sale.createdAt
              .toDate()
              .toISOString()
              .split('T')[0];

          if (
            fromDate &&
            saleDate < fromDate
          ) {
            return false;
          }

          if (
            toDate &&
            saleDate > toDate
          ) {
            return false;
          }
        }

        return true;
      }
    );

  // ==========================================
  // TOTALS
  // ==========================================
  const totalFilteredAmount =
    filteredSales.reduce(
      (acc, sale) =>
        acc +
        Number(
          sale.grandTotal || 0
        ),
      0
    );

  const totalFilteredQty =
    filteredSales.reduce(
      (acc, sale) => {
        const saleQty =
          sale.items?.reduce(
            (
              itemAcc,
              item
            ) =>
              itemAcc +
              Number(
                item.quantity || 0
              ),
            0
          ) || 0;

        return acc + saleQty;
      },
      0
    );

  // ==========================================
  // PAGINATION
  // ==========================================
  const totalPages =
    Math.ceil(
      filteredSales.length /
        itemsPerPage
    ) || 1;

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const indexOfLastItem =
    safeCurrentPage *
    itemsPerPage;

  const indexOfFirstItem =
    indexOfLastItem -
    itemsPerPage;

  const currentSales =
    filteredSales.slice(
      indexOfFirstItem,
      indexOfLastItem
    );

  // ==========================================
  // LOG STYLE
  // ==========================================
  const getLogStyle = (
    action
  ) => {
    if (
      action === 'INSERT'
    ) {
      return {
        badge:
          'bg-emerald-100 text-emerald-700',
        icon:
          'bg-emerald-100 text-emerald-600',
        symbol: '＋'
      };
    }

    if (
      action === 'UPDATE'
    ) {
      return {
        badge:
          'bg-blue-100 text-blue-700',
        icon:
          'bg-blue-100 text-blue-600',
        symbol: '✎'
      };
    }

    if (
      action === 'DELETE'
    ) {
      return {
        badge:
          'bg-red-100 text-red-700',
        icon:
          'bg-red-100 text-red-600',
        symbol: '🗑'
      };
    }

    return {
      badge:
        'bg-slate-100 text-slate-700',
      icon:
        'bg-slate-100 text-slate-600',
      symbol: '•'
    };
  };

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <div className="space-y-5">

      {/* ==================================================
          TOAST
      ================================================== */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[200]">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-medium text-sm ${
              toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-slate-900'
            }`}
          >
            <span>
              {toast.type === 'error'
                ? '❌'
                : '✅'}
            </span>

            <span>
              {toast.message}
            </span>
          </div>
        </div>
      )}

      {/* ==================================================
          HEADER
      ================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl shadow-sm">
            🧾
          </div>

          <div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              Counter Sales Billing
            </h1>

            <p className="text-xs text-slate-500">
              {shopSettings.shopName}
            </p>

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          <button
            onClick={
              handleOpenModal
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <span className="text-base">
              ＋
            </span>

            New Sale Entry
          </button>

          <button
            onClick={() =>
              setIsLogModalOpen(
                true
              )
            }
            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            📋 View Sales Log
          </button>

        </div>

      </div>

      {/* ==================================================
          FILTER PANEL
      ================================================== */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          <div>

            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Customer Search
            </label>

            <input
              type="text"
              placeholder="Search Customer..."
              value={
                searchCustomer
              }
              onChange={(e) => {
                setSearchCustomer(
                  e.target.value
                );

                setCurrentPage(1);
              }}
              className="w-full border p-2 rounded-lg text-xs sm:text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <div>

            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Bill Number Search
            </label>

            <input
              type="text"
              placeholder="Search Bill No..."
              value={
                searchBillNo
              }
              onChange={(e) => {
                setSearchBillNo(
                  e.target.value
                );

                setCurrentPage(1);
              }}
              className="w-full border p-2 rounded-lg text-xs sm:text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <div>

            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Mobile Search
            </label>

            <input
              type="text"
              placeholder="Search Mobile..."
              value={
                searchMobile
              }
              onChange={(e) => {
                setSearchMobile(
                  e.target.value
                );

                setCurrentPage(1);
              }}
              className="w-full border p-2 rounded-lg text-xs sm:text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <div className="flex flex-col justify-end">

            <button
              onClick={
                handleTodayFilter
              }
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 p-2 rounded-lg text-xs font-bold transition-colors w-full cursor-pointer"
            >
              📅 Set Today's Filter
            </button>

          </div>

        </div>

        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-3">

          <div className="flex flex-wrap items-center gap-2">

            <span className="text-xs font-semibold text-slate-500">
              Date Range:
            </span>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(
                  e.target.value
                );
                setCurrentPage(1);
              }}
              className="border p-1.5 rounded-lg text-xs bg-slate-50 outline-none"
            />

            <span className="text-xs text-slate-400">
              to
            </span>

            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(
                  e.target.value
                );
                setCurrentPage(1);
              }}
              className="border p-1.5 rounded-lg text-xs bg-slate-50 outline-none"
            />

            {(fromDate ||
              toDate ||
              searchCustomer ||
              searchBillNo ||
              searchMobile) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearchCustomer('');
                  setSearchBillNo('');
                  setSearchMobile('');
                  setCurrentPage(1);
                }}
                className="text-xs text-red-500 hover:underline font-semibold px-2 py-1 cursor-pointer"
              >
                Clear All Filters
              </button>
            )}

          </div>

          <div className="text-xs sm:text-sm text-slate-500 font-medium">

            Matching Entries:

            <span className="text-slate-800 font-bold ml-1">
              {
                filteredSales.length
              }
            </span>

          </div>

        </div>

      </div>

      {/* ==================================================
          ADD SALE MODAL
      ================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">

          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl space-y-6 my-8">

            <div className="flex justify-between items-center border-b pb-3">

              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                🧾 New Counter Sales
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsModalOpen(
                    false
                  )
                }
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={
                handleSaveSale
              }
              className="space-y-5"
            >

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div>

                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Customer Name
                  </label>

                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={
                      customerName
                    }
                    onChange={(e) =>
                      setCustomerName(
                        e.target.value
                      )
                    }
                    className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Mobile Number
                  </label>

                  <input
                    type="text"
                    placeholder="Mobile Number"
                    value={
                      mobileNumber
                    }
                    onChange={(e) =>
                      setMobileNumber(
                        e.target.value
                      )
                    }
                    className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Payment Method
                  </label>

                  <select
                    value={
                      paymentMethod
                    }
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value
                      )
                    }
                    className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="Cash">
                      Cash
                    </option>

                    <option value="UPI">
                      UPI / Online
                    </option>

                    <option value="Card">
                      Card
                    </option>

                    <option value="Credit">
                      Credit
                    </option>

                  </select>

                </div>

              </div>

              {/* ITEMS */}

              <div className="space-y-3">

                <h3 className="font-semibold text-slate-700 text-sm">
                 Items Details
                </h3>

                {billItems.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-xl border"
                    >

                      <div className="sm:col-span-6">

                        <select
                          value={
                            item.serviceId
                          }
                          onChange={(e) =>
                            handleServiceChange(
                              index,
                              e.target.value
                            )
                          }
                          required
                          className="w-full border p-2 rounded-lg bg-white text-sm"
                        >

                          <option value="">
                            ----Select Item----
                          </option>

                          {services.map(
                            (
                              service
                            ) => (
                              <option
                                key={
                                  service.id
                                }
                                value={
                                  service.id
                                }
                              >
                                {
                                  service.name
                                }{' '}
                                (₹
                                {
                                  service.sellingRate
                                }
                                )
                              </option>
                            )
                          )}

                        </select>

                      </div>

                      <div className="sm:col-span-2">

                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={
                            item.quantity
                          }
                          onChange={(e) =>
                            handleQtyChange(
                              index,
                              e.target.value
                            )
                          }
                          required
                          className="w-full border p-2 rounded-lg bg-white text-sm"
                        />

                      </div>

                      <div className="sm:col-span-3">

                        <input
                          type="text"
                          value={`₹${item.amount}`}
                          className="w-full border p-2 rounded-lg bg-slate-100 font-bold text-sm"
                        />

                      </div>

                      <div className="sm:col-span-1 text-center">

                        <button
                          type="button"
                          onClick={() =>
                            removeItemRow(
                              index
                            )
                          }
                          className="text-red-500 hover:text-red-700 font-bold text-sm px-2 py-1 rounded bg-red-50 border border-red-100 w-full cursor-pointer"
                        >
                          ✕
                        </button>

                      </div>

                    </div>
                  )
                )}

                <button
                  type="button"
                  onClick={
                    addItemRow
                  }
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 text-xs cursor-pointer"
                >
                  + Add Another Item
                </button>

              </div>

              {/* TOTAL */}

              <div className="border-t pt-4 flex flex-col items-end space-y-2">

                <p className="text-sm text-slate-600">

                  Subtotal:

                  <span className="font-bold ml-1">
                    ₹{subtotal}
                  </span>

                </p>

                <div className="flex items-center gap-2">

                  <span className="text-sm text-slate-600">
                    Discount:
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={
                      discount
                    }
                    onChange={(e) =>
                      setDiscount(
                        e.target.value
                      )
                    }
                    className="border p-1.5 rounded-lg w-28 text-right text-sm"
                  />

                </div>

                <p className="text-base font-bold text-slate-800">

                  Grand Total:

                  <span className="ml-1">
                    ₹{grandTotal}
                  </span>

                </p>

              </div>

              {/* ACTIONS */}

              <div className="flex justify-end gap-3 pt-3 border-t">

                <button
                  type="button"
                  onClick={() =>
                    setIsModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-md cursor-pointer"
                >
                  Save
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ==================================================
          VIEW SALE MODAL
      ================================================== */}
      {isViewModalOpen &&
        selectedSale && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">

            <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 my-8">

              <div className="flex justify-between items-center border-b pb-3">

                <div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-800">

                    🧾 Bill Details:

                    <span className="ml-1">
                      {
                        selectedSale.billNumber
                      }
                    </span>

                  </h3>

                  <p className="text-xs text-slate-500">
                    View mode (Read Only)
                  </p>

                </div>

                <button
                  onClick={() =>
                    setIsViewModalOpen(
                      false
                    )
                  }
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl text-sm">

                <div>

                  <span className="text-slate-500 block text-xs">
                    Customer Name
                  </span>

                  <span className="font-semibold text-slate-800">
                    {
                      selectedSale.customerName
                    }
                  </span>

                </div>

                <div>

                  <span className="text-slate-500 block text-xs">
                    Mobile Number
                  </span>

                  <span className="font-semibold text-slate-800">
                    {
                      selectedSale.mobileNumber
                    }
                  </span>

                </div>

                <div>

                  <span className="text-slate-500 block text-xs">
                    Payment Method
                  </span>

                  <span className="font-semibold text-slate-800">
                    {
                      selectedSale.paymentMethod ||
                      'Cash'
                    }
                  </span>

                </div>

              </div>

              <div className="space-y-2">

                <h4 className="font-semibold text-slate-700 text-sm">
                  Purchased Items
                </h4>

                <div className="border rounded-xl overflow-x-auto">

                  <table className="w-full text-left text-sm min-w-[350px]">

                    <thead className="bg-slate-50 text-slate-600 border-b">

                      <tr>

                        <th className="p-3">
                          Service
                        </th>

                        <th className="p-3">
                          Qty
                        </th>

                        <th className="p-3">
                          Rate
                        </th>

                        <th className="p-3">
                          Amount
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {selectedSale.items?.map(
                        (
                          item,
                          idx
                        ) => (
                          <tr
                            key={idx}
                            className="border-b last:border-none"
                          >

                            <td className="p-3">
                              {
                                item.serviceName
                              }
                            </td>

                            <td className="p-3">
                              {
                                item.quantity
                              }
                            </td>

                            <td className="p-3">
                              ₹
                              {
                                item.rate
                              }
                            </td>

                            <td className="p-3 font-bold">
                              ₹
                              {
                                item.amount
                              }
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              <div className="border-t pt-3 flex flex-col items-end space-y-1 text-sm">

                <p className="text-slate-600">

                  Subtotal:

                  <span className="font-bold ml-1">
                    ₹
                    {
                      selectedSale.subtotal
                    }
                  </span>

                </p>

                {Number(
                  selectedSale.discount ||
                    0
                ) > 0 && (
                  <p className="text-slate-600">

                    Discount:

                    <span className="font-bold ml-1">
                      ₹
                      {
                        selectedSale.discount
                      }
                    </span>

                  </p>
                )}

                <p className="text-base font-bold text-slate-900">

                  Grand Total:

                  <span className="ml-1">
                    ₹
                    {
                      selectedSale.grandTotal
                    }
                  </span>

                </p>

              </div>

              <div className="flex justify-between gap-3 pt-3 border-t">

                <div className="flex gap-2">

                  <button
                    onClick={() =>
                      openPrintPreview(
                        selectedSale
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    👁️ Preview & Print
                  </button>

                  <button
                    onClick={() =>
                      handleDownloadPDF(
                        selectedSale
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 cursor-pointer"
                  >
                    📥 Save PDF
                  </button>

                </div>

                <button
                  onClick={() =>
                    setIsViewModalOpen(
                      false
                    )
                  }
                  className="px-5 py-2 rounded-lg bg-slate-800 text-white font-semibold text-sm hover:bg-slate-900 cursor-pointer"
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        )}

      {/* ==================================================
          PRINT PREVIEW MODAL
      ================================================== */}
      {isPrintPreviewOpen &&
        printSale && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[150]">

            <div className="bg-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">

              {/* PREVIEW HEADER */}

              <div className="bg-white p-4 border-b flex items-center justify-between">

                <div>

                  <h2 className="text-lg font-bold text-slate-800">
                    🖨️ Bill Preview
                  </h2>

                  <p className="text-xs text-slate-500">
                    Preview the bill before printing
                  </p>

                </div>

                <button
                  onClick={
                    closePrintPreview
                  }
                  className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-600 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>

              </div>

              {/* PREVIEW AREA */}

              <div className="flex-1 overflow-y-auto p-4 sm:p-8">

                <div className="flex justify-center">

                  {/* THERMAL BILL */}

                  <div
                    className="bg-white shadow-2xl"
                    style={{
                      width:
                        '80mm',
                      minHeight:
                        '100mm',
                      padding:
                        '12px',
                      fontFamily:
                        'Arial, Helvetica, sans-serif',
                      color:
                        '#111'
                    }}
                  >

                    {/* SHOP HEADER */}

                    <div className="text-center pb-2">

                      <div className="text-xl font-extrabold uppercase tracking-wide">

                        {
                          shopSettings.shopName ||
                          'Print Studio'
                        }

                      </div>

                      {shopSettings.address && (
                        <div className="text-[10px] mt-1 whitespace-pre-line leading-4">
                          {
                            shopSettings.address
                          }
                        </div>
                      )}

                      {/* =====================================
                          MOBILE FORMAT
                          NO SPACE AROUND /
                      ====================================== */}

                      {getMobileNumbers() && (
                        <div className="text-[10px] mt-1 font-medium">
                          Mobile: {getMobileNumbers()}
                        </div>
                      )}

                      {shopSettings.email && (
                        <div className="text-[10px]">
                          {
                            shopSettings.email
                          }
                        </div>
                      )}

                      {shopSettings.gstNumber && (
                        <div className="text-[10px]">
                          GST No:{' '}
                          {
                            shopSettings.gstNumber
                          }
                        </div>
                      )}

                    </div>

                    <div className="border-t border-dashed border-slate-700 my-2" />

                    {/* TITLE */}

                    <div className="text-center text-sm font-extrabold">
                      TAX BILL
                    </div>

                    {/* BILL INFO */}

                    <div className="text-[10px] mt-2 space-y-1">

                      <div className="flex justify-between gap-2">

                        <span className="font-bold">
                          Bill No:
                        </span>

                        <span>
                          {
                            printSale.billNumber
                          }
                        </span>

                      </div>

                      <div className="flex justify-between gap-1">

                        <span className="font-bold">
                          Date:
                        </span>

                        <span>
                          {formatBillDate(
                            printSale.createdAt
                          )}
                        </span>

                      </div>

                    </div>

                    {/* CUSTOMER */}

                    <div className="mt-2 py-2">

                      <div className="flex justify-between text-[10px]">

                        <span className="font-bold">
                          Customer:
                        </span>

                        <span className="text-right">
                          {
                            printSale.customerName ||
                            'Walk-in'
                          }
                        </span>

                      </div>

                      <div className="flex justify-between gap-2 text-[10px] mt-1">

                        <span className="font-bold">
                          Mobile:
                        </span>

                        <span className="text-right">
                          {
                            printSale.mobileNumber ||
                            'N/A'
                          }
                        </span>

                      </div>

                    </div>

                    {/* ITEMS TABLE */}

                    <table className="w-full border-collapse mt-1">

                      <thead>

                        <tr>

                          <th className="border-t border-b border-slate-800 py-1 text-left text-[9px]">
                            ITEM
                          </th>

                          <th className="border-t border-b border-slate-800 py-1 text-center text-[9px]">
                            QTY
                          </th>

                          <th className="border-t border-b border-slate-800 py-1 text-right text-[9px]">
                            RATE
                          </th>

                          <th className="border-t border-b border-slate-800 py-1 text-right text-[9px]">
                            AMT
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {printSale.items?.map(
                          (
                            item,
                            index
                          ) => (
                            <tr
                              key={
                                index
                              }
                            >

                              <td className="border-b border-dotted border-slate-400 py-1 text-[9px] break-words">
                                {
                                  item.serviceName
                                }
                              </td>

                              <td className="border-b border-dotted border-slate-400 py-1 text-[9px] text-center">
                                {
                                  item.quantity
                                }
                              </td>

                              <td className="border-b border-dotted border-slate-400 py-1 text-[9px] text-right">
                                ₹
                                {Number(
                                  item.rate ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </td>

                              <td className="border-b border-dotted border-slate-400 py-1 text-[9px] text-right font-semibold">
                                ₹
                                {Number(
                                  item.amount ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                    {/* SUMMARY */}

                    <div className="border-t border-dashed border-slate-800 mt-2 pt-2 space-y-1">

                      <div className="flex justify-between text-[10px]">

                        <span>
                          Subtotal
                        </span>

                        <span>
                          ₹
                          {Number(
                            printSale.subtotal ||
                              0
                          ).toFixed(
                            2
                          )}
                        </span>

                      </div>

                      {Number(
                        printSale.discount ||
                          0
                      ) > 0 && (
                        <div className="flex justify-between text-[10px]">

                          <span>
                            Discount
                          </span>

                          <span>
                            ₹
                            {Number(
                              printSale.discount ||
                                0
                            ).toFixed(
                              2
                            )}
                          </span>

                        </div>
                      )}

                      <div className="flex justify-between text-sm font-extrabold border-t border-b border-slate-800 py-2 mt-1">

                        <span>
                        TOTAL
                        </span>

                        <span>
                          ₹
                          {Number(
                            printSale.grandTotal ||
                              0
                          ).toFixed(
                            2
                          )}
                        </span>

                      </div>

                    </div>

                    {/* PAYMENT */}

                    <div className="text-[10px] font-bold mt-2">

                      Payment:

                      <span className="font-normal ml-1">
                        {
                          printSale.paymentMethod ||
                          'Cash'
                        }
                      </span>

                    </div>

                    {/* THANK YOU */}

                    <div className="text-center border-t border-dashed border-slate-700 mt-3 pt-2">

                      <div className="text-[11px] font-bold">
                        {
                          shopSettings.thankYouMessage ||
                          'Thank You! Visit Again.'
                        }
                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* PREVIEW FOOTER */}

              <div className="bg-white border-t p-4 flex flex-wrap justify-end gap-2">

                <button
                  onClick={
                    closePrintPreview
                  }
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={() =>
                    handlePrintBill(
                      printSale
                    )
                  }
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md cursor-pointer"
                >
                  🖨️ Print Bill
                </button>

                <button
                  onClick={() =>
                    handleDownloadPDF(
                      printSale
                    )
                  }
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md cursor-pointer"
                >
                  📥 Save as PDF
                </button>

              </div>

            </div>

          </div>
        )}

      {/* ==================================================
          DELETE MODAL
      ================================================== */}
      {isDeleteModalOpen &&
        saleToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">

            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

              <div className="p-6">

                <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-4">
                  🗑️
                </div>

                <h3 className="text-lg font-bold text-slate-800">
                  Delete Sales Bill?
                </h3>

                <p className="text-sm text-slate-600 mt-3 leading-6">

                  Are you sure you want to delete bill

                  <span className="font-bold text-slate-800">
                    {' '}
                    "
                    {
                      saleToDelete.billNumber
                    }
                    "
                  </span>
                  ?

                </p>

                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">

                  <p className="text-xs text-amber-800 leading-5">
                    ⚠️ This Bill is Deleted
                  </p>

                </div>

              </div>

              <div className="bg-slate-50 border-t p-4 flex justify-end gap-3">

                <button
                  onClick={() => {
                    setIsDeleteModalOpen(
                      false
                    );

                    setSaleToDelete(
                      null
                    );
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    confirmDeleteSale
                  }
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-sm cursor-pointer"
                >
                  🗑️ Yes
                </button>

              </div>

            </div>

          </div>
        )}

      {/* ==================================================
          SALES ACTIVITY LOG
      ================================================== */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[70]">

          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">

            <div className="p-5 border-b flex items-start justify-between">

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">
                  📋
                </div>

                <div>

                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                    Sales Activity Log
                  </h2>

                </div>

              </div>

              <button
                onClick={() =>
                  setIsLogModalOpen(
                    false
                  )
                }
                className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>

            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50">

              {activityLogs.length ===
              0 ? (
                <div className="text-center py-14 text-slate-500">

                  <div className="text-4xl mb-3">
                    📋
                  </div>

                  <p className="font-semibold">
                    No activity logs found
                  </p>

                  <p className="text-xs mt-1">
                    New Insert, Update and Delete
                    activities will appear here.
                  </p>

                </div>
              ) : (
                <div className="relative space-y-4">

                  <div className="absolute left-[24px] sm:left-[28px] top-5 bottom-5 w-px bg-slate-200" />

                  {activityLogs.map(
                    (log) => {
                      const style =
                        getLogStyle(
                          log.action
                        );

                      return (
                        <div
                          key={
                            log.id
                          }
                          className="relative flex gap-3 sm:gap-5"
                        >

                          <div
                            className={`relative z-10 min-w-[48px] h-12 rounded-full flex items-center justify-center font-bold text-lg ${style.icon}`}
                          >
                            {
                              style.symbol
                            }
                          </div>

                          <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">

                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">

                              <div>

                                <span
                                  className={`inline-flex px-3 py-1 rounded-md text-xs font-bold ${style.badge}`}
                                >
                                  {
                                    log.action
                                  }
                                </span>

                                <h3 className="mt-3 text-sm sm:text-base font-bold text-slate-800">
                                  {
                                    log.description ||
                                    `${log.action} sale "${log.billNumber}"`
                                  }
                                </h3>

                              </div>

                              <div className="text-xs text-slate-500 font-semibold whitespace-nowrap">
                                🕒{' '}
                                {formatDateTime(
                                  log.createdAt
                                )}
                              </div>

                            </div>

                            {log.changes?.length >
                              0 && (
                              <div className="mt-4 border-t pt-3">

                                <p className="text-xs font-bold text-slate-500 mb-2">
                                  Changes:
                                </p>

                                <div className="space-y-2">

                                  {log.changes.map(
                                    (
                                      change,
                                      index
                                    ) => (
                                      <div
                                        key={
                                          index
                                        }
                                        className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs"
                                      >

                                        <span className="font-bold text-slate-700">
                                          {
                                            change.field
                                          }:
                                        </span>

                                        {change.oldValue && (
                                          <>
                                            <span className="text-red-500 line-through ml-2">
                                              {
                                                change.oldValue
                                              }
                                            </span>

                                            <span className="mx-2 text-slate-400">
                                              →
                                            </span>
                                          </>
                                        )}

                                        <span className="font-semibold text-emerald-600">
                                          {
                                            change.newValue
                                          }
                                        </span>

                                      </div>
                                    )
                                  )}

                                </div>

                              </div>
                            )}

                            <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-slate-600">

                              <span className="text-purple-600">
                                👤
                              </span>

                              <span className="font-medium">
                                Performed by:
                              </span>

                              <span className="font-bold text-slate-700">
                                {
                                  log.performedBy ||
                                  'Current User'
                                }
                              </span>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            <div className="p-4 border-t bg-white flex justify-end">

              <button
                onClick={() =>
                  setIsLogModalOpen(
                    false
                  )
                }
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          SALES HISTORY
      ================================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">

          <h2 className="font-bold text-slate-800 text-base">
            Sales History List
          </h2>

          <div className="flex flex-wrap items-center gap-3">

            <div className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">

              Total Qty:

              <span className="text-indigo-600 font-bold ml-1">
                {
                  totalFilteredQty
                }
              </span>

            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">

              Total Amount:

              <span className="text-blue-600 font-bold ml-1">
                ₹
                {
                  totalFilteredAmount
                }
              </span>

            </div>

          </div>

        </div>

        <div className="overflow-x-auto relative">

          <table className="w-full text-left border-collapse min-w-[1000px]">

            <thead>

              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">

                <th className="p-4 sticky left-0 z-10 bg-slate-50">
                  Bill Number
                </th>

                <th className="p-4">
                  Date
                </th>

                <th className="p-4">
                  Customer Name
                </th>

                <th className="p-4">
                  Mobile
                </th>

                <th className="p-4">
                  Purchased Items
                </th>

                <th className="p-4 text-center">
                  Total Qty
                </th>

                <th className="p-4">
                  Total Amount
                </th>

                <th className="p-4">
                  Payment
                </th>

                <th className="p-4 text-center">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (
                <tr>

                  <td
                    colSpan="9"
                    className="p-6 text-center text-slate-500 text-sm"
                  >
                    Loading sales history...
                  </td>

                </tr>
              ) : currentSales.length ===
                0 ? (
                <tr>

                  <td
                    colSpan="9"
                    className="p-6 text-center text-slate-500 text-sm"
                  >
                    No sales records found matching
                    your filters.
                  </td>

                </tr>
              ) : (
                currentSales.map(
                  (
                    sale,
                    index
                  ) => {

                    const dateStr =
                      sale.createdAt?.toDate
                        ? sale.createdAt
                            .toDate()
                            .toLocaleDateString()
                        : 'N/A';

                    const seqNo =
                      indexOfFirstItem +
                      index +
                      1;

                    const billTotalQty =
                      sale.items?.reduce(
                        (
                          acc,
                          item
                        ) =>
                          acc +
                          Number(
                            item.quantity ||
                              0
                          ),
                        0
                      ) || 0;

                    return (
                      <tr
                        key={
                          sale.id
                        }
                        className="border-b border-slate-100 text-sm hover:bg-slate-50"
                      >

                        <td className="p-4 font-semibold text-blue-600 sticky left-0 z-10 bg-white whitespace-nowrap">

                          <span className="text-xs text-slate-400 mr-1.5 font-normal">
                            #
                            {
                              seqNo
                            }
                          </span>

                          {
                            sale.billNumber
                          }

                        </td>

                        <td className="p-4 text-slate-600 whitespace-nowrap">
                          {
                            dateStr
                          }
                        </td>

                        <td className="p-4 font-medium text-slate-800">
                          {
                            sale.customerName
                          }
                        </td>

                        <td className="p-4 text-slate-600 whitespace-nowrap">
                          {
                            sale.mobileNumber
                          }
                        </td>

                        <td className="p-4 text-slate-600 max-w-xs">

                          <div className="flex flex-wrap gap-1">

                            {sale.items?.map(
                              (
                                item,
                                itemIndex
                              ) => (
                                <span
                                  key={
                                    itemIndex
                                  }
                                  className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs border border-slate-200"
                                >

                                  {
                                    item.serviceName
                                  }

                                  <span className="font-bold text-blue-600 ml-1">
                                    (
                                    {
                                      item.quantity
                                    }
                                    )
                                  </span>

                                </span>
                              )
                            )}

                          </div>

                        </td>

                        <td className="p-4 text-center font-bold text-indigo-600 whitespace-nowrap">
                          {
                            billTotalQty
                          }
                        </td>

                        <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                          ₹
                          {
                            sale.grandTotal
                          }
                        </td>

                        <td className="p-4 whitespace-nowrap">

                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                            {
                              sale.paymentMethod ||
                              'Cash'
                            }
                          </span>

                        </td>

                        <td className="p-4 text-center">

                          <div className="relative inline-block dropdown-container">

                            <button
                              onClick={() =>
                                setActiveDropdown(
                                  activeDropdown ===
                                    sale.id
                                    ? null
                                    : sale.id
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 font-bold text-base cursor-pointer"
                              title="Actions"
                            >
                              ⋮
                            </button>

                            {activeDropdown ===
                              sale.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left">

                                <button
                                  onClick={() =>
                                    handleViewSale(
                                      sale
                                    )
                                  }
                                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  👁️ View Details
                                </button>

                                <button
                                  onClick={() =>
                                    openPrintPreview(
                                      sale
                                    )
                                  }
                                  className="w-full text-left px-4 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                                >
                                  👁️ Preview & Print
                                </button>

                                <button
                                  onClick={() =>
                                    handleDownloadPDF(
                                      sale
                                    )
                                  }
                                  className="w-full text-left px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                                >
                                  📥 Save PDF
                                </button>

                                <div className="border-t border-slate-100 my-1" />

                                <button
                                  onClick={() =>
                                    handleDeleteSale(
                                      sale
                                    )
                                  }
                                  className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                >
                                  🗑️ Delete Record
                                </button>

                              </div>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )
              )}

            </tbody>

          </table>

        </div>

        {/* PAGINATION */}

        {!loading &&
          filteredSales.length >
            0 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">

              <span className="text-xs text-slate-500">
                Page{' '}
                {
                  safeCurrentPage
                }{' '}
                of{' '}
                {
                  totalPages
                }
              </span>

              <div className="flex gap-2">

                <button
                  onClick={() =>
                    setCurrentPage(
                      (prev) =>
                        Math.max(
                          prev - 1,
                          1
                        )
                    )
                  }
                  disabled={
                    safeCurrentPage ===
                    1
                  }
                  className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setCurrentPage(
                      (prev) =>
                        Math.min(
                          prev + 1,
                          totalPages
                        )
                    )
                  }
                  disabled={
                    safeCurrentPage ===
                    totalPages
                  }
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
