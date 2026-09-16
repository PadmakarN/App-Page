import { useState } from "react";

function PageDetailGrid({
  details,
  errors,
  onChange,
  onAdd,
  onDelete,
  metadata = {},
}) {
  const dataTypes = metadata.dataTypes || [];
  const groups = metadata.groups || [];
  const columnSizes = metadata.columnSizes || [];
  const [expandedRow, setExpandedRow] = useState(null);

  const getError = (row, index, fieldName) => {
    return (
      errors?.[row._rowId]?.[fieldName] ||
      errors?.[`detail_${index}_${fieldName}`] ||
      ""
    );
  };

  const inputClass = (error = "") =>
    `w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition
     ${
       error
         ? "border-red-400 ring-2 ring-red-100"
         : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
     }`;

  const smallInputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const update = (rowId, field, value) => {
    onChange(rowId, field, value);
  };

  const toggleRow = (rowId) => {
    setExpandedRow((prev) => (prev === rowId ? null : rowId));
  };

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-sm">
                ☷
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Form Field Designer
                </h2>

                <p className="text-xs text-slate-500">
                  Configure fields, validation, DDL, AJAX and UI properties
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* FIELD COUNT */}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Fields
              </div>
              <div className="text-lg font-bold text-slate-700">
                {details.length}
              </div>
            </div>
            {/* ADD */}
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow"
            >
              <span className="text-lg leading-none">+</span>
              Add Field
            </button>
          </div>
        </div>
      </div>
      {/* =====================================================
          COLUMN HEADER
      ===================================================== */}
      <div className="hidden border-b border-slate-200 bg-slate-100 px-4 py-2 lg:grid lg:grid-cols-[55px_1fr_1fr_140px_130px_120px_110px_90px] lg:gap-3">
        <div className="text-[11px] font-bold uppercase text-slate-500">#</div>
        <div className="text-[11px] font-bold uppercase text-slate-500">
          Field Name
        </div>
        <div className="text-[11px] font-bold uppercase text-slate-500">
          Title
        </div>
        <div className="text-[11px] font-bold uppercase text-slate-500">
          Data Type
        </div>
        <div className="text-[11px] font-bold uppercase text-slate-500">
          Group
        </div>
        <div className="text-[11px] font-bold uppercase text-slate-500">
          Column Size
        </div>
        <div className="text-[11px] font-bold uppercase text-slate-500">
          Selection
        </div>
        <div className="text-center text-[11px] font-bold uppercase text-slate-500">
          Action
        </div>
      </div>

      {/* =====================================================
          EMPTY
      ===================================================== */}
      {details.length === 0 && (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            ☷
          </div>

          <h3 className="font-semibold text-slate-700">No fields configured</h3>

          <p className="mt-1 text-sm text-slate-400">
            Add your first form field to start designing the page.
          </p>

          <button
            type="button"
            onClick={onAdd}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add First Field
          </button>
        </div>
      )}

      {/* =====================================================
          FIELD ROWS
      ===================================================== */}
      <div className="divide-y divide-slate-100">
        {details.map((row, index) => {
          const isExpanded = expandedRow === row._rowId;
          const fieldError = getError(row, index, "FIELD_NAME");
          const titleError = getError(row, index, "TITLE");
          const dataTypeError = getError(row, index, "DATA_TYPE");

          return (
            <div
              key={row._rowId}
              className={`transition ${
                isExpanded ? "bg-blue-50/30" : "bg-white hover:bg-slate-50/70"
              }`}
            >
              {/* =================================================
                  MAIN ROW
              ================================================= */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[55px_1fr_1fr_140px_130px_120px_110px_90px]">
                  {/* SEQ */}
                  <div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                      {index + 1}
                    </div>
                  </div>

                  {/* FIELD NAME */}
                  <div>
                    <input
                      type="text"
                      value={row.FIELD_NAME || ""}
                      onChange={(e) =>
                        update(row._rowId, "FIELD_NAME", e.target.value)
                      }
                      placeholder="FIELD_NAME"
                      className={inputClass(fieldError)}
                    />

                    {fieldError && (
                      <p className="mt-1 text-xs text-red-500">{fieldError}</p>
                    )}
                  </div>

                  {/* TITLE */}
                  <div>
                    <input
                      type="text"
                      value={row.TITLE || ""}
                      onChange={(e) =>
                        update(row._rowId, "TITLE", e.target.value)
                      }
                      placeholder="Field Title"
                      className={inputClass(titleError)}
                    />

                    {titleError && (
                      <p className="mt-1 text-xs text-red-500">{titleError}</p>
                    )}
                  </div>

                  {/* DATA TYPE - DB metadata only */}
                  <div>
                    <select
                      value={row.DATA_TYPE || ""}
                      onChange={(e) =>
                        update(row._rowId, "DATA_TYPE", e.target.value)
                      }
                      className={inputClass(dataTypeError)}
                    >
                      <option value=""></option>
                      {dataTypes.map((o, i) => (
                        <option
                          key={o.value ?? o.DATA_TYPE ?? o.id ?? i}
                          value={o.value ?? o.DATA_TYPE ?? o.id ?? ""}
                        >
                          {o.label ?? o.NAME ?? o.DATA_TYPE ?? o.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* GROUP - DB metadata only */}
                  <div>
                    <select
                      value={row.GROUPNAME || ""}
                      onChange={(e) =>
                        update(row._rowId, "GROUPNAME", e.target.value)
                      }
                      className={smallInputClass}
                    >
                      <option value=""></option>
                      {groups.map((o, i) => (
                        <option
                          key={o.value ?? o.GROUPNAME ?? o.id ?? i}
                          value={o.value ?? o.GROUPNAME ?? o.id ?? ""}
                        >
                          {o.label ?? o.NAME ?? o.GROUPNAME ?? o.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* COL SIZE - DB metadata only */}
                  <div>
                    <select
                      value={row.COLSIZE || row.ColSize || ""}
                      onChange={(e) => {
                        update(row._rowId, "COLSIZE", e.target.value);
                        update(row._rowId, "ColSize", e.target.value);
                      }}
                      className={smallInputClass}
                    >
                      <option value=""></option>
                      {columnSizes.map((o, i) => (
                        <option
                          key={o.value ?? o.COLSIZE ?? o.id ?? i}
                          value={o.value ?? o.COLSIZE ?? o.id ?? ""}
                        >
                          {o.label ?? o.NAME ?? o.COLSIZE ?? o.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SELECTION */}
                  <div>
                    {row.Ajax ? (
                      <span className="inline-flex items-center rounded-lg bg-purple-100 px-3 py-2 text-xs font-bold text-purple-700">
                        ⚡ AJAX
                      </span>
                    ) : row.DDLNAME ? (
                      <span className="inline-flex items-center rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700">
                        ▾ DDL
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                        Text
                      </span>
                    )}
                  </div>

                  {/* ACTION */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title={isExpanded ? "Collapse" : "Configure"}
                      onClick={() => toggleRow(row._rowId)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition ${
                        isExpanded
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      }`}
                    >
                      ⚙
                    </button>

                    <button
                      type="button"
                      title="Delete"
                      onClick={() => onDelete(row._rowId)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* QUICK FLAGS */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Flag active={row.MANDATORY} label="Required" />

                  <Flag active={row.PRIMARY_KEY} label="Primary" />

                  <Flag active={row.Disabled} label="Disabled" />

                  <Flag active={row.LogReq} label="Log" />

                  {row.Ajax && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold text-purple-700">
                      AJAX
                    </span>
                  )}

                  {row.DDLNAME && !row.Ajax && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                      DDL
                    </span>
                  )}
                </div>
              </div>

              {/* =================================================
                  EXPANDED CONFIGURATION
              ================================================= */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-5">
                  {/* BASIC */}
                  <SectionTitle
                    icon="▦"
                    title="Field Configuration"
                    description="Basic field and layout properties"
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FieldInput
                      label="Sequence"
                      value={row.SEQNO}
                      type="number"
                      onChange={(value) => update(row._rowId, "SEQNO", value)}
                    />

                    <FieldInput
                      label="Row Name"
                      value={row.GROUPNAME}
                      onChange={(value) =>
                        update(row._rowId, "GROUPNAME", value)
                      }
                    />

                    <FieldInput
                      label="Row Sequence"
                      value={row.GROUPSEQ}
                      type="number"
                      onChange={(value) =>
                        update(row._rowId, "GROUPSEQ", value)
                      }
                    />

                    <FieldInput
                      label="Max Size"
                      value={row.MaxSize}
                      type="number"
                      onChange={(value) => update(row._rowId, "MaxSize", value)}
                    />

                    <FieldInput
                      label="Title Size"
                      value={row.TitleSize}
                      onChange={(value) =>
                        update(row._rowId, "TitleSize", value)
                      }
                    />

                    <FieldInput
                      label="CSS Class"
                      value={row.CssClass}
                      onChange={(value) =>
                        update(row._rowId, "CssClass", value)
                      }
                    />

                    <FieldInput
                      label="Reference Column"
                      value={row.RefCol}
                      onChange={(value) => update(row._rowId, "RefCol", value)}
                    />

                    <FieldInput
                      label="Default Value"
                      value={row.DefaultValue}
                      onChange={(value) =>
                        update(row._rowId, "DefaultValue", value)
                      }
                    />
                  </div>

                  {/* FLAGS */}
                  <div className="mt-6">
                    <SectionTitle
                      icon="✓"
                      title="Field Behaviour"
                      description="Validation and field state"
                    />

                    <div className="flex flex-wrap gap-3">
                      <Toggle
                        label="Mandatory"
                        checked={row.MANDATORY}
                        onChange={(value) =>
                          update(row._rowId, "MANDATORY", value)
                        }
                      />

                      <Toggle
                        label="Primary Key"
                        checked={row.PRIMARY_KEY}
                        onChange={(value) =>
                          update(row._rowId, "PRIMARY_KEY", value)
                        }
                      />

                      <Toggle
                        label="Disabled"
                        checked={row.Disabled}
                        onChange={(value) =>
                          update(row._rowId, "Disabled", value)
                        }
                      />

                      <Toggle
                        label="Log Required"
                        checked={row.LogReq}
                        onChange={(value) =>
                          update(row._rowId, "LogReq", value)
                        }
                      />
                    </div>
                  </div>

                  {/* VALIDATION */}
                  <div className="mt-6">
                    <SectionTitle
                      icon="✓"
                      title="Validation"
                      description="Configure validation rules for this field"
                    />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <FieldInput
                        label="Validation"
                        value={row.Validation}
                        placeholder="e.g. required,email,numeric"
                        onChange={(value) =>
                          update(row._rowId, "Validation", value)
                        }
                      />

                      <FieldInput
                        label="Tool Tips"
                        value={row.TOOLTIPS}
                        placeholder="Help text shown to user"
                        onChange={(value) =>
                          update(row._rowId, "TOOLTIPS", value)
                        }
                      />
                    </div>
                  </div>

                  {/* =================================================
                      SELECTION
                  ================================================= */}
                  <div className="mt-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <SectionTitle
                        icon="⚡"
                        title="Dynamic Selection"
                        description="Normal DDL or AJAX based selection"
                      />

                      <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => update(row._rowId, "Ajax", false)}
                          className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                            !row.Ajax
                              ? "bg-blue-600 text-white"
                              : "text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          ▾ Normal DDL
                        </button>

                        <button
                          type="button"
                          onClick={() => update(row._rowId, "Ajax", true)}
                          className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                            row.Ajax
                              ? "bg-purple-600 text-white"
                              : "text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          ⚡ AJAX
                        </button>
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border p-5 ${
                        row.Ajax
                          ? "border-purple-200 bg-purple-50/50"
                          : "border-blue-200 bg-blue-50/40"
                      }`}
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            row.Ajax
                              ? "bg-purple-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {row.Ajax ? "⚡" : "▾"}
                        </span>

                        <div>
                          <h4 className="text-sm font-bold text-slate-700">
                            {row.Ajax
                              ? "AJAX Selection"
                              : "Normal DDL Selection"}
                          </h4>

                          <p className="text-xs text-slate-500">
                            {row.Ajax
                              ? "Configure dynamic search / AJAX source"
                              : "Configure database driven dropdown"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <FieldInput
                          label={row.Ajax ? "API / SP / Source" : "DDL Table"}
                          value={row.DDLNAME}
                          placeholder={
                            row.Ajax ? "API / SP name" : "Table name"
                          }
                          onChange={(value) =>
                            update(row._rowId, "DDLNAME", value)
                          }
                        />

                        <FieldInput
                          label="Value / Display Fields"
                          value={row.DDLFIELDS}
                          placeholder="ID,NAME"
                          onChange={(value) =>
                            update(row._rowId, "DDLFIELDS", value)
                          }
                        />

                        <FieldInput
                          label="Where / Filter"
                          value={row.DDLWHERE}
                          placeholder="STATUS = 'A'"
                          onChange={(value) =>
                            update(row._rowId, "DDLWHERE", value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* HTML PROPERTIES */}
                  <div className="mt-6">
                    <SectionTitle
                      icon="⌘"
                      title="HTML Properties"
                      description="Additional HTML attributes and component properties"
                    />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <TextAreaField
                        label="HTML Properties"
                        value={row.CntProps}
                        placeholder='class="form-control" data-example="value"'
                        onChange={(value) =>
                          update(row._rowId, "CntProps", value)
                        }
                      />

                      <TextAreaField
                        label="CSS Class"
                        value={row.CssClass}
                        placeholder="custom-field-class"
                        onChange={(value) =>
                          update(row._rowId, "CssClass", value)
                        }
                      />
                    </div>
                  </div>

                  {/* SCRIPTS */}
                  <div className="mt-6">
                    <SectionTitle
                      icon="</>"
                      title="Scripts"
                      description="Field level New Entry and HTML scripts"
                    />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <TextAreaField
                        label="New Entry Script"
                        value={row.New_Script}
                        mono
                        rows={7}
                        placeholder="// New entry script"
                        onChange={(value) =>
                          update(row._rowId, "New_Script", value)
                        }
                      />

                      <TextAreaField
                        label="HTML Script"
                        value={row.Html_Script}
                        mono
                        rows={7}
                        placeholder="<div>...</div>"
                        onChange={(value) =>
                          update(row._rowId, "Html_Script", value)
                        }
                      />
                    </div>
                  </div>

                  {/* SYSTEM INFO */}
                  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                      System Information
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <Info label="PAGE_PARAM_ID" value={row.PAGE_PARAM_ID} />

                      <Info label="PAGE_ID" value={row.PAGE_ID} />

                      <Info label="SEQNO" value={row.SEQNO} />

                      <Info label="GROUPSEQ" value={row.GROUPSEQ} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      {details.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {details.length}
            </span>{" "}
            field{details.length !== 1 ? "s" : ""} configured
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
          >
            + Add Another Field
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function SectionTitle({ icon, title, description }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>

        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder = "",
  mono = false,
  rows = 5,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
          mono ? "font-mono text-xs" : ""
        }`}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 transition ${
        checked
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>

      <span
        className={`text-xs font-bold ${
          checked ? "text-blue-700" : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function Flag({ active, label }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-400"
      }`}
    >
      {active ? "✓ " : "○ "}
      {label}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate text-xs font-semibold text-slate-600">
        {value ?? "-"}
      </div>
    </div>
  );
}

export default PageDetailGrid;
