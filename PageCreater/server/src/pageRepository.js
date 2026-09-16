import { getPool, sql } from "./db.js";
import { cleanIdentifier, quoteIdentifier, normalizeMaster, normalizeDetails, buildConfigResult, jsonBool } from "./helpers.js";
import { executeConfiguredProcedure } from "./procedureExecutor.js";

const MASTER_FIELDS = [
  "PAGE_NAME", "TITLE", "TABLE_NAME", "PRIMARY_ID", "PRIMARY_NUMBER",
  "INSERT_SP", "UPDATE_SP", "GETDATA_SP", "DELETE_SP", "Html_Script",
  "AuthName", "ReportName", "PRINT_RPT", "BRANCH_SRNO", "ATTACHMENT",
  "REMARKS", "STATUS", "Copy", "HTMLButtons", "EXEC_SP", "AuthBy",
  "DevAuthCode", "PRINT_RPT1", "AUTH_SP", "SaveOpt", "NewLink", "Theme", "Theme2"
];

const DETAIL_FIELDS = [
  "SEQNO", "GROUPNAME", "GROUPSEQ", "FIELD_NAME", "TITLE", "ColSize", "CntProps",
  "PRIMARY_KEY", "MANDATORY", "Disabled", "DATA_TYPE", "MaxSize", "VALIDATION",
  "CssClass", "DDLNAME", "Ajax", "DDLFIELDS", "DDLWHERE", "NEW_SCRIPT", "TOOLTIPS",
  "DefaultValue", "Html_Script", "RefCol", "TitleSize", "LogReq", "Description"
];

function isPageId(value) { return /^\d+$/.test(String(value ?? "")); }
function normalizeKey(value) { return String(value ?? "").trim(); }

async function resolvePage(pageKey) {
  const pool = await getPool();
  const request = pool.request();
  let where;
  
  const result1 = await pool.request().query(`
  SELECT
    GETUTCDATE() AS ServerTime,
    DB_NAME() AS DatabaseName
`);

console.log("Connection result",result1.recordset);

  if (isPageId(pageKey)) {
    request.input("PAGE_ID", sql.Numeric(18, 0), pageKey);
    where = "PAGE_ID = @PAGE_ID";
  } else {
    request.input("PAGE_NAME", sql.NVarChar(200), pageKey);
    where = "PAGE_NAME = @PAGE_NAME";
  }
  const result = await request.query(`SELECT TOP 1 * FROM dbo.APP_PAGE_MST WHERE ${where} AND ISNULL(STATUS,'A') <> 'D'`);
  return result.recordset[0] || null;
}

async function tableColumns(tableName) {
  const table = cleanIdentifier(tableName, "table name");
  const [schemaName, objectName] = table.includes(".") ? table.split(".") : ["dbo", table];
  const pool = await getPool();
  const result = await pool.request()
    .input("schemaName", sql.NVarChar(128), schemaName)
    .input("objectName", sql.NVarChar(128), objectName)
    .query(`
      SELECT c.COLUMN_NAME, c.DATA_TYPE, c.CHARACTER_MAXIMUM_LENGTH,
             c.NUMERIC_PRECISION, c.NUMERIC_SCALE,
             COLUMNPROPERTY(OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA)+'.'+QUOTENAME(c.TABLE_NAME)), c.COLUMN_NAME, 'IsIdentity') AS IS_IDENTITY
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA=@schemaName AND c.TABLE_NAME=@objectName
      ORDER BY c.ORDINAL_POSITION
    `);
  if (!result.recordset.length) throw new Error(`Table not found: ${table}`);
  return result.recordset;
}

export async function getDesignerMetadata() {
  const pool = await getPool();
  const masterResult = await pool.request().query(`
    SELECT COLUMN_NAME AS FIELD_NAME, DATA_TYPE, IS_NULLABLE, ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='APP_PAGE_MST' AND COLUMN_NAME <> 'PAGE_ID'
    ORDER BY ORDINAL_POSITION
  `);
  const detailResult = await pool.request().query(`
    SELECT COLUMN_NAME AS FIELD_NAME, DATA_TYPE, IS_NULLABLE, ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='APP_PAGE_DTL' AND COLUMN_NAME <> 'PAGE_PARAM_ID' AND COLUMN_NAME <> 'PAGE_ID'
    ORDER BY ORDINAL_POSITION
  `);
  const typeResult = await pool.request().query(`SELECT DISTINCT DATA_TYPE FROM dbo.APP_PAGE_DTL WHERE DATA_TYPE IS NOT NULL AND LTRIM(RTRIM(DATA_TYPE))<>'' ORDER BY DATA_TYPE`);
  return {
    success: true,
    masterFields: masterResult.recordset,
    detailFields: detailResult.recordset,
    dataTypes: typeResult.recordset.map(x => x.DATA_TYPE),
    groups: [],
    columnSizes: [],
  };
}

