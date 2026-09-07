import express from "express";
import { poolPromise } from "../db.js";

const router = express.Router();
router.post("/fetch-data", async (req, res) => {
  const { table, where, columns } = req.body;

  const whereClause = Object.entries(where || {})
    .map(([key, value]) => `${key}='${value}'`)
    .join(" AND ");

  const columnList = columns?.join(",") || "*";

  const query = `SELECT ${columnList} FROM ${table} ${whereClause ? "WHERE " + whereClause : ""}`;

  try {
    const pool = await poolPromise;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// ✅ Correct export
export default router;