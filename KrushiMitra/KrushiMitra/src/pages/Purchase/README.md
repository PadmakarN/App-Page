# Purchase module — UI और business logic अलग

## लगाने का तरीका

1. सभी आठ JS/JSX files को अपने React project के `src/Purchase/` folder में रखें।
2. आपका मौजूदा Firebase setup `src/Services/firebase.js` से `db` export करना चाहिए। अगर path अलग है तो केवल `purchaseService.js` का Firebase import बदलें।
3. Page import करें:

```jsx
import PurchaseEntry from './Purchase/PurchaseEntry';

// आपके मौजूदा router/page के अंदर:
<PurchaseEntry currentUser={currentUser} />
```

अगर पुराने page का import कई जगह है और वह `src/components/PurchaseEntry.jsx` में है, तो उस पुरानी file को इस re-export से बदल सकते हैं:

```jsx
export { default } from '../Purchase/PurchaseEntry';
```

मौजूदा React, Firebase, Tailwind, lucide-react और MUI dependencies उपयोग होती हैं। नया package आवश्यक नहीं है। Native dialog के लिए आधुनिक Chrome/Firefox/Edge आवश्यक है।

## कौन सी file क्या करती है?

| File | काम |
|---|---|
| PurchaseEntry.jsx | मुख्य page, header और components का connection |
| PurchaseForm.jsx | Supplier, invoice, date और material rows का UI |
| usePurchaseForm.js | Form state, add/remove rows, rate/amount, save और double-click guard |
| PurchaseList.jsx | Search/date filters, totals, history table और pagination का UI |
| usePurchaseList.js | List loading, filters, totals, pagination, view/print/delete/logs logic |
| PurchaseDialogs.jsx | View details, delete confirmation, logs और reusable modal UI |
| purchaseService.js | Firestore listeners, atomic save/delete, stock ledger, logs और print |
| purchaseUtils.js | Date, validation, stock calculations, money और filtering helpers |

Named functions और effects का काम हिंदी comments में दिया है। छोटे JSX callbacks केवल events को hook functions तक भेजते हैं।

## Save का flow

PurchaseForm → usePurchaseForm.submit → purchaseService.savePurchase → Firestore transaction:

1. इसी draft की purchase/trash document पढ़कर duplicate save रोकता है।
2. सभी unique item documents पढ़ता है। Reads पूरे होने के बाद ही writes करता है।
3. एक ही item कई rows में हो तो quantities क्रम से जोड़ता है। उदाहरण: stock 10 और rows 3 + 2 हों तो final stock 15 है।
4. Item का final stock update करता है और हर purchase row के लिए stockTransactions entry लिखता है।
5. Purchase header/details और INSERT_PURCHASE log उसी transaction में लिखता है।
6. कोई write fail हुई तो पूरा transaction fail होता है। Log fail होने पर purchase सफल बताकर नहीं छोड़ा जाता।

Firestore callback retry होने पर बाहरी arrays/state नहीं बदलती। Save चलते समय button और close disabled रहते हैं। Failed attempt पर उसी खुले draft का retry वही purchase ID उपयोग करता है। यह browser reload/new draft के बीच invoice deduplication नहीं है।

## Stock Transaction screen में fields

नई purchase save होने पर `stockTransactions` में:

| Field | Value |
|---|---|
| transactionType | Purchase |
| type | IN |
| transactionDate | चुनी हुई purchase date, Firestore Timestamp |
| purchaseDate | वही purchase date, Firestore Timestamp |
| referenceType | Purchase |
| referenceNumber | Purchase number: PUR-<Firestore document ID> |
| referenceId | Purchase document ID |
| purchaseNumber | वही purchase number |
| invoiceNumber | Supplier का invoice number, अलग field |
| quantity / qty / stockEffect | खरीदी गई quantity, positive |
| balanceAfter | उस row के stock effect के बाद balance |
| createdAt | असली entry save होने का server time |

`PUR-` के बाद पूरा random document ID रखा है ताकि पुराने छह-digit time suffix की collision समस्या न हो। यह sequential purchase numbering नहीं है।

Sales/Stock Transaction screen का source नहीं दिया गया है, इसलिए उसका rendering code modify या verify नहीं किया गया है। उस screen में इन columns को map करें:

