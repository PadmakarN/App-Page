import { useEffect, useMemo, useState } from "react";
import PageMasterForm from "../components/PageMasterForm";
import PageDetailGrid from "../components/PageDetailGrid";
import PagePreviewModal from "../components/PagePreviewModal";
import {
  deletePageDefinition,
  getPageConfig,
  getPageDesignerMetadata,
  listPageConfigs,
  savePageDefinition,
} from "../services/pageService";

const emptyDetail = () => ({
  _rowId: `${Date.now()}-${Math.random()}`,
  PAGE_PARAM_ID: null,
  PAGE_ID: null,
  SEQNO: 1,
  GROUPNAME: "",
  GROUPSEQ: 0,
  FIELD_NAME: "",
  TITLE: "",
  LogReq: false,
  PRIMARY_KEY: false,
  MANDATORY: false,
  DATA_TYPE: "",
  Validation: "",
  VALIDATION: "",
  DDLNAME: "",
  DDLFIELDS: "",
  DDLWHERE: "",
  Ajax: false,
  TOOLTIPS: "",
  COLSIZE: "",
  ColSize: "",
  Disabled: false,
  DefaultValue: "",
  MaxSize: "",
  CssClass: "",
  CntProps: "",
  NEW_SCRIPT: "",
  New_Script: "",
  Html_Script: "",
  RefCol: false,
  TitleSize: "",
});

function normalizeSchema(r) {
  return (
    r?.masterFields || r?.masterSchema || r?.pageMasterFields || r?.fields || []
  );
}
function normalizeOptions(r, key) {
  return r?.[key] || r?.metadata?.[key] || [];
}
function blankMaster(schema) {
  return Object.fromEntries(
    (schema || []).map((f) => [f.FIELD_NAME, f.DefaultValue ?? ""]),
  );
}
function cleanDetail(r, pageId, i) {
  const { _rowId, ...x } = r;
  return { ...x, PAGE_ID: pageId, SEQNO: Number(x.SEQNO) || i + 1 };
}

