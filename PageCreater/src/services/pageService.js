const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function parseResponse(response) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!response.ok)
    throw new Error(
      data.message || data.error || `Request failed (${response.status})`,
    );
  if (data?.success === false)
    throw new Error(data.message || "Request failed");
  return data;
}

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  return parseResponse(response);
}

export async function getPageConfig(pageIdOrName) {
  return request(`/app-page/${encodeURIComponent(pageIdOrName)}`);
}
export async function listPageConfigs() {
  return request(`/app-page`);
}
export async function savePageDefinition(payload) {
  return request(`/app-page/save`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function deletePageDefinition(pageId) {
  return request(`/app-page/${encodeURIComponent(pageId)}`, {
    method: "DELETE",
  });
}

// DB-driven designer metadata. Nothing in the designer should define selectable values locally.
export async function getPageDesignerMetadata() {
  return request(`/app-page/metadata`);
}

export async function getPageRecords(pageId, params = {}) {
  const qs = new URLSearchParams({ pageId: String(pageId), ...params });
  return request(`/app-page/runtime/records?${qs.toString()}`);
}
export async function getPageRecord(pageId, id) {
  const qs = new URLSearchParams({ pageId: String(pageId), id: String(id) });
  return request(`/app-page/runtime/record?${qs.toString()}`);
}
export async function savePageRecord(pageId, data, id = null) {
  return request(`/app-page/runtime/save`, {
    method: "POST",
    body: JSON.stringify({ pageId, id, data }),
  });
}
export async function deletePageRecord(pageId, id) {
  const qs = new URLSearchParams({ pageId: String(pageId), id: String(id) });
  return request(`/app-page/runtime/delete?${qs.toString()}`, {
    method: "DELETE",
  });
}
export async function getDropdownOptions(field, formData = {}) {
  const qs = new URLSearchParams({
    ddlName: field.DDLNAME || "",
    ddlFields: field.DDLFIELDS || "",
    ddlWhere: resolveTokens(field.DDLWHERE || "", formData),
    fieldName: field.FIELD_NAME || "",
  });
  return request(`/page/dropdown?${qs.toString()}`);
}
export async function lookupField(field, formData = {}, search = "") {
  const qs = new URLSearchParams({
    ddlName: field.DDLNAME || "",
    ddlFields: field.DDLFIELDS || "",
    ddlWhere: resolveTokens(field.DDLWHERE || "", formData),
    fieldName: field.FIELD_NAME || "",
    search,
  });
  return request(`/page/lookup?${qs.toString()}`);
}
export function resolveTokens(text, data = {}) {
  return String(text || "")
    .replace(/~0\{([^}]+)\}~/g, (_, key) => data[key] ?? "0")
    .replace(/~\{([^}]+)\}~/g, (_, key) => data[key] ?? "")
    .replace(/~([^~]+)~/g, (_, value) => value);
}
