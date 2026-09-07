import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: 1433,

  options: {
    encrypt: true,
    trustServerCertificate: false
  },

  connectionTimeout: 30000,
  requestTimeout: 30000,

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

export const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(async pool => {
    console.log("✅ Connected to MSSQL database");

    await pool.request().query("SELECT 1");

    console.log("✅ Database test query successful");

    return pool;
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err);
    throw err;
  });

export { sql };
