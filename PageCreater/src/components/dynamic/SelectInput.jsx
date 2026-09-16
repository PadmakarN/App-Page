import { useEffect, useState } from "react";
import { getDropdownOptions } from "../../services/pageService";

export default function SelectInput({ field, value, error, onChange, formData = {}, multiple = false }) {
  const [options, setOptions] = useState([]); const [loading, setLoading] = useState(false);
  const multi = multiple || String(field.CntProps || "").toLowerCase().includes("multiple");
  useEffect(() => { let alive = true; (async () => { try { setLoading(true); const r = await getDropdownOptions(field, formData); if (alive) setOptions(r.options || r.rows || []); } catch(e) { console.error(e); if(alive) setOptions([]); } finally { if(alive) setLoading(false); } })(); return () => { alive = false; }; }, [field.DDLNAME, field.DDLFIELDS, field.DDLWHERE, JSON.stringify(formData)]);
  const normalized = options.map((o, i) => ({ value: o.value ?? o.id ?? o.Value ?? o.ID ?? "", label: o.label ?? o.text ?? o.name ?? o.Label ?? o.Name ?? String(o.value ?? o.id ?? ""), key: i }));
  const current = multi ? (Array.isArray(value) ? value : String(value || "").split(",").filter(Boolean)) : (value ?? "");
  return <div className="w-full">
    <label className="mb-2 block text-sm font-medium text-slate-700">{field.TITLE}{field.MANDATORY && <span className="ml-1 text-red-500">*</span>}</label>
    <select multiple={multi} value={current} disabled={field.Disabled} onChange={e => onChange(field.FIELD_NAME, multi ? Array.from(e.target.selectedOptions).map(o => o.value) : e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-slate-300"}`}>
      {!multi && <option value="">{loading ? "Loading..." : "Select"}</option>}
      {normalized.map(o => <option key={o.key} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}
