import { poolPromise, sql } from "../db.js";

// Get all ledgers
export const getAllLedgers = async () => {
  const pool = await poolPromise;
  const result = await pool.request().execute("ViewPartyMasterWT");
  return result.recordset;
};

// Get ledger by ID
export const getLedgerById = async (id) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("LedgerID", sql.Int, id)
    .execute("Usp_Fas_Ledger_Get");   // best way to call stored procedure
  return result.recordset[0];
};


// Create new ledger
export const createLedger = async (data) => {
  const { ledgername, groupname, openingbalance, drcr } = data;
  const pool = await poolPromise;
  await pool
    .request()
    .input("LedgerName", sql.VarChar, ledgername)
    .input("GroupName", sql.VarChar, groupname)
    .input("OpeningBalance", sql.Decimal(18, 2), openingbalance)
    .input("DrCr", sql.VarChar, drcr)
    .query(`
      INSERT INTO Fas_Ledger (LedgerName, GroupName, OpeningBalance, DrCr)
      VALUES (@LedgerName, @GroupName, @OpeningBalance, @DrCr)
    `);
};

// Update ledger
export const updateLedger = async (id, data) => {
  const { ledgername, groupname, openingbalance, drcr } = data;
  const pool = await poolPromise;
  await pool
    .request()
    .input("LedgerID", sql.Int, id)
    .input("LedgerName", sql.VarChar, ledgername)
    .input("GroupName", sql.VarChar, groupname)
    .input("OpeningBalance", sql.Decimal(18, 2), openingbalance)
    .input("DrCr", sql.VarChar, drcr)
    .query(`
      UPDATE Fas_Ledger
      SET LedgerName=@LedgerName, GroupName=@GroupName, OpeningBalance=@OpeningBalance, DrCr=@DrCr
      WHERE LedgerID=@LedgerID
    `);
};

// Delete ledger
export const deleteLedger = async (id) => {
  const pool = await poolPromise;
  await pool
    .request()
    .input("LedgerID", sql.Int, id)
    .query("DELETE FROM Fas_Ledger WHERE LedgerID=@LedgerID");
};