export async function listPageConfigs() {
  const pool = await getPool();
  const result = await pool.request().query(`SELECT * FROM dbo.APP_PAGE_MST WHERE ISNULL(STATUS,'A') <> 'D' ORDER BY PAGE_ID DESC`);
  return result.recordset;
}

export async function getPageConfig(pageId) {
  const pool = await getPool();
  const master = await pool.request().input("PAGE_ID", sql.Numeric(18, 0), pageId).query(`SELECT TOP 1 * FROM dbo.APP_PAGE_MST WHERE PAGE_ID=@PAGE_ID`);
  if (!master.recordset.length) return null;
  const detail = await pool.request().input("PAGE_ID", sql.Numeric(18, 0), pageId).query(`SELECT * FROM dbo.APP_PAGE_DTL WHERE PAGE_ID=@PAGE_ID ORDER BY SEQNO, PAGE_PARAM_ID`);
  return buildConfigResult(master.recordset[0], detail.recordset);
}

function addKnownInputs(request, object, fields, skip = []) {
  const skipSet = new Set(skip.map(x => x.toUpperCase()));
  for (const field of fields) {
    if (skipSet.has(field.toUpperCase())) continue;
    const key = Object.keys(object).find(k => k.toUpperCase() === field.toUpperCase());
    if (key !== undefined) request.input(field, object[key] ?? null);
  }
}

export async function savePageConfig(payload) {
  const master = normalizeMaster(payload.master || {});
  const details = normalizeDetails(payload.details || [], master.PAGE_ID);
  if (!master.PAGE_NAME) throw new Error("PAGE_NAME is required");
  if (!master.TITLE) throw new Error("TITLE is required");
  if (!master.TABLE_NAME) throw new Error("TABLE_NAME is required");
  if (!master.PRIMARY_ID) throw new Error("PRIMARY_ID is required");
  cleanIdentifier(master.TABLE_NAME, "TABLE_NAME");
  cleanIdentifier(master.PRIMARY_ID, "PRIMARY_ID");

  const pool = await getPool();
  const masterSchema = await tableColumns("dbo.APP_PAGE_MST");
  const detailSchema = await tableColumns("dbo.APP_PAGE_DTL");
  const masterColumns = new Set(masterSchema.map(c => c.COLUMN_NAME.toUpperCase()));
  const detailColumns = new Set(detailSchema.map(c => c.COLUMN_NAME.toUpperCase()));
  const detailParam = detailSchema.find(c => c.COLUMN_NAME.toUpperCase() === "PAGE_PARAM_ID");
  const detailParamIsIdentity = Number(detailParam?.IS_IDENTITY || 0) === 1;
  const usableMasterFields = MASTER_FIELDS.filter(f => masterColumns.has(f.toUpperCase()));
  const usableDetailFields = DETAIL_FIELDS.filter(f => detailColumns.has(f.toUpperCase()) && f !== "SEQNO");

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    let pageId = master.PAGE_ID;

    if (pageId) {
      const req = new sql.Request(transaction).input("PAGE_ID", sql.Numeric(18,0), pageId);
      addKnownInputs(req, master, usableMasterFields, ["PAGE_ID"]);
      const assignments = usableMasterFields.map(f => `${quoteIdentifier(f)}=@${f}`).join(", ");
      if (assignments) await req.query(`UPDATE dbo.APP_PAGE_MST SET ${assignments} WHERE PAGE_ID=@PAGE_ID`);
    } else {
      const req = new sql.Request(transaction);
      addKnownInputs(req, master, usableMasterFields);
      const cols = usableMasterFields.map(quoteIdentifier).join(", ");
      const vals = usableMasterFields.map(f => `@${f}`).join(", ");
      const result = await req.query(`INSERT INTO dbo.APP_PAGE_MST (${cols}) OUTPUT INSERTED.PAGE_ID VALUES (${vals})`);
      pageId = result.recordset[0]?.PAGE_ID;
      if (pageId === undefined || pageId === null) throw new Error("Unable to create PAGE_ID");
    }

    await new sql.Request(transaction)
      .input("PAGE_ID", sql.Numeric(18,0), pageId)
      .query(`DELETE FROM dbo.APP_PAGE_DTL WHERE PAGE_ID=@PAGE_ID`);

    let nextParamId = 0;
    if (detailParam && !detailParamIsIdentity) {
      const maxResult = await new sql.Request(transaction).query(`SELECT ISNULL(MAX(PAGE_PARAM_ID),0) AS MAX_ID FROM dbo.APP_PAGE_DTL WITH (UPDLOCK,HOLDLOCK)`);
      nextParamId = Number(maxResult.recordset[0]?.MAX_ID || 0);
    }

    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      const req = new sql.Request(transaction).input("PAGE_ID", sql.Numeric(18,0), pageId).input("SEQNO", sql.Int, i + 1);
      addKnownInputs(req, d, usableDetailFields);
      const cols = ["PAGE_ID", "SEQNO", ...usableDetailFields];
      const vals = ["@PAGE_ID", "@SEQNO", ...usableDetailFields.map(f => `@${f}`)];
      if (detailParam && !detailParamIsIdentity) {
        nextParamId += 1;
        req.input("PAGE_PARAM_ID", sql.Numeric(18,0), nextParamId);
        cols.unshift("PAGE_PARAM_ID");
        vals.unshift("@PAGE_PARAM_ID");
      }
      await req.query(`INSERT INTO dbo.APP_PAGE_DTL (${cols.map(quoteIdentifier).join(",")}) VALUES (${vals.join(",")})`);
    }

    await transaction.commit();
    return { pageId, PAGE_ID: pageId, message: master.PAGE_ID ? "Page updated successfully" : "Page created successfully" };
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    throw error;
  }
}

