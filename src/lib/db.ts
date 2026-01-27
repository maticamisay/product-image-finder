import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'products.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    url TEXT NOT NULL,
    local_path TEXT,
    selected INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE INDEX IF NOT EXISTS idx_images_product ON images(product_id);
`);

export interface Product {
  id: string;
  name: string;
  created_at: string;
}

export interface Image {
  id: string;
  product_id: string;
  url: string;
  local_path: string | null;
  selected: number;
  created_at: string;
}

export function createProduct(id: string, name: string): void {
  const stmt = db.prepare('INSERT OR IGNORE INTO products (id, name) VALUES (?, ?)');
  stmt.run(id, name);
}

export function getAllProducts(): Product[] {
  return db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as Product[];
}

export function getProductById(id: string): Product | undefined {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
}

export function deleteProduct(id: string): void {
  db.prepare('DELETE FROM images WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

export function createImage(id: string, productId: string, url: string, localPath?: string): void {
  const stmt = db.prepare('INSERT INTO images (id, product_id, url, local_path) VALUES (?, ?, ?, ?)');
  stmt.run(id, productId, url, localPath || null);
}

export function getImagesByProduct(productId: string): Image[] {
  return db.prepare('SELECT * FROM images WHERE product_id = ? ORDER BY created_at').all(productId) as Image[];
}

export function updateImageSelection(id: string, selected: boolean): void {
  db.prepare('UPDATE images SET selected = ? WHERE id = ?').run(selected ? 1 : 0, id);
}

export function updateImageLocalPath(id: string, localPath: string): void {
  db.prepare('UPDATE images SET local_path = ? WHERE id = ?').run(localPath, id);
}

export function getSelectedImagesByProduct(productId: string): Image[] {
  return db.prepare('SELECT * FROM images WHERE product_id = ? AND selected = 1').all(productId) as Image[];
}

export function deleteImage(id: string): void {
  db.prepare('DELETE FROM images WHERE id = ?').run(id);
}

export function clearAllData(): void {
  db.prepare('DELETE FROM images').run();
  db.prepare('DELETE FROM products').run();
}

export default db;
