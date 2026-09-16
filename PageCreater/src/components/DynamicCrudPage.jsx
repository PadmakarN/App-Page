import { useEffect, useMemo, useState } from "react";
import DynamicField from "./dynamic/DynamicField";
import { deletePageRecord, getPageConfig, getPageRecord, getPageRecords, savePageRecord } from "../services/pageService";
import { isEmpty, isTrue, normalizeRecordResponse, normalizeRowsResponse } from "../utils/dynamicUtils";

const emptyObject = fields => Object.fromEntries((fields || []).map(f => [f.FIELD_NAME, defaultValue(f.DefaultValue, f.DATA_TYPE)]));
function defaultValue(v, type) {
  if (v === undefined || v === null || v === "") return String(type || "").toUpperCase() === "BOOL" ? false : "";
  if (v === "#datetime") return new Date().toISOString().slice(0,16);
  if (v === "#useridname" || v === "#userid") return "";
  try { if (String(type).toUpperCase() === "BOOL") return isTrue(v); } catch {}
  return v;
}

export default function DynamicCrudPage({ pageId = "2" }) {
  const [config,setConfig]=useState(null), [rows,setRows]=useState([]), [form,setForm]=useState({});
  const [editingId,setEditingId]=useState(null), [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true), [saving,setSaving]=useState(false), [error,setError]=useState(""), [message,setMessage]=useState("");

  useEffect(()=>{ loadConfig(); },[pageId]);
  async function loadConfig(){
    try { setLoading(true); setError(""); const r=await getPageConfig(pageId); const cfg={page:r.page||r,fields:r.fields||[]}; setConfig(cfg); setForm(emptyObject(cfg.fields)); await loadRows(cfg.page.PAGE_ID); }
    catch(e){setError(e.message||"Unable to load page configuration");} finally{setLoading(false)}
  }
  async function loadRows(id=config?.page?.PAGE_ID){
    if(!id)return;
    try{
      const r=await getPageRecords(id);
      setRows(normalizeRowsResponse(r));
    }catch(e){
      // Do not hide the runtime form just because the optional list endpoint is unavailable.
      setRows([]);
      setError(`Page loaded, but records could not be loaded. ${e.message || "Check the runtime records API."}`);
    }
  }

  const fields = useMemo(()=> (config?.fields||[]).filter(f=>String(f.ColSize||f.COLSIZE||"").toLowerCase() !== "hidden" && !isTrue(f.Disabled)),[config]);
  const keyName=config?.page?.PRIMARY_ID;
  const visibleColumns=useMemo(()=> (config?.fields||[]).filter(f=>!isTrue(f.Disabled) && String(f.ColSize||f.COLSIZE||"").toLowerCase()!=="hidden").slice(0,8),[config]);
  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase(); if(!q)return rows;
    return rows.filter(r=>Object.values(r||{}).some(v=>String(v??"").toLowerCase().includes(q)));
  },[rows,search]);

  function change(name,value){ setForm(p=>({...p,[name]:value})); setMessage(""); setError(""); }
  function newRecord(){ setEditingId(null); setForm(emptyObject(config.fields)); setError(""); setMessage(""); window.scrollTo({top:0,behavior:"smooth"}); }
  async function editRecord(id){ try{setError("");setMessage(""); const r=await getPageRecord(config.page.PAGE_ID,id); const data=normalizeRecordResponse(r)||{}; setEditingId(data[keyName] ?? id); setForm({...emptyObject(config.fields),...data}); window.scrollTo({top:0,behavior:"smooth"});}catch(e){setError(e.message||"Unable to load record")} }
  async function removeRecord(id){ if(!window.confirm(`Delete ${keyName} = ${id}?`))return; try{setError("");await deletePageRecord(config.page.PAGE_ID,id);setMessage("Record deleted successfully.");await loadRows(); if(String(editingId)===String(id))newRecord();}catch(e){setError(e.message||"Delete failed")} }
  async function submit(e){ e.preventDefault(); setError("");setMessage("");
    const errs={}; (config.fields||[]).forEach(f=>{if(!isTrue(f.MANDATORY)||isTrue(f.Disabled))return;const v=form[f.FIELD_NAME];if(String(f.DATA_TYPE).toUpperCase()==="BOOL")return;if(isEmpty(v))errs[f.FIELD_NAME]=`${f.TITLE} is required`;if(f.MaxSize>0&&String(v).length>Number(f.MaxSize))errs[f.FIELD_NAME]=`${f.TITLE} cannot exceed ${f.MaxSize}`});
    if(Object.keys(errs).length){setError(Object.values(errs)[0]);return;}
    try{setSaving(true); const payload=await serializeForm(form); const r=await savePageRecord(config.page.PAGE_ID,payload,editingId); setMessage(r.message|| (editingId?"Record updated successfully.":"Record created successfully.")); const returned=normalizeRecordResponse(r); if(returned?.[keyName])setEditingId(returned[keyName]); await loadRows();}
    catch(e){setError(e.message||"Save failed")}finally{setSaving(false)}
  }

  if(loading)return <FullState text={`Loading dynamic page ${pageId}...`}/>;
  if(!config)return <FullState error={error||`Unable to load page ${pageId}. Check GET /api/app-page/${pageId}`} />;
  return <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5 shadow-sm">
        <div><h1 className="text-2xl font-bold text-slate-800">{config.page.TITLE}</h1><p className="text-sm text-slate-500">{config.page.PAGE_NAME} · {config.page.TABLE_NAME}</p></div>
        <div className="flex gap-2"><button onClick={()=>loadRows()} className="rounded-lg border bg-white px-4 py-2 text-sm">Refresh</button><button onClick={newRecord} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ New</button></div>
      </header>
      {(error||message)&&<div className={`rounded-lg border p-3 text-sm ${error?"border-red-200 bg-red-50 text-red-700":"border-green-200 bg-green-50 text-green-700"}`}>{error||message}</div>}

      <section className="rounded-xl bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? `Edit ${keyName}: ${editingId}` : "New Record"}</h2>{editingId&&<button onClick={newRecord} className="text-sm text-blue-600">New record</button>}</div>
        <form onSubmit={submit}><div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">{fields.map(f=><div key={f.PAGE_PARAM_ID} className={colClass(f)}><DynamicField field={f} value={form[f.FIELD_NAME]} error={""} formData={form} onChange={change}/></div>)}</div>
          <div className="mt-6 flex gap-2 border-t pt-5"><button disabled={saving} className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white disabled:opacity-50">{saving?"Saving...":editingId?"Update":"Save"}</button><button type="button" onClick={newRecord} className="rounded-lg border px-6 py-2.5">Reset</button></div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><h2 className="text-lg font-semibold">Records <span className="text-sm font-normal text-slate-400">({filtered.length})</span></h2><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records..." className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm"/></div>
        <div className="overflow-auto"><table className="min-w-full"><thead className="bg-slate-50"><tr>{visibleColumns.map(f=><th key={f.PAGE_PARAM_ID} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{f.TITLE||f.FIELD_NAME}</th>)}<th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={r[keyName]??i} className="border-t hover:bg-slate-50">{visibleColumns.map(f=><td key={f.PAGE_PARAM_ID} className="max-w-[280px] truncate px-4 py-3 text-sm text-slate-700">{formatCell(r[f.FIELD_NAME])}</td>)}<td className="whitespace-nowrap px-4 py-3 text-right"><button onClick={()=>editRecord(r[keyName])} className="mr-2 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Edit</button><button onClick={()=>removeRecord(r[keyName])} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">Delete</button></td></tr>)}{!filtered.length&&<tr><td colSpan={visibleColumns.length+1} className="px-4 py-12 text-center text-sm text-slate-400">No records found.</td></tr>}</tbody></table></div>
      </section>
    </div>
  </div>;
}
function colClass(f){const s=String(f.ColSize||f.COLSIZE||"");if(s.includes("col-xs-12"))return "lg:col-span-12";const m=s.match(/col-(?:sm|md|lg)-(\d+)/);return `lg:col-span-${m?m[1]:6}`;}
function formatCell(v){if(Array.isArray(v))return v.join(", ");if(typeof v==="boolean")return v?"Yes":"No";return v??"";}
async function serializeForm(data){const out={...data};for(const [k,v] of Object.entries(out)){if(v instanceof File){out[k]=await fileToObject(v)}}return out;}
function fileToObject(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type,data:String(r.result).split(",")[1]||""});r.onerror=reject;r.readAsDataURL(file)})}
function FullState({text,error}){return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6"><div className={`rounded-xl bg-white p-8 shadow ${error?"text-red-600":"text-slate-600"}`}>{error||text}</div></div>}