export default function DynamicPageManagement() {
  const [schema, setSchema] = useState([]),
        [meta, setMeta] = useState({}),
        [pages, setPages] = useState([]);
  const [master, setMaster] = useState({}),
        [details, setDetails] = useState([]),
        [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({}),
        [busy, setBusy] = useState(false),
        [loading, setLoading] = useState(true),
        [msg, setMsg] = useState(""),
        [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false),
        [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    bootstrap();
  }, []);
  async function bootstrap() {
    try {
      setLoading(true);
      setError("");
      const [m, p] = await Promise.all([
        getPageDesignerMetadata(),
        listPageConfigs(),
      ]);
      setMeta(m);
      setSchema(normalizeSchema(m));
      setPages(p?.pages || p?.data || p?.rows || []);
      newPage(normalizeSchema(m));
    } catch (e) {
      setError(e.message || "Unable to load designer metadata/pages");
    } finally {
      setLoading(false);
    }
  }
  function newPage(s = schema) {
    setEditing(null);
    setMaster(blankMaster(s));
    setDetails([]);
    setErrors({});
    setMsg("");
    setError("");
  }
  async function editPage(id) {
    try {
      setBusy(true);
      setError("");
      const r = await getPageConfig(id);
      const p = r.page || r;
      setEditing(p.PAGE_ID);
      setMaster({ ...blankMaster(schema), ...p });
      setDetails(
        (r.fields || []).map((x, i) => ({
          _rowId: `${x.PAGE_PARAM_ID || Date.now()}-${i}`,
          ...x,
        })),
      );
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.message || "Unable to load page");
    } finally {
      setBusy(false);
    }
  }
  async function removePage(id) {
    if (!window.confirm("Delete this page configuration?")) return;
    try {
      setBusy(true);
      await deletePageDefinition(id);
      setMsg("Page deleted successfully.");
      await refreshPages();
      if (String(editing) === String(id)) newPage();
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }
  async function refreshPages() {
    const r = await listPageConfigs();
    setPages(r?.pages || r?.data || r?.rows || []);
  }
  function addField() {
    setDetails((d) => [...d, { ...emptyDetail(), SEQNO: d.length + 1 }]);
  }
  function changeDetail(id, k, v) {
    setDetails((d) => d.map((x) => (x._rowId === id ? { ...x, [k]: v } : x)));
  }
  function deleteField(id) {
    setDetails((d) =>
      d.filter((x) => x._rowId !== id).map((x, i) => ({ ...x, SEQNO: i + 1 })),
    );
  }
  function validate() {
    const e = {};
    schema.forEach((f) => {
      if (
        (f.MANDATORY === true || f.MANDATORY === "True") &&
        !master[f.FIELD_NAME] &&
        !(String(f.DATA_TYPE).toUpperCase() === "BOOL")
      ) {
        e[f.FIELD_NAME] = `${f.TITLE || f.FIELD_NAME} is required`;
      }
    });
    details.forEach((d, i) => {
      if (!d.FIELD_NAME) e[`detail_${i}_FIELD_NAME`] = "Field Name is required";
      if (!d.TITLE) e[`detail_${i}_TITLE`] = "Title is required";
      if (!d.DATA_TYPE) e[`detail_${i}_DATA_TYPE`] = "Data Type is required";
    });
    setErrors(e);
    return !Object.keys(e).length;
  }
  async function save() {
    if (!validate()) return;
    try {
      setBusy(true);
      setError("");
      const payload = {
        master: { ...master, PAGE_ID: editing ?? master.PAGE_ID ?? null },
        details: details.map((d, i) =>
          cleanDetail(d, editing ?? master.PAGE_ID ?? null, i),
        ),
        htmlScript: master.Html_Script || "",
        htmlButtons: master.HTMLButtons || "",
      };
      const r = await savePageDefinition(payload);
      setMsg(r.message || "Page saved successfully.");
      await refreshPages();
      if (r.pageId) await editPage(r.pageId);
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }
  function preview() {
    setPreviewData({
      page: master,
      fields: details.map((d, i) => cleanDetail(d, master.PAGE_ID, i)),
      htmlScript: master.Html_Script || "",
      htmlButtons: master.HTMLButtons || "",
    });
    setPreviewOpen(true);
  }

  const typeOptions = normalizeOptions(meta, "dataTypes");
  const groupOptions = normalizeOptions(meta, "groups");
  const colOptions = normalizeOptions(meta, "columnSizes");
  const pageRows = useMemo(() => pages, [pages]);
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        Loading designer metadata...
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-[1700px] space-y-4">
        <header className="rounded-lg bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                Dynamic Page Management
              </h1>
              <p className="text-sm text-gray-500">
                Database-driven Page Master + Page Detail
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => newPage()}
                className="rounded-md border px-4 py-2 text-sm"
              >
                New
              </button>
              <button
                onClick={preview}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Preview
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? "Saving..." : editing ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </header>
        {(error || msg) && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
          >
            {error || msg}
          </div>
        )}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex justify-between">
            <h2 className="font-semibold">Pages</h2>
            <button onClick={refreshPages} className="text-sm text-blue-600">
              Refresh
            </button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "PAGE_ID",
                    "PAGE_NAME",
                    "TITLE",
                    "TABLE_NAME",
                    "PRIMARY_ID",
                    "STATUS",
                    "Action",
                  ].map((x) => (
                    <th
                      key={x}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500"
                    >
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p, i) => (
                  <tr key={p.PAGE_ID ?? i} className="border-t">
                    {[
                      "PAGE_ID",
                      "PAGE_NAME",
                      "TITLE",
                      "TABLE_NAME",
                      "PRIMARY_ID",
                      "STATUS",
                    ].map((k) => (
                      <td key={k} className="px-4 py-3 text-sm">
                        {p[k]}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => editPage(p.PAGE_ID)}
                        className="mr-2 rounded bg-blue-50 px-3 py-1 text-xs text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removePage(p.PAGE_ID)}
                        className="rounded bg-red-50 px-3 py-1 text-xs text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-8 text-center text-sm text-slate-400"
                    >
                      No pages found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <PageMasterForm
          master={master}
          errors={errors}
          onChange={(k, v) => setMaster((x) => ({ ...x, [k]: v }))}
          schema={schema}
        />
        <PageDetailGrid
          details={details}
          errors={errors}
          onChange={changeDetail}
          onAdd={addField}
          onDelete={deleteField}
          metadata={{
            dataTypes: typeOptions,
            groups: groupOptions,
            columnSizes: colOptions,
          }}
        />
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold">
            HTML Script
          </label>
          <textarea
            value={master.Html_Script || ""}
            onChange={(e) =>
              setMaster((x) => ({ ...x, Html_Script: e.target.value }))
            }
            rows={8}
            className="w-full rounded border p-3 font-mono text-sm"
          />
        </div>
        <PagePreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          previewData={previewData}
        />
      </div>
    </div>
  );
}
