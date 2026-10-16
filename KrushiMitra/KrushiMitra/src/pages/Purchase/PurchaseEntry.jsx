
import { ShoppingBag } from 'lucide-react';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import PurchaseForm from './PurchaseForm';
import PurchaseList from './PurchaseList';
import PurchaseDialogs from './PurchaseDialogs';
import usePurchaseForm from './usePurchaseForm';
import usePurchaseList from './usePurchaseList';

// मुख्य page केवल form/list hooks को UI components से जोड़ता है।
export default function PurchaseEntry({ currentUser }) {
  const form = usePurchaseForm(currentUser);
  const list = usePurchaseList(currentUser);
  return <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="w-6 h-6 text-blue-600" /> Purchase Entry</h1>
        <p className="text-xs sm:text-sm text-slate-500">Manage raw material purchases and update stock levels</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={form.open} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md">+ New Purchase Entry</button>
        <button onClick={list.openLogs} className="bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2"><ManageHistoryIcon fontSize="small" /> View Logs</button>
      </div>
    </div>
    {form.notice && <p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-sm">{form.notice}</p>}
    <PurchaseList model={list} />
    <PurchaseForm model={form} />
    <PurchaseDialogs model={list} />
  </div>;
}
