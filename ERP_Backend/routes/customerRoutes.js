import express from 'express';
import {sql,poolPromise} from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const page=parseInt(req.query.page)||1;
  const limit=parseInt(req.query.limit)||10
   const offset=(page-1)*limit;
  try {
    const pool=await poolPromise;
    const request = pool.request();
    const result = await request.query(`SELECT * FROM Fas_Ledger order by LedgerID OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

export default router;
