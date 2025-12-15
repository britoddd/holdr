-- Create tables for the Holdr application

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  category VARCHAR(255) NOT NULL DEFAULT 'Other',
  storage_place VARCHAR(255) NOT NULL DEFAULT 'Other',
  date_bought DATE,
  date_owned DATE,
  usage_frequency VARCHAR(50) CHECK (usage_frequency IN ('Daily', 'Weekly', 'Monthly', 'Rarely', 'Never')),
  image_url VARCHAR(2048),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Storage places table
CREATE TABLE IF NOT EXISTS storage_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL DEFAULT '#0ea5e9',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_storage_place ON items(storage_place);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_items_usage_frequency ON items(usage_frequency);
