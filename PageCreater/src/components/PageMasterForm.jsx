function inputType(type) {
  const t = String(type || "").toUpperCase();
  if (["BOOL", "BOOLEAN"].includes(t)) return "checkbox";
  if (["NUMERIC", "INT", "INTEGER", "DECIMAL", "FLOAT"].includes(t))
    return "number";
  if (["DATETIME", "DATE", "TIME"].includes(t))
    return t === "DATE" ? "date" : t === "TIME" ? "time" : "datetime-local";
  return "text";
}

export default function PageMasterForm({
  master,
  errors,
  onChange,
  schema = [],
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-5 text-lg font-semibold text-gray-800">Page Master</h2>
      <div className="grid grid-cols-12 gap-4">
        {schema.map((f) => {
          const name = f.FIELD_NAME || f.name;
          const label = f.TITLE || f.label || name;
          const type = f.DATA_TYPE || f.type;
          const choices = Array.isArray(f.OPTIONS)
            ? f.OPTIONS
            : Array.isArray(f.options)
              ? f.options
              : [];
          const error = errors?.[name];
          const isBool = ["BOOL", "BOOLEAN"].includes(
            String(type || "").toUpperCase(),
          );
          const isTextArea =
            f.CntProps && /rows\s*=|textarea/i.test(String(f.CntProps));
          const col = f.ColSize || f.COLSIZE || "col-span-12 lg:col-span-4";
          const colClass = String(col)
            .replace(/col-xs-/g, "col-span-")
            .replace(/col-sm-/g, "lg:col-span-");
          const value = master?.[name] ?? "";
          return (
            <div key={f.PAGE_PARAM_ID || name} className={colClass}>
              {!isBool && (
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {label}
                </label>
              )}
              {choices.length > 0 ? (
                <select
                  value={value}
                  onChange={(e) => onChange(name, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                >
                  <option value="">{f.PLACEHOLDER || ""}</option>
                  {choices.map((o, i) => (
                    <option
                      key={o.value ?? o.PropValue ?? o.id ?? i}
                      value={o.value ?? o.PropValue ?? o.id ?? o}
                    >
                      {o.label ?? o.PropName ?? o.text ?? o}
                    </option>
                  ))}
                </select>
              ) : isTextArea ? (
                <textarea
                  value={value}
                  onChange={(e) => onChange(name, e.target.value)}
                  rows={Number(
                    (String(f.CntProps).match(/rows\s*=\s*["']?(\d+)/i) ||
                      [])[1] || 3,
                  )}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                />
              ) : isBool ? (
                <label className="flex items-center gap-2 pt-7">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange(name, e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ) : (
                <input
                  type={inputType(type)}
                  value={value}
                  disabled={f.Disabled === true || f.Disabled === "True"}
                  maxLength={Number(f.MaxSize || 0) || undefined}
                  onChange={(e) => onChange(name, e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 outline-none ${error ? "border-red-500" : "border-gray-300"}`}
                />
              )}
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
