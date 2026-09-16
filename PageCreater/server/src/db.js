import sql from "mssql";
import "dotenv/config";

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD,
  connectionTimeout: 30000,
  requestTimeout: 60000,

  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },

  pool: {
  max: 10,
  min: 1,
  idleTimeoutMillis: 60000
}
};

let poolPromise = null;

export async function getPool() {
  try {
    // Existing pool आहे आणि connected आहे
    if (poolPromise) {
      const pool = await poolPromise;

      if (pool.connected && !pool.closed) {
        return pool;
      }

      // Dead/closed pool
      poolPromise = null;
    }

    // New connection
    poolPromise = sql.connect(config);

    const pool = await poolPromise;

    console.log(
      `SQL connected: ${config.server}/${config.database}`
    );

    // Pool events
    pool.on("error", (err) => {
  console.error("SQL Pool Error:", err);

  poolPromise = null;
});

    return pool;

  } catch (error) {
    poolPromise = null;

    console.error("SQL Connection Error:", error);

    throw error;
  }
}

export { sql };