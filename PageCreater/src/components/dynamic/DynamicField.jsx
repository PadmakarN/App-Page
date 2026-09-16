import TextInput from "./TextInput";
import SelectInput from "./SelectInput";
import AjaxSelect from "./AjaxSelect";
import RadioInput from "./RadioInput";

export default function DynamicField({ field, value, error, onChange, formData }) {
  const type = String(field.DATA_TYPE || "STRING").toUpperCase();
  const props = { field, value, error, onChange, formData };

  if (field.Ajax === true || field.Ajax === 1 || field.Ajax === "true") return <AjaxSelect {...props} />;
  if (field.DDLNAME) return <SelectInput {...props} />;
  if (type === "BOOL" || type === "BOOLEAN") return <RadioInput {...props} />;
  if (type === "IMAGE") return <ImageInput {...props} />;
  if (field.CntProps?.includes("rows=") || field.CntProps?.includes("multiple")) {
    if (field.CntProps.includes("multiple")) return <SelectInput {...props} multiple />;
    return <TextInput {...props} textarea />;
  }
  return <TextInput {...props} inputType={type === "NUMERIC" || type === "INT" ? "number" : type === "DATE" ? "date" : type === "DATETIME" ? "datetime-local" : "text"} />;
}

function ImageInput({ field, value, onChange, error }) {
  return <div className="w-full">
    <label className="mb-2 block text-sm font-medium text-slate-700">{field.TITLE}{field.MANDATORY && <span className="ml-1 text-red-500">*</span>}</label>
    {value && <div className="mb-2 rounded-lg border bg-slate-50 p-2 text-xs text-slate-600">Current: {value}</div>}
    <input type="file" accept="image/*" disabled={field.Disabled} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" onChange={e => onChange(field.FIELD_NAME, e.target.files?.[0] || null)} />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}
