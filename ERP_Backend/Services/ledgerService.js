import { sql, poolPromise } from "../db.js";

/* ================= CREATE LEDGER ================= */
export const createLedgerService = async (data) => {
  const pool = await poolPromise;

  // AUTO GENERATE LEDGER ID
  const idResult = await pool.request().query(`
      SELECT ISNULL(MAX(LEDGERID),0)+1 AS newID
      FROM Fas_Ledger
    `);

  const ledgerId = idResult.recordset[0].newID;

  const result = await pool
    .request()
    .input("LEDGERID", sql.Int, ledgerId)
    .input("LEDGERNAME", sql.VarChar, data.ledgername)
    .input("GROUPID", sql.Int, data.groupid)
    .input("ALLIAS", sql.VarChar, data.allias)
    .input("NAME", sql.VarChar, data.name)
    .input("ADDRESS", sql.VarChar, data.address)
    .input("STATUS", sql.VarChar, data.status || "A")
    .input("CITY", sql.VarChar, data.city)
    .input("STATE", sql.VarChar, data.state)
    .input("COUNTRY", sql.VarChar, data.country)
    .input("PIN", sql.VarChar, data.pin)
    .input("MOBILE", sql.VarChar, data.mobile)
    .input("EMAILID", sql.VarChar, data.email).query(`
      INSERT INTO Fas_Ledger
      (
        LEDGERID,
        LEDGERNAME,
        GROUPID,
        ALLIAS,
        NAME,
        ADDRESS,
        STATUS,
        CITY,
        STATE,
        COUNTRY,
        PIN,
        MOBILE,
        EMAILID
      )

      OUTPUT INSERTED.*

      VALUES
      (
        @LEDGERID,
        @LEDGERNAME,
        @GROUPID,
        @ALLIAS,
        @NAME,
        @ADDRESS,
        @STATUS,
        @CITY,
        @STATE,
        @COUNTRY,
        @PIN,
        @MOBILE,
        @EMAILID
      )
    `);

  return result.recordset[0];
};

/* ================= GET LEDGER BY ID ================= */
export const getLedgerByIdService = async (id) => {
  const pool = await poolPromise;

  const result = await pool.request().input("LEDGERID", sql.Int, id).query(`
      SELECT *
      FROM ViewFas_Ledger
      WHERE LEDGERID=@LEDGERID
    `);

  return result.recordset[0];
};

/* ================= UPDATE LEDGER ================= */
export const updateLedgerService = async (id, data) => {
  const pool = await poolPromise;

  await pool
    .request()
    .input("LEDGERID", sql.Int, id)
    .input("LEDGERNAME", sql.VarChar, data.ledgername)
    .input("GROUPID", sql.Int, data.groupid)
    .input("ALLIAS", sql.VarChar, data.allias)
    .input("NAME", sql.VarChar, data.name)
    .input("ADDRESS", sql.VarChar, data.address)
    .input("STATUS", sql.VarChar, data.status || "A")
    .input("CITY", sql.VarChar, data.city)
    .input("STATE", sql.VarChar, data.state)
    .input("COUNTRY", sql.VarChar, data.country)
    .input("PIN", sql.VarChar, data.pin)
    .input("MOBILE", sql.VarChar, data.mobile)
    .input("EMAILID", sql.VarChar, data.email).query(`
           UPDATE Fas_Ledger SET 
                  LEDGERNAME=@LEDGERNAME,GROUPID=@GROUPID,ALLIAS=@ALLIAS,NAME=@NAME,
                  ADDRESS=@ADDRESS,STATUS=@STATUS,CITY=@CITY,STATE=@STATE,COUNTRY=@COUNTRY,
                  PIN=@PIN,MOBILE=@MOBILE,EMAILID=@EMAILID WHERE LEDGERID=@LEDGERID
           `);
  const result = await pool
    .request()
    .input("LEDGERID", sql.Int, id)
    .query(`SELECT * FROM Fas_Ledger WHERE LEDGERID=@LEDGERID`);

  return result.recordset[0];
};

/* ================= GET ALL LEDGERS ================= */
export const getLedgersService = async (query) => {
  const pool = await poolPromise;
  const page = parseInt(query.page || 1);
  const limit = parseInt(query.limit || 20);
  const offset = (page - 1) * limit;

  const result = await pool
    .request()
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit).query(`
      SELECT *
      FROM ViewFAS_Ledger
      ORDER BY LEDGERID DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

  return result.recordset;
};

/* ================= DELETE LEDGER ================= */
export const deleteLedgerService = async (ledgerid) => {
  const pool = await poolPromise;

  const result = await pool
    .request()

    .input("LEDGERID", sql.Int, ledgerid).query(`
      DELETE FROM Fas_Ledger
      WHERE LEDGERID=@LEDGERID
    `);

  return result;
};
