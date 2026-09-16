import { useEffect, useState } from "react";
import { lookupField } from "../../services/pageService";
import { getDDLLabelColumn, getDDLValueColumn } from "../../utils/dynamicUtils";

export default function LookupPopup({
  open,
  field,
  formData = {},
  onClose,
  onSelect,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await lookupField(field, formData, search);
        if (alive) setRows(r.rows || r.options || []);
      } catch (e) {
        console.error(e);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, field.DDLNAME, field.DDLFIELDS, field.DDLWHERE, search]);
  if (!open) return null;
  const labelCol = getDDLLabelColumn(field),
    valueCol = getDDLValueColumn(field);
  const cols = [
    ...new Set([
      labelCol,
      valueCol,
      ...String(field.DDLFIELDS || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ]),
  ];
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Select {field.TITLE}</h3>
          <button onClick={onClose} className="text-xl">
            ×
          </button>
        </div>
        <div className="p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="mb-4 w-full rounded-lg border px-3 py-2"
          />
          {loading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c}
                        className="border-b bg-slate-50 px-3 py-2 text-left text-xs"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      onDoubleClick={() => onSelect(r)}
                      className="cursor-pointer hover:bg-blue-50"
                    >
                      {cols.map((c) => (
                        <td key={c} className="border-b px-3 py-2 text-sm">
                          {r[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex justify-end border-t p-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