export async function deletePageConfig(pageId) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const exists = await new sql.Request(transaction).input("PAGE_ID", sql.Numeric(18,0), pageId).query(`SELECT PAGE_ID FROM dbo.APP_PAGE_MST WHERE PAGE_ID=@PAGE_ID`);
    if (!exists.recordset.length) throw new Error("Page not found");
    await new sql.Request(transaction).input("PAGE_ID", sql.Numeric(18,0), pageId).query(`DELETE FROM dbo.APP_PAGE_DTL WHERE PAGE_ID=@PAGE_ID`);
    const result = await new sql.Request(transaction).input("PAGE_ID", sql.Numeric(18,0), pageId).query(`DELETE FROM dbo.APP_PAGE_MST WHERE PAGE_ID=@PAGE_ID`);
    await transaction.commit();
    return { deleted: true, affectedRows: result.rowsAffected?.[0] || 0, message: "Page deleted successfully" };
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    throw error;
  }
}

async function getDetailFields(pageId) {
  const pool = await getPool();
  const result = await pool.request().input("PAGE_ID", sql.Numeric(18,0), pageId).query(`SELECT * FROM dbo.APP_PAGE_DTL WHERE PAGE_ID=@PAGE_ID ORDER BY SEQNO, PAGE_PARAM_ID`);
  return result.recordset;
}

export async function getPageData(pageKey, id = null) {
  const page = await resolvePage(normalizeKey(pageKey));
  if (!page) throw new Error(`Page not found: ${pageKey}`);
  const config = buildConfigResult(page, await getDetailFields(page.PAGE_ID));
  if (id === null || id === undefined || id === "") return { config, row: null };

  if (page.GETDATA_SP) {
    try {
      const result = await executeConfiguredProcedure(page.GETDATA_SP, { PAGE_ID: page.PAGE_ID }, id);
      const row = result.result?.recordset?.[0] || null;
      if (row) return { config, row };
    } catch (e) { console.warn(`GETDATA_SP failed, using table fallback: ${e.message}`); }
  }

  if (!page.TABLE_NAME || !page.PRIMARY_ID) throw new Error("TABLE_NAME and PRIMARY_ID are required");
  const table = quoteIdentifier(page.TABLE_NAME, "table name");
  const pk = quoteIdentifier(page.PRIMARY_ID, "primary key");
  const pool = await getPool();
  const result = await pool.request().input("ID", sql.NVarChar(200), id).query(`SELECT TOP 1 * FROM ${table} WHERE ${pk}=@ID`);
  return { config, row: result.recordset[0] || null };
}

