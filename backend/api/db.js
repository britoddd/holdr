const postgres = require("postgres");

// Create a connection pool
const sql = postgres({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "holdr",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// Helper function to initialize the database
async function initializeDatabase() {
  try {
    // Read and execute the schema
    const fs = require("fs");
    const path = require("path");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    
    // Split by semicolon and execute each statement
    const statements = schema.split(";").filter((stmt) => stmt.trim());
    for (const statement of statements) {
      await sql.unsafe(statement);
    }
    
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

module.exports = {
  sql,
  initializeDatabase,
};
