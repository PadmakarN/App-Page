import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { poolPromise } from "./db.js";
import verifyToken from "./middleware/authmiddleware.js";

// Routers
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import fetchDataRoutes from "./routes/fetchDataRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderHdrRoutes from "./Module/SalesOrder/orderHdrRoures.js";
import branchMasterRoute from "./Module/BranchMaster/branchMasterRoutes.js"

dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://erp-frontend-pnerp.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// const allowedOrigins = [
//   "http://localhost:5173",
//   "https://erp-frontend-7ofn9ldb3-pnerp.vercel.app"
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"]
//   })
// );

// app.options("*", cors());

app.use(express.json());
app.use(cookieParser());

// To handle ES module __dirname issue
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use((req,res,next)=>{
  //console.log("request aayi hai",req.method,req.url);
  next();
});
// ✅ Use Routers
app.use("/api/auth", authRoutes);
app.use("/api/usermaster" ,verifyToken, userRoutes);
app.use("/api/customerslist",verifyToken, customerRoutes);
app.use("/api/fetchdata", verifyToken ,fetchDataRoutes);
app.use("/api/ledgermaster",verifyToken, ledgerRoutes);
app.use("/api/branchmaster",verifyToken,branchMasterRoute);
app.use("/api/menu",verifyToken, menuRoutes);
app.use("/api/fetchdbdata",verifyToken, fetchDataRoutes);
app.use("/api/orderhdr",verifyToken, orderHdrRoutes);

// ✅ Database Connection
poolPromise
  .then((pool) => console.log("✅ Connected to MSSQL database"))
  .catch((err) => console.error("❌ Database connection failed:", err));

// ✅ Start Server
const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});