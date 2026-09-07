import express from "express";
import bcrypt from "bcrypt";
import mssql from "mssql";
import { poolPromise } from "../db.js";
import jwt from "jsonwebtoken";
const router = express.Router();

const SALT_ROUNDS = 12;

// ===============================
// 🔐 LOGIN ROUTE
// ===============================
router.post("/login", async (req, res) => {
  debugger;
  const start = Date.now();
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("username", mssql.NVarChar, username);

    // ✅ Parameterized query (no string concatenation)
    const result = await request.query(`
      SELECT UserID, RoleID, UserName, EmailID, ProfileImage, Password AS PasswordHash
      FROM UserMaster
      WHERE UserName = @username
    `);

    // const end = Date.now();
    // console.log("DB Query + API Execution Time:", (end - start), 'ms');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.recordset[0];

    // ✅ Compare given password with hashed password in DB
    const passwordMatch = await bcrypt.compare(password, user.PasswordHash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ JWT generate

    const token = jwt.sign(
      {
        userid: user.UserID,
        username: user.UserName,
        roleid: user.RoleID,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    // ✅ send token in cookie
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: false, // HTTP
    //   sameSite: "lax", // ⭐ CHANGE THIS
    //   maxAge: 24 * 60 * 60 * 1000,
    // });
    // ✅ send token in cookie
       res.cookie("token", token, {
       httpOnly: true,
       secure: true,
       sameSite: "none",
       path: "/",
       maxAge: 24 * 60 * 60 * 1000,
      });

    // ✅ Success
    res.status(200).json({
      message: "Login successful",
      user: {
        userid: user.UserID,
        username: user.UserName,
        emailid: user.EmailID,
        roleid: user.RoleID,
        profileImage: user.ProfileImage,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});



// ===============================
// 🧩 REGISTER ROUTE
// ===============================
router.post("/register", async (req, res) => {
  const { username, password, emailid } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    const pool = await poolPromise;

    // ✅ Check if username already exists
    const checkRequest = pool.request();
    checkRequest.input("username", mssql.NVarChar, username);
    const checkResult = await checkRequest.query(`
      SELECT UserID FROM UserMaster WHERE UserName = @username
    `);

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ✅ Generate new UserID
    const result = await pool.request().query(`
      SELECT ISNULL(MAX(UserID), 0) + 1 AS NewUserID FROM UserMaster
    `);
    const newUserID = result.recordset[0].NewUserID;

    // ✅ Insert new user
    const insertRequest = pool.request();
    insertRequest.input("userid", mssql.Int, newUserID);
    insertRequest.input("username", mssql.NVarChar, username);
    insertRequest.input("password", mssql.NVarChar, hashedPassword);
    insertRequest.input("emailid", mssql.NVarChar, emailid || null);

    await insertRequest.query(`
      INSERT INTO UserMaster (UserID, UserName, Password, EmailID)
      VALUES (@userid, @username, @password, @emailid)
    `);

    res.status(200).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration Error:", err);
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }

  
  });

  // ===============================
  // 🧩 LOGOUT ROUTE
  // ===============================
   router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});
  // router.post("/logout", (req, res) => {
  //   res.clearCookie("token", {
  //     httpOnly: true,
  //     secure: false, // login ke jaise hi
  //     sameSite: "lax",
  //     path: "/",
  //   });

  //   return res.status(200).json({
  //     success: true,
  //     message: "Logged out successfully",
  //   });
  // });

export default router;
