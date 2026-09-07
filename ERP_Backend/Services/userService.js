import { sql, poolPromise } from "../db.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

// CREATE USER
export const createUserService = async (data, file) => {
  const pool = await poolPromise;
  const image = file ? file.filename : null;

  // =========================
  // GENERATE USERID
  // =========================

  const idResult = await pool.request().
  query('select isnull(max(userID),0)+1 as newID From UserMaster');
  const UserID=idResult.recordset[0].newID;
  const hashedPassword = await bcrypt.hash(data.password,10);

  const result = await pool.request()
    .input("USERID", sql.Int, UserID)
    .input("USERNAME", sql.VarChar, data.username)
    .input("EMAILID", sql.VarChar, data.emailid)
    .input("MOBILENO", sql.VarChar, data.mobileno)
    .input("PASSWORD", sql.VarChar, hashedPassword)
    .input("STATUS", sql.VarChar, data.status || "A")
    .input("PROFILEIMAGE", sql.VarChar, image)
    .query(`
      INSERT INTO UserMaster
      (USERID,USERNAME, EMAILID, MOBILENO, PASSWORD, STATUS, PROFILEIMAGE)
       OUTPUT INSERTED.*
      VALUES
      (@USERID,@USERNAME, @EMAILID, @MOBILENO, @PASSWORD, @STATUS, @PROFILEIMAGE)
    `);

  return result.recordset[0];
};

// GET BY ID
export const getUserByIdService = async (id) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserID", sql.Int, id)
    .query("SELECT * FROM UserMaster WHERE UserID=@UserID");

  return result.recordset[0];
};

// UPDATE
export const updateUserService = async (id, data, file) => {
  const pool = await poolPromise;
  const hashedPassword = await bcrypt.hash(data.password,10);

  const old = await pool.request()
    .input("UserID", sql.Int, id)
    .query("SELECT ProfileImage FROM UserMaster WHERE UserID=@UserID");

  let oldImage = old.recordset[0]?.ProfileImage;
  let newImage = file ? file.filename : oldImage;

  if (file && oldImage) {
    const oldPath = path.join("uploads/UserMaster", oldImage);
    fs.unlink(oldPath, () => {});
  }

  const result = await pool.request()
    .input("UserID", sql.Int, id)
    .input("USERNAME", sql.VarChar, data.username)
    .input("EMAILID", sql.VarChar, data.emailid)
    .input("MOBILENO", sql.VarChar, data.mobileno)
    .input("PASSWORD", sql.VarChar, hashedPassword)
    .input("STATUS", sql.VarChar, data.status)
    .input("PROFILEIMAGE", sql.VarChar, newImage)
    .query(`
      UPDATE UserMaster SET
      USERNAME=@USERNAME,
      EMAILID=@EMAILID,
      MOBILENO=@MOBILENO,
      PASSWORD=@PASSWORD,
      STATUS=@STATUS,
      PROFILEIMAGE=@PROFILEIMAGE
      WHERE UserID=@UserID
    `);

  return result;
};

// GET LIST
export const getUsersService = async (query) => {
  const pool = await poolPromise;

  const page = parseInt(query.page || 1);
  const limit = parseInt(query.limit || 20);
  const offset = (page - 1) * limit;

  const result = await pool.request()
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT * FROM UserMaster
      ORDER BY UserID DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

  return result.recordset;
};

// DELETE
export const deleteUserService = async (id) => {
  const pool = await poolPromise;

  await pool.request()
    .input("UserID", sql.Int, id)
    .query("UPDATE UserMaster SET Status='D' WHERE UserID=@UserID");
};