export async function getPageRecords(pageKey, query = {}) {
  const page = await resolvePage(normalizeKey(pageKey));
  if (!page) throw new Error(`Page not found: ${pageKey}`);
  const search = String(query.search || "").trim();

  if (page.GETDATA_SP) {
    try {
      const result = await executeConfiguredProcedure(page.GETDATA_SP, { PAGE_ID: page.PAGE_ID, search }, null);
      return result.result?.recordset || [];
    } catch (e) { console.warn(`GETDATA_SP failed, using table fallback: ${e.message}`); }
  }

  if (!page.TABLE_NAME) throw new Error("TABLE_NAME is not configured");
  const columns = await tableColumns(page.TABLE_NAME);
  const table = quoteIdentifier(page.TABLE_NAME, "table name");
  const pool = await getPool();
  const request = pool.request();
  let where = "1=1";
  if (search) {
    request.input("SEARCH", sql.NVarChar(4000), `%${search}%`);
    const textColumns = columns.filter(c => ["varchar","nvarchar","char","nchar","text","ntext"].includes(String(c.DATA_TYPE).toLowerCase()));
    if (textColumns.length) where += ` AND (${textColumns.map(c => `TRY_CONVERT(nvarchar(max), ${quoteIdentifier(c.COLUMN_NAME)}) LIKE @SEARCH`).join(" OR ")})`;
  }
  const order = page.PRIMARY_ID ? quoteIdentifier(page.PRIMARY_ID, "primary key") : quoteIdentifier(columns[0].COLUMN_NAME);
  const result = await request.query(`SELECT TOP 1000 * FROM ${table} WHERE ${where} ORDER BY ${order} DESC`);
  return result.recordset;
}

function normalizedEntries(data, allowedFields, primaryKey) {
  const pkUpper = String(primaryKey).toUpperCase();
  return Object.entries(data || {}).filter(([key]) => {
    if (key.toUpperCase() === pkUpper) return false;
    return allowedFields.some(field => field.toUpperCase() === key.toUpperCase());
  });
}

function convertValue(value, column) {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  const type = String(column?.DATA_TYPE || "").toLowerCase();
  if (["bit"].includes(type)) return jsonBool(value);
  if (["int","bigint","smallint","tinyint"].includes(type)) return Number(value);
  if (["decimal","numeric","money","smallmoney","float","real"].includes(type)) return Number(value);
  if (["date","datetime","datetime2","smalldatetime","time"].includes(type)) return value;
  if (["varbinary","binary","image"].includes(type) && value?.data) return Buffer.from(value.data, "base64");
  return value;
}

export async function savePageData(pageKey, data = {}, id = null) {
  const page = await resolvePage(normalizeKey(pageKey));
  if (!page) throw new Error(`Page not found: ${pageKey}`);
  const primaryKey = page.PRIMARY_ID;
  if (!page.TABLE_NAME || !primaryKey) throw new Error("TABLE_NAME and PRIMARY_ID are required");

  const columns = await tableColumns(page.TABLE_NAME);
  const columnMap = new Map(columns.map(c => [c.COLUMN_NAME.toUpperCase(), c]));
  const allowed = (await getDetailFields(page.PAGE_ID)).map(x => x.FIELD_NAME).filter(Boolean);
  const configured = allowed.length ? allowed : columns.map(c => c.COLUMN_NAME);
  const entries = normalizedEntries(data, configured, primaryKey).filter(([key]) => columnMap.has(key.toUpperCase()));
  if (!entries.length) throw new Error("No configured fields received");

  if (id === null || id === undefined || id === "") {
    if (page.INSERT_SP) {
      try {
        const r = await executeConfiguredProcedure(page.INSERT_SP, data);
        return { mode: "procedure", id: r.outputs?.ID ?? r.outputs?.[primaryKey] ?? null, message: "Record created successfully" };
      } catch (e) { console.warn(`INSERT_SP failed, using table fallback: ${e.message}`); }
    }
    const pool = await getPool();
    const request = pool.request();
    const cols = entries.map(([key]) => columnMap.get(key.toUpperCase()).COLUMN_NAME);
    entries.forEach(([key, value], i) => request.input(`P${i}`, convertValue(value, columnMap.get(key.toUpperCase()))));
    const result = await request.query(`INSERT INTO ${quoteIdentifier(page.TABLE_NAME)} (${cols.map(quoteIdentifier).join(",")}) OUTPUT INSERTED.${quoteIdentifier(primaryKey)} VALUES (${entries.map((_,i)=>`@P${i}`).join(",")})`);
    const inserted = result.recordset[0] || {};
    const idValue = inserted[primaryKey] ?? inserted[Object.keys(inserted)[0]];
    return { mode: "insert", id: idValue, [primaryKey]: idValue, message: "Record created successfully" };
  }

  if (page.UPDATE_SP) {
    try {
      await executeConfiguredProcedure(page.UPDATE_SP, data, id);
      return { mode: "procedure", id, [primaryKey]: id, message: "Record updated successfully" };
    } catch (e) { console.warn(`UPDATE_SP failed, using table fallback: ${e.message}`); }
  }

  const pool = await getPool();
  const request = pool.request().input("ID", sql.NVarChar(200), id);
  entries.forEach(([key, value], i) => request.input(`P${i}`, convertValue(value, columnMap.get(key.toUpperCase()))));
  const assignments = entries.map(([key], i) => `${quoteIdentifier(columnMap.get(key.toUpperCase()).COLUMN_NAME)}=@P${i}`).join(",");
  const result = await request.query(`UPDATE ${quoteIdentifier(page.TABLE_NAME)} SET ${assignments} WHERE ${quoteIdentifier(primaryKey)}=@ID`);
  if ((result.rowsAffected?.[0] || 0) === 0) throw new Error("Record not found or no changes made");
  return { mode: "update", id, [primaryKey]: id, message: "Record updated successfully" };
}

