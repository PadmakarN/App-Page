export default function TextInput({ field, value, error, onChange, inputType = "text", textarea = false }) {
  const common = {
    id: field.FIELD_NAME, name: field.FIELD_NAME, disabled: field.Disabled,
    maxLength: Number(field.MaxSize || 0) > 0 ? Number(field.MaxSize) : undefined,
    placeholder: field.TOOLTIPS || "", value: value ?? "",
    onChange: e => onChange(field.FIELD_NAME, e.target.value),
    className: `w-full rounded-lg border px-3 py-2.5 text-sm outline-none ${error ? "border-red-500" : "border-slate-300"} ${field.Disabled ? "bg-slate-100" : "bg-white"}`,
  };
  return <div className="w-full">
    <label htmlFor={field.FIELD_NAME} className="mb-2 block text-sm font-medium text-slate-700">{field.TITLE}{field.MANDATORY && <span className="ml-1 text-red-500">*</span>}</label>
    {textarea ? <textarea {...common} rows={Number((String(field.CntProps || "").match(/rows=[\"'](\d+)/i) || [])[1] || 3)} /> : <input {...common} type={inputType} />}
    {field.TOOLTIPS && <p className="mt-1 text-xs text-slate-500">{field.TOOLTIPS}</p>}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}
