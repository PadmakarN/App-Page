export function cleanIdentifier(value, label = "identifier") {
  const text = String(value ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(text)) {
    throw new Error(`Invalid ${label}: ${text}`);
  }
  return text;
}
export function quoteIdentifier(value, label = "identifier") {
  return cleanIdentifier(value, label)
    .split(".")
    .map((part) => `[${part}]`)
    .join(".");
}
export function jsonBool(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true" ||
    String(value).toUpperCase() === "Y"
  );
}
export function normalizeMaster(master = {}) {
  return {
    PAGE_ID: master.PAGE_ID ?? null,
    PAGE_NAME: master.PAGE_NAME ?? "",
    TITLE: master.TITLE ?? "",
    TABLE_NAME: master.TABLE_NAME ?? master.Table_Name ?? "",
    PRIMARY_ID: master.PRIMARY_ID ?? "",
    PRIMARY_NUMBER: master.PRIMARY_NUMBER ?? "",
    INSERT_SP: master.INSERT_SP ?? "",
    UPDATE_SP: master.UPDATE_SP ?? "",
    GETDATA_SP: master.GETDATA_SP ?? "",
    DELETE_SP: master.DELETE_SP ?? "",
    Html_Script: master.Html_Script ?? master.HTML_SCRIPT ?? "",
    AuthName: master.AuthName ?? "",
    ReportName: master.ReportName ?? "",
    PRINT_RPT: master.PRINT_RPT ?? "",
    BRANCH_SRNO: jsonBool(master.BRANCH_SRNO),
    ATTACHMENT: jsonBool(master.ATTACHMENT),
    REMARKS: master.REMARKS ?? master.Remarks ?? "",
    STATUS: master.STATUS ?? master.Status ?? "A",
    Copy: jsonBool(master.Copy),
    HTMLButtons: master.HTMLButtons ?? master.HtmlButtons ?? "",
    EXEC_SP: master.EXEC_SP ?? master.Exec_SP ?? "",
    AuthBy: master.AuthBy ?? null,
    DevAuthCode: master.DevAuthCode ?? "",
    PRINT_RPT1: master.PRINT_RPT1 ?? "",
    AUTH_SP: master.AUTH_SP ?? master.Auth_SP ?? "",
    SaveOpt: master.SaveOpt ?? "Save",
    NewLink: master.NewLink ?? "0",
    Theme: master.Theme ?? "",
    Theme2: master.Theme2 ?? "",
  };
}
export function normalizeDetails(details = [], pageId = null) {
  return details.map((row, index) => ({
    PAGE_PARAM_ID: row.PAGE_PARAM_ID ?? null,
    SEQNO: Number(row.SEQNO) || index + 1,
    GROUPNAME: row.GROUPNAME ?? "MAIN",
    GROUPSEQ: Number(row.GROUPSEQ) || 1,
    FIELD_NAME: row.FIELD_NAME ?? "",
    TITLE: row.TITLE ?? "",
    ColSize: row.ColSize ?? row.COLSIZE ?? "col-sm-6 col-xs-6",
    CntProps: row.CntProps ?? "",
    PRIMARY_KEY: jsonBool(row.PRIMARY_KEY),
    MANDATORY: jsonBool(row.MANDATORY),
    Disabled: jsonBool(row.Disabled),
    DATA_TYPE: row.DATA_TYPE ?? "STRING",
    MaxSize: Number(row.MaxSize) || 0,
    VALIDATION: row.VALIDATION ?? row.Validation ?? "",
    CssClass: row.CssClass ?? "",
    DDLNAME: row.DDLNAME ?? "",
    Ajax: jsonBool(row.Ajax),
    DDLFIELDS: row.DDLFIELDS ?? "",
    DDLWHERE: row.DDLWHERE ?? "",
    NEW_SCRIPT: row.NEW_SCRIPT ?? row.New_Script ?? "",
    TOOLTIPS: row.TOOLTIPS ?? "",
    DefaultValue: row.DefaultValue ?? "",
    Html_Script: row.Html_Script ?? "",
    RefCol: jsonBool(row.RefCol),
    TitleSize: Number(row.TitleSize) || null,
    LogReq: jsonBool(row.LogReq),
    Description: row.Description ?? "",
    PAGE_ID: pageId,
  }));
}
export function buildConfigResult(page, fields) {
  return {
    success: true,
    page,
    fields: [...fields].sort(
      (a, b) => Number(a.SEQNO || 0) - Number(b.SEQNO || 0),
    ),
  };
}
export function getErrorMessage(error) {
  return (
    error?.originalError?.message || error?.message || "Unexpected server error"
  );
}
