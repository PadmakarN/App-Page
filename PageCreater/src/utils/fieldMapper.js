export function mapDataType(dbField) {

  const dataType = String(
    dbField.DATA_TYPE || ""
  ).toUpperCase();

  // Ajax dropdown
  if (dbField.Ajax === true || dbField.Ajax === "True") {
    return "ajax_select";
  }

  // Normal dropdown
  if (dbField.DDLNAME) {
    return "select";
  }

  switch (dataType) {

    case "STRING":
      return "text";

    case "NUMERIC":
      return "number";

    case "BOOL":
      return "checkbox";

    case "DATETIME":
      return "date";

    default:
      return "text";
  }
}


export function mapColumnSize(colSize) {

  if (!colSize) {
    return 12;
  }

  const value = String(colSize);

  const match = value.match(
    /col-(?:sm|md|lg)-(\d+)/
  );

  if (!match) {
    return 12;
  }

  return Number(match[1]);
}


export function mapField(dbField) {

  return {

    id: dbField.PAGE_PARAM_ID,

    name: dbField.FIELD_NAME,

    label: dbField.TITLE,

    type: mapDataType(dbField),

    required:
      dbField.MANDATORY === true ||
      dbField.MANDATORY === "True",

    disabled:
      dbField.Disabled === true ||
      dbField.Disabled === "True",

    placeholder:
      dbField.TOOLTIPS || "",

    helpText:
      dbField.TOOLTIPS || "",

    defaultValue:
      dbField.DefaultValue || "",

    maxLength:
      Number(dbField.MaxSize || 0),

    colSize:
      mapColumnSize(dbField.COLSIZE),

    options: [],

    ajax: {
      enabled:
        dbField.Ajax === true ||
        dbField.Ajax === "True",

      ddlName:
        dbField.DDLNAME || "",

      ddlFields:
        dbField.DDLFIELDS || "",

      ddlWhere:
        dbField.DDLWHERE || ""
    }

  };
}


export function mapPage(dbPage, dbFields) {

  return {

    success: true,

    page: {

      id: dbPage.PAGE_ID,

      key: dbPage.PAGE_NAME,

      title: dbPage.TITLE,

      tableName: dbPage.TABLE_NAME

    },

    fields: dbFields
      .map(mapField)
      .sort(
        (a, b) =>
          a.seqNo - b.seqNo
      )

  };
}
