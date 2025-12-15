# Backend Database Setup

This backend can connect to a local database using a connection string stored in an `.env` file.

## Recommended Options
- PostgreSQL: balanced features, strong tooling; great default.
- SQLite: simplest for local development (single file `db.sqlite`).
- MySQL/MariaDB: widely used; good alternative.
- MongoDB: document store if you prefer schemaless.

## 1) Create your local database
Pick one option and create it locally:

### PostgreSQL
1. Install PostgreSQL
2. Create a database, e.g. `holdr`
3. Create a user and grant access

Connection example: `postgresql://postgres:<password>@localhost:5432/holdr`

### SQLite
1. No server needed; a file DB will be created when used

Connection example: `sqlite:./db.sqlite`

### MySQL
1. Install MySQL
2. Create a database and user

Connection example: `mysql://root:<password>@localhost:3306/holdr`

### MongoDB
1. Install MongoDB Community
2. Create `holdr` database (auto-created on first use)

Connection example: `mongodb://localhost:27017/holdr`

## 2) Configure the connection string
1. Copy `backend/.env.example` to `backend/.env`
2. Set `DATABASE_URL` to your chosen connection string
3. Optionally adjust `PORT` and `CORS_ORIGIN`

## 3) Next steps
Once you confirm the database exists and share the `DATABASE_URL` you chose, I'll wire up the runtime connection in the code (driver/client selection, schema, and init).