```jsx
<td>{transaction.transactionDate?.toDate?.().toLocaleDateString('en-IN') || 'N/A'}</td>
<td>{transaction.referenceNumber || transaction.purchaseNumber || ''}</td>
<td>{transaction.transactionType}</td>
```

अगर screen की query सिर्फ `Sales` records लाती है, तो उसमें `Purchase` और `Purchase Reversal` भी शामिल करने होंगे। इस module से ledger data लिखा जाता है; दूसरे screen की query अपने आप नहीं बदलती। पुराने transactions को backfill नहीं किया गया है।

Purchase document में `purchaseDate` नया स्पष्ट field है। पुराने consumers की compatibility के लिए `createdAt` में अभी भी purchase date है; वास्तविक save time `recordedAt` है। List में column अब “Purchase Date” है, midnight को misleading entry time की तरह नहीं दिखाया जाता।

## Delete का flow

Confirmation → usePurchaseList.confirmDelete → purchaseService.deletePurchase:

- Database से purchase फिर पढ़ता है; stale UI data से stock नहीं घटाता।
- सभी item reads पहले करता है। Missing item होने पर delete रोकता है।
- Duplicate item rows मिलाकर stock check करता है। Final stock negative हो तो पूरा delete रुकता है।
- Stock कम करता है, OUT / Purchase Reversal ledger rows लिखता है, trash copy बनाता है, purchase हटाता है और log लिखता है — सब एक transaction में।
- दूसरी बार वही purchase delete करने से stock फिर नहीं घटता।
- Reversal की transactionDate original purchase date रखी गई है, पुराने code के समान। Actual deletion time `createdAt`/`reversedAt` है। Historical reporting में इसे इसी अर्थ से उपयोग करें। `balanceAfter` posting-time stock है, backdated historical running balance नहीं।
- Existing Trash/Restore page दिया नहीं गया है; उसकी restore logic इस deliverable में बदली नहीं गई है।

## व्यवहार और सीमाएं

- Search, Today filter, date range, totals, 5-row pagination, details, print, delete और logs उपलब्ध हैं।
- Table के dropdown की जगह View/Print/Delete inline buttons रखे हैं ताकि scroll container में menu clip न हो।
- Rates पहले की तरह item master से आते हैं; zero rate सही होने पर `price` fallback से replace नहीं होती। Qty UI में whole pieces रखी है, जैसे पुराने form में थी।
- Stock field: `currentStock` मौजूद हो तो वही, अन्यथा `quantity`; दो fields को अलग-अलग stock मानकर update नहीं करता। Sales/Restore को भी यही convention उपयोग करना चाहिए।
- Items/purchases realtime हैं; logs listener केवल logs modal खुलने पर सक्रिय है। Logs collection अभी read करके purchase logs client-side filter होते हैं। Purchase pagination भी client-side है, server-side pagination नहीं।
- वर्तमान Firebase rules को authenticated user के लिए items/purchases/trash_purchases/stockTransactions/logs पर अपेक्षित operations की अनुमति देनी होगी। Save draft के लिए purchase और trash existence reads भी जरूरी हैं। Rules को सार्वजनिक/अनियंत्रित न करें; permission-denied हो तो existing rules के अनुरूप सुधार करें। Browser validation server authorization का विकल्प नहीं है।
- बड़े invoices पर Firestore document size, transaction और security-rule access limits लागू होते हैं।

## जांच

Local mock-transaction checks पास हुए: repeated item stock accumulation, reads-before-writes, callback retry, same-draft duplicate save, purchase date/reference, amount recalculation, stock reversal, negative-stock rollback, log-write failure rollback, missing items, numeric/date validation और filters। JS/JSX syntax तथा local import paths भी जांचे गए।

Live Firebase credentials/rules और पूरा Vite project उपलब्ध नहीं था; actual database integration, browser rendering और Sales/Stock Transaction screen का end-to-end test नहीं हुआ। अपने test data पर पहले एक purchase save और delete करके screen में date/reference mapping जांचें।

Firestore transaction reference: https://firebase.google.com/docs/firestore/manage-data/transactions
