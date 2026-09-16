import express from "express";
import cors from "cors";
import "dotenv/config";

import {
  deletePageConfig,
  deletePageData,
  getDropdown,
  getLookup,
  getPageConfig,
  getPageData,
  getPageRecords,
  listPageConfigs,
  getDesignerMetadata,
  savePageConfig,
  savePageData,
} from "./pageRepository.js";
import { getErrorMessage } from "./helpers.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.disable("x-powered-by");
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

app.get("/api/health", asyncHandler(async (_req, res) => {
  res.json({ success: true, message: "PageCreator API is running" });
}));

// ---------------- PAGE DESIGNER ----------------
app.get("/api/app-page/metadata", asyncHandler(async (_req, res) => {
  res.json(await getDesignerMetadata());
}));

app.get("/api/app-page/list", asyncHandler(async (_req, res) => {
  res.json({ success: true, rows: await listPageConfigs() });
}));

// Backward compatible alias.
app.get("/api/app-page", asyncHandler(async (_req, res) => {
  res.json({ success: true, rows: await listPageConfigs() });
}));

app.get("/api/app-page/:pageId", asyncHandler(async (req, res) => {
  const page = await getPageConfig(req.params.pageId);
  if (!page) return res.status(404).json({ success: false, message: "Page not found" });
  res.json(page);
}));

app.post("/api/app-page/save", asyncHandler(async (req, res) => {
  if (!req.body?.master) {
    return res.status(400).json({ success: false, message: "master is required" });
  }
  res.json({ success: true, ...(await savePageConfig(req.body)) });
}));

app.delete("/api/app-page/:pageId", asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await deletePageConfig(req.params.pageId)) });
}));

// ---------------- DYNAMIC RUNTIME ----------------
// pageKey can be PAGE_ID or PAGE_NAME.
app.get("/api/pages/:pageKey", asyncHandler(async (req, res) => {
  const result = await getPageData(req.params.pageKey);
  res.json(result.config);
}));

app.get("/api/pages/:pageKey/records", asyncHandler(async (req, res) => {
  res.json({ success: true, rows: await getPageRecords(req.params.pageKey, req.query) });
}));

app.get("/api/pages/:pageKey/:id", asyncHandler(async (req, res) => {
  const result = await getPageData(req.params.pageKey, req.params.id);
  if (!result.row) return res.status(404).json({ success: false, message: "Record not found" });
  res.json({ success: true, page: result.config.page, fields: result.config.fields, data: result.row });
}));

app.post("/api/pages/:pageKey", asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await savePageData(req.params.pageKey, req.body || {})) });
}));

app.put("/api/pages/:pageKey/:id", asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await savePageData(req.params.pageKey, req.body || {}, req.params.id)) });
}));

app.delete("/api/pages/:pageKey/:id", asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await deletePageData(req.params.pageKey, req.params.id)) });
}));

// ---------------- FRONTEND-COMPATIBLE RUNTIME ROUTES ----------------
app.get("/api/app-page/runtime/records", asyncHandler(async (req, res) => {
  const pageKey = req.query.pageId ?? req.query.pageName;
  if (!pageKey) return res.status(400).json({ success: false, message: "pageId or pageName is required" });
  res.json({ success: true, rows: await getPageRecords(pageKey, req.query) });
}));

app.get("/api/app-page/runtime/record", asyncHandler(async (req, res) => {
  const pageKey = req.query.pageId ?? req.query.pageName;
  if (!pageKey || req.query.id === undefined) {
    return res.status(400).json({ success: false, message: "pageId and id are required" });
  }
  const result = await getPageData(pageKey, req.query.id);
  if (!result.row) return res.status(404).json({ success: false, message: "Record not found" });
  res.json({ success: true, page: result.config.page, fields: result.config.fields, data: result.row });
}));

app.post("/api/app-page/runtime/save", asyncHandler(async (req, res) => {
  const { pageId, pageName, id, data } = req.body || {};
  const pageKey = pageId ?? pageName;
  if (!pageKey) return res.status(400).json({ success: false, message: "pageId or pageName is required" });
  res.json({ success: true, ...(await savePageData(pageKey, data || {}, id || null)) });
}));

app.delete("/api/app-page/runtime/delete", asyncHandler(async (req, res) => {
  const pageKey = req.query.pageId ?? req.query.pageName;
  if (!pageKey || req.query.id === undefined) {
    return res.status(400).json({ success: false, message: "pageId and id are required" });
  }
  res.json({ success: true, ...(await deletePageData(pageKey, req.query.id)) });
}));

// ---------------- LOOKUPS ----------------
app.get("/api/page/dropdown", asyncHandler(async (req, res) => {
  const { ddlName, ddlFields, ddlWhere } = req.query;
  if (!ddlName || !ddlFields) return res.status(400).json({ success: false, message: "ddlName and ddlFields are required" });
  res.json({ success: true, options: await getDropdown(ddlName, ddlFields, ddlWhere) });
}));

app.get("/api/page/lookup", asyncHandler(async (req, res) => {
  const { ddlName, ddlFields, ddlWhere, search } = req.query;
  if (!ddlName || !ddlFields) return res.status(400).json({ success: false, message: "ddlName and ddlFields are required" });
  res.json({ success: true, rows: await getLookup(ddlName, ddlFields, ddlWhere, search) });
}));

app.use((_req, res) => res.status(404).json({ success: false, message: "API endpoint not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(Number(error.status) || 500).json({ success: false, message: getErrorMessage(error) });
});

app.listen(port, () => console.log(`PageCreator API listening on http://localhost:${port}`));
