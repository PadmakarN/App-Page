import { useEffect, useState } from "react";
import LookupPopup from "./LookupPopup";
import { getDDLLabelColumn, getDDLValueColumn } from "../../utils/dynamicUtils";

export default function AjaxSelect({ field, value, error, onChange, formData = {} }) {
  const [open, setOpen] = useState(false); const [label, setLabel] = useState(value ?? "");
  useEffect(() => { if (value === null || value === undefined || value === "") setLabel(""); }, [value]);
  return <>
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-slate-700">{field.TITLE}{field.MANDATORY && <span className="ml-1 text-red-500">*</span>}</label>
      <div className="flex gap-2">
        <input readOnly value={label} disabled={field.Disabled} onClick={() => !field.Disabled && setOpen(true)} className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-slate-300"}`} />
        <button type="button" disabled={field.Disabled} onClick={() => setOpen(true)} className="rounded-lg border bg-white px-4">🔍</button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
    <LookupPopup open={open} field={field} formData={formData} onClose={() => setOpen(false)} onSelect={row => {
      const valueColumn = getDDLValueColumn(field); const labelColumn = getDDLLabelColumn(field);
      onChange(field.FIELD_NAME, row[valueColumn] ?? row.value ?? ""); setLabel(row[labelColumn] ?? row.label ?? row[valueColumn] ?? ""); setOpen(false);
    }} />
  </>;
}
