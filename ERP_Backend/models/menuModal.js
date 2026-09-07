import { poolPromise, sql } from "../db.js";

export async function getMenu() {
  const pool = await poolPromise;
  const result = await pool.request().query("SELECT * FROM ViewModuleMst");
  return result.recordset;
}
