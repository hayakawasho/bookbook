CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT NOT NULL,
  location TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  description TEXT,
  published_date TEXT,
  page_count INTEGER,
  cover_src TEXT,
  total INTEGER NOT NULL DEFAULT 1 CHECK (total >= 0),
  available_count INTEGER NOT NULL DEFAULT 1 CHECK (available_count >= 0 AND available_count <= total),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT,
  UNIQUE (isbn, location)
);

CREATE TABLE histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER REFERENCES books(id),
  isbn TEXT NOT NULL,
  location TEXT NOT NULL,
  borrower_email TEXT NOT NULL,
  borrower_name TEXT,
  checkout_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  return_date TEXT,
  is_done INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_histories_borrower ON histories (borrower_email, location, is_done);
