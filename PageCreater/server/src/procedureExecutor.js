import { getPool, sql } from "./db.js";
import { cleanIdentifier } from "./helpers.js";

function procedureName(name) {
  const value = cleanIdentifier(
    name,
    "procedure name"
  );

  return value.includes(".")
    ? value
    : `dbo.${value}`;
}

function toSqlType(
  systemType,
  maxLength,
  precision,
  scale
) {
  const type =
    String(systemType || "nvarchar").toLowerCase();

  switch (type) {
    case "bigint":
      return sql.BigInt;

    case "int":
      return sql.Int;

    case "smallint":
      return sql.SmallInt;

    case "tinyint":
      return sql.TinyInt;

    case "bit":
      return sql.Bit;

    case "decimal":
      return sql.Decimal(
        Number(precision || 18),
        Number(scale || 4)
      );

    case "numeric":
      return sql.Numeric(
        Number(precision || 18),
        Number(scale || 4)
      );

    case "money":
      return sql.Money;

    case "smallmoney":
      return sql.SmallMoney;

    case "float":
      return sql.Float;

    case "real":
      return sql.Real;

    case "date":
      return sql.Date;

    case "datetime":
      return sql.DateTime;

    case "datetime2":
      return sql.DateTime2;

    case "smalldatetime":
      return sql.SmallDateTime;

    case "time":
      return sql.Time;

    case "uniqueidentifier":
      return sql.UniqueIdentifier;

    case "varbinary":
      return sql.VarBinary(
        maxLength > 0
          ? maxLength
          : sql.MAX
      );

    case "varchar":
      return sql.VarChar(
        maxLength > 0
          ? maxLength
          : sql.MAX
      );

    case "char":
      return sql.Char(
        maxLength > 0
          ? maxLength
          : sql.MAX
      );

    case "nvarchar":
      return sql.NVarChar(
        maxLength > 0
          ? maxLength
          : sql.MAX
      );

    case "nchar":
      return sql.NChar(
        maxLength > 0
          ? maxLength
          : sql.MAX
      );

    default:
      return sql.NVarChar(sql.MAX);
  }
}

export async function executeConfiguredProcedure(
  name,
  body = {},
  id = null
) {
  const proc = procedureName(name);

  const pool = await getPool();

  const meta =
    await pool
      .request()
      .input(
        "procName",
        sql.NVarChar(300),
        proc.replace(/^dbo\./i, "")
      )
      .query(`
        SELECT
          p.name AS parameter_name,
          TYPE_NAME(p.user_type_id) AS system_type,
          p.max_length,
          p.precision,
          p.scale,
          p.is_output
        FROM sys.parameters p
        INNER JOIN sys.objects o
          ON o.object_id = p.object_id
        INNER JOIN sys.schemas s
          ON s.schema_id = o.schema_id
        WHERE o.type = 'P'
          AND s.name + '.' + o.name = @procName
        ORDER BY p.parameter_id
      `);

  if (!meta.recordset.length) {
    throw new Error(
      `Configured procedure not found: ${proc}`
    );
  }

  const request = pool.request();

  const normalizedBody =
    Object.fromEntries(
      Object.entries(body || {}).map(
        ([key, value]) => [
          key.toUpperCase(),
          value,
        ]
      )
    );

  const params = [];

  for (const p of meta.recordset) {
    const parameter =
      p.parameter_name.replace(/^@/, "");

    const key =
      parameter.toUpperCase();

    let value =
      normalizedBody[key];

    if (
      value === undefined &&
      [
        "JSON_INPUT",
        "INPUT_JSON",
        "JSON",
        "PARAM_JSON",
      ].includes(key)
    ) {
      value = JSON.stringify(
        body || {}
      );
    }

    if (
      value === undefined &&
      key === "ID"
    ) {
      value = id;
    }

    if (
      value === undefined &&
      key.endsWith("ID")
    ) {
      value = id;
    }

    if (value === undefined) {
      value = null;
    }

    const sqlType =
      toSqlType(
        p.system_type,
        p.max_length,
        p.precision,
        p.scale
      );

    if (p.is_output) {
      request.output(
        parameter,
        sqlType
      );

      params.push(
        `@${parameter}=@${parameter} OUTPUT`
      );
    } else {
      request.input(
        parameter,
        sqlType,
        value
      );

      params.push(
        `@${parameter}=@${parameter}`
      );
    }
  }

  const result =
    await request.query(
      `EXEC ${proc} ${params.join(", ")}`
    );

  return {
    result,
    outputs:
      result.output || {},
  };
}