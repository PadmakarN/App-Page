import {sql,poolPromise} from "../../db.js";

/* ================= GET ALL Orders ================= */
export const getAllOrdersHdrService = async (query) => {
  const pool = await poolPromise;
  const page = parseInt(query.page || 1);
  const limit = parseInt(query.limit || 100);
  const offset = (page - 1) * limit;

  const result = await pool
    .request()
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit).query(`
      SELECT *
      FROM ViewOrderHdr
      WHERE STATUS <> 'D'
      ORDER BY ORDERID DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);
   return result.recordset;
}
