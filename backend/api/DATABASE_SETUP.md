# PostgreSQL Database Setup Guide

This guide will help you set up a PostgreSQL database for the Holdr application.

## Prerequisites

You need to have PostgreSQL installed on your system:

- **Windows**: Download from https://www.postgresql.org/download/windows/
- **macOS**: Use Homebrew: `brew install postgresql@15`
- **Linux**: Use your package manager: `sudo apt-get install postgresql postgresql-contrib`

## Setup Steps

### 1. Create the `.env` file

Copy `.env.example` to `.env` and update with your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection details:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=holdr
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 2. Create the Database

Open PostgreSQL client (psql) and create the database:

```sql
CREATE DATABASE holdr;
```

Or from command line:

```bash
createdb holdr
```

### 3. Install Dependencies

Install the required Node.js packages:

```bash
npm install
```

### 4. Initialize the Database Schema

The `schema.sql` file contains all the table definitions. You can initialize it in two ways:

**Option A: Using psql command**

```bash
psql -U postgres -d holdr -f schema.sql
```

**Option B: Using the Node.js application**

Add this to your `app.js` startup:

```javascript
const { initializeDatabase } = require("./db");

// Initialize database on startup
initializeDatabase()
  .then(() => {
    // Start your Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
```

## Database Schema

The setup creates three main tables:

### items
Stores all item information:
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `description` (TEXT)
- `quantity` (INTEGER)
- `category` (VARCHAR)
- `storage_place` (VARCHAR)
- `date_bought` (DATE)
- `date_owned` (DATE)
- `usage_frequency` (VARCHAR: Daily, Weekly, Monthly, Rarely, Never)
- `image_url` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### categories
Stores item categories:
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Unique)
- `color` (VARCHAR)
- `created_at` (TIMESTAMP)

### storage_places
Stores storage location information:
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Unique)
- `color` (VARCHAR)
- `created_at` (TIMESTAMP)

## Verifying the Setup

To verify your database is set up correctly, connect to it:

```bash
psql -U postgres -d holdr
```

Then list the tables:

```sql
\dt
```

You should see `items`, `categories`, and `storage_places` tables.

## Troubleshooting

**Connection refused?**
- Make sure PostgreSQL service is running
- Windows: Check Services app or run `pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start`
- macOS: Run `brew services start postgresql@15`
- Linux: Run `sudo systemctl start postgresql`

**Database doesn't exist?**
- Run: `createdb holdr`

**Permission denied?**
- Make sure your `.env` has the correct username and password
- Default PostgreSQL user is usually `postgres`

## Next Steps

Once the database is set up, you can create API endpoints in `app.js` to:
1. Create items (INSERT)
2. Read items (SELECT)
3. Update items (UPDATE)
4. Delete items (DELETE)

Example endpoints:
- `POST /api/items` - Create item
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get item by ID
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
