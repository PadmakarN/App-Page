export const isTrue = (v) => v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true" || String(v).toUpperCase() === "Y";
export const isEmpty = (v) => v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");

export function parseDDLName(value) {
  const raw = String(value || "");
  const dash = raw.indexOf("-");
  if (dash < 0) return { source: raw, first: "", second: "" };
  const source = raw.slice(0, dash).trim();
  const parts = raw.slice(dash + 1).split(",").map(x => x.trim()).filter(Boolean);
  return { source, first: parts[0] || "", second: parts[1] || "" };
}

export function getDDLValueColumn(field) {
  const { first, second } = parseDDLName(field.DDLNAME);
  return second || first || field.FIELD_NAME;
}

export function getDDLLabelColumn(field) {
  const { first, second } = parseDDLName(field.DDLNAME);
  return first || second || field.FIELD_NAME;
}

export function normalizeRecordResponse(result) {
  return result?.data ?? result?.record ?? result?.row ?? result;
}

export function normalizeRowsResponse(result) {
  return result?.rows ?? result?.data ?? result?.records ?? [];
}
