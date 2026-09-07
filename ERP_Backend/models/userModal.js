import { poolPromise, sql } from "../db";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// ================== PATH FIX ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================== MULTER SETUP ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/UserMaster"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

export const upload = multer({ storage });

// ================== GET ALL USERS ==================
export const getAllusers = async () => {
  const pool = await poolPromise;

  const result = await pool.request().query("SELECT * FROM UserMaster");

  return result.recordset;
};

// ================== GET USER BY ID ==================
export const getUserByID = async (id) => {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("UserID", sql.Int, id)
    .query("SELECT * FROM UserMaster WHERE UserID = @UserID");

  return result.recordset[0];
};

// ================== CREATE USER ==================
export const createUser = async (userdata, file) => {
  const {
    username,
    emailid,
    mobileno,
    password,
    status,
  } = userdata;

  const pool = await poolPromise;
  const request = pool.request();

  // generate new ID
  const result = await request.query(
    "SELECT ISNULL(MAX(USERID),0)+1 AS NEWUSERID FROM USERMASTER"
  );

  const NewUserID = result.recordset[0].NEWUSERID;

  // image filename from multer
  const profileimage = file ? file.filename : null;

  request.input("USERID", sql.Int, NewUserID);
  request.input("USERNAME", sql.VarChar(100), username);
  request.input("EMAILID", sql.VarChar(100), emailid);
  request.input("MOBILENO", sql.VarChar(20), mobileno);
  request.input("PASSWORD", sql.VarChar(100), password);
  request.input("STATUS", sql.VarChar(10), status || "A");
  request.input("PROFILEIMAGE", sql.VarChar(255), profileimage);

  await request.query(`
    INSERT INTO UserMaster 
    (USERID, USERNAME, EMAILID, MOBILENO, PASSWORD, STATUS, PROFILEIMAGE)
    VALUES 
    (@USERID, @USERNAME, @EMAILID, @MOBILENO, @PASSWORD, @STATUS, @PROFILEIMAGE)
  `);

  return { message: "User added successfully" };
};