import { isTrue } from "../../utils/dynamicUtils";
export default function RadioInput({ field, value, onChange, error }) {
  const checked = isTrue(value);
  return <div className="w-full">
    <label className="mb-3 block text-sm font-medium text-slate-700">{field.TITLE}{field.MANDATORY && <span className="ml-1 text-red-500">*</span>}</label>
    <label className="inline-flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 bg-white">
      <input type="checkbox" checked={checked} disabled={field.Disabled} onChange={e => onChange(field.FIELD_NAME, e.target.checked)} className="h-4 w-4" />
      <span className="text-sm text-slate-700">{field.TITLE}</span>
    </label>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}