export async function deletePageData(pageKey, id) {
  if (id === undefined || id === null || id === "") throw new Error("Record ID is required");
  const page = await resolvePage(normalizeKey(pageKey));
  if (!page) throw new Error(`Page not found: ${pageKey}`);
  if (page.DELETE_SP) {
    try {
      await executeConfiguredProcedure(page.DELETE_SP, { PAGE_ID: page.PAGE_ID }, id);
      return { mode: "procedure", id, message: "Record deleted successfully" };
    } catch (e) { console.warn(`DELETE_SP failed, using table fallback: ${e.message}`); }
  }
  if (!page.TABLE_NAME || !page.PRIMARY_ID) throw new Error("TABLE_NAME and PRIMARY_ID are required");
  const pool = await getPool();
  const result = await pool.request().input("ID", sql.NVarChar(200), id).query(`DELETE FROM ${quoteIdentifier(page.TABLE_NAME)} WHERE ${quoteIdentifier(page.PRIMARY_ID)}=@ID`);
  if ((result.rowsAffected?.[0] || 0) === 0) throw new Error("Record not found");
  return { mode: "delete", id, affectedRows: result.rowsAffected[0], message: "Record deleted successfully" };
}

function parseDDL(ddlName, ddlFields) {
  const rawName = String(ddlName || "").trim();
  const dash = rawName.indexOf("-");
  if (dash >= 0) {
    const table = rawName.slice(0, dash).trim();
    const embedded = rawName.slice(dash + 1).trim();
    return { table, fields: String(ddlFields || embedded) };
  }
  return { table: rawName, fields: ddlFields };
}

function parseFields(value) {
  const fields = String(value || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!fields.length) throw new Error("DDLFIELDS is required");
  return fields;
}

function buildWhere(rawWhere, search = "") {
  const text = String(rawWhere || "").trim();
  if (!text) return "";
  if (/;|--|\/\*|\*\//.test(text)) throw new Error("Invalid DDLWHERE");
  return text;
}

export async function getDropdown(ddlName, ddlFields, ddlWhere = "") {
  const parsed = parseDDL(ddlName, ddlFields);
  const table = quoteIdentifier(parsed.table, "dropdown table");
  const fields = parseFields(parsed.fields);
  const pool = await getPool();
  const where = buildWhere(ddlWhere);
  const result = await pool.request().query(`SELECT TOP 1000 ${fields.map(quoteIdentifier).join(",")} FROM ${table}${where ? ` WHERE ${where}` : ""}`);
  return result.recordset;
}

export async function getLookup(ddlName, ddlFields, ddlWhere = "", search = "") {
  const parsed = parseDDL(ddlName, ddlFields);
  const table = quoteIdentifier(parsed.table, "lookup table");
  const fields = parseFields(parsed.fields);
  const pool = await getPool();
  const request = pool.request();
  let where = buildWhere(ddlWhere);
  const labelField = fields[0];
  if (search) {
    request.input("LOOKUP_SEARCH", sql.NVarChar(4000), `%${search}%`);
    where = where ? `(${where}) AND TRY_CONVERT(nvarchar(max), ${quoteIdentifier(labelField)}) LIKE @LOOKUP_SEARCH` : `TRY_CONVERT(nvarchar(max), ${quoteIdentifier(labelField)}) LIKE @LOOKUP_SEARCH`;
  }
  const result = await request.query(`SELECT TOP 200 ${fields.map(quoteIdentifier).join(",")} FROM ${table}${where ? ` WHERE ${where}` : ""} ORDER BY ${quoteIdentifier(labelField)}`);
  return result.recordset;
}
