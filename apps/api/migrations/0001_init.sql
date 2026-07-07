CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL
);
INSERT INTO locations (id, label) VALUES ('daikanyama', '代官山'), ('okinawa', '沖縄');

CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT NOT NULL,
  location TEXT NOT NULL REFERENCES locations(id),
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  description TEXT,
  published_date TEXT,
  page_count INTEGER,
  cover_src TEXT,
  total INTEGER NOT NULL DEFAULT 1 CHECK (total >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT,
  deleted_at TEXT,
  UNIQUE (isbn, location)
);

CREATE TABLE histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id),
  borrower_email TEXT NOT NULL,
  borrower_name TEXT,
  checkout_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  return_date TEXT
);
CREATE INDEX idx_histories_book_active ON histories (book_id, return_date);
CREATE INDEX idx_histories_borrower ON histories (borrower_email);
-- 同一人が同じ本を重複貸出できない（未返却が 1 件まで）
CREATE UNIQUE INDEX idx_histories_active_borrower_book ON histories (book_id, borrower_email) WHERE return_date IS NULL;
