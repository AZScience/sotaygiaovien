/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SQLite wrapper dùng sql.js (WebAssembly) + IndexedDB để lưu trữ lâu dài.
 * Dữ liệu được serialize toàn bộ AppDatabase thành JSON và lưu trong 1 bảng SQLite
 * để đảm bảo tương thích ngược 100% với toàn bộ code hiện tại.
 *
 * Chiến lược:
 *   - Dữ liệu lưu trong bảng `app_data` với key/value JSON blob
 *   - Mỗi khi save, xuất DB ra Uint8Array -> lưu vào IndexedDB
 *   - Khi load, đọc từ IndexedDB -> nạp lại vào sql.js -> query
 *   - Migration tự động: nếu có dữ liệu cũ trong localStorage, import vào SQLite
 */

import type { AppDatabase } from '../types';

const IDB_DB_NAME = 'SoTayGiaoVienSQLite';
const IDB_STORE_NAME = 'sqlite_blobs';
const IDB_KEY = 'main_db';
const LS_KEY = 'so_tay_giao_vien_db_raw_v1'; // key localStorage cũ để migrate

// Singleton SQL.js instance
let SQL: any = null;
let sqliteDb: any = null;

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<Uint8Array | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const req = tx.objectStore(IDB_STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: Uint8Array): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── sql.js loader ────────────────────────────────────────────────────────────

async function getSql(): Promise<any> {
  if (SQL) return SQL;
  // @ts-ignore
  const initSqlJs = (await import('sql.js')).default;
  SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });
  return SQL;
}

// ─── DB Schema ────────────────────────────────────────────────────────────────

function ensureSchema(db: any) {
  db.run(`
    CREATE TABLE IF NOT EXISTS app_data (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ─── Core: load / save ────────────────────────────────────────────────────────

/**
 * Khởi tạo SQLite DB từ IndexedDB (hoặc tạo mới nếu chưa có).
 * Tự động migrate dữ liệu cũ từ localStorage sang SQLite lần đầu.
 */
export async function initSQLiteDB(): Promise<void> {
  if (sqliteDb) return; // đã khởi tạo rồi

  const sql = await getSql();

  // Thử load blob đã lưu từ IndexedDB
  const blob = await idbGet(IDB_KEY);

  if (blob) {
    sqliteDb = new sql.Database(blob);
    ensureSchema(sqliteDb);
    console.log('[SQLite] Đã nạp DB từ IndexedDB, size:', blob.byteLength, 'bytes');
  } else {
    // Tạo DB mới
    sqliteDb = new sql.Database();
    ensureSchema(sqliteDb);

    // ── Migration: nếu có dữ liệu cũ trong localStorage thì import vào SQLite
    try {
      const lsRaw = localStorage.getItem(LS_KEY);
      if (lsRaw) {
        const parsed = JSON.parse(lsRaw);
        if (parsed?.classes && parsed?.activeClassId) {
          sqliteDb.run(
            `INSERT OR REPLACE INTO app_data(key, value) VALUES (?, ?)`,
            ['app_database', lsRaw]
          );
          await persistSQLiteDB();
          console.log('[SQLite] Migration từ localStorage thành công!');
          return;
        }
      }
    } catch (e) {
      console.warn('[SQLite] Không thể migrate từ localStorage:', e);
    }

    console.log('[SQLite] Tạo DB mới (chưa có dữ liệu trước đó)');
  }
}

/** Xuất DB sang Uint8Array và ghi vào IndexedDB */
export async function persistSQLiteDB(): Promise<void> {
  if (!sqliteDb) return;
  const data: Uint8Array = sqliteDb.export();
  await idbSet(IDB_KEY, data);
}

export interface BackupInfo {
  id: string;
  date: string;
  sizeBytes: number;
}

/** Tạo một bản sao lưu (Backup) mới vào IndexedDB */
export async function createBackup(): Promise<void> {
  const data = await idbGet(IDB_KEY);
  if (!data) throw new Error('Không tìm thấy dữ liệu hiện tại để sao lưu');
  const backupId = `backup_${Date.now()}`;
  await idbSet(backupId, data);
}

/** Lấy danh sách các bản sao lưu hiện có */
export async function getBackups(): Promise<BackupInfo[]> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const store = tx.objectStore(IDB_STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = req.result as string[];
      const backupKeys = keys.filter(k => k.startsWith('backup_')).sort().reverse();
      
      const backups: BackupInfo[] = backupKeys.map(k => {
        const tsStr = k.replace('backup_', '');
        const ts = parseInt(tsStr, 10);
        return {
          id: k,
          date: new Date(ts).toLocaleString('vi-VN'),
          sizeBytes: 0 // Size query requires getting all blobs, which might be slow. Omit for now or just set 0.
        };
      });
      resolve(backups);
    };
    req.onerror = () => reject(tx.error);
  });
}

/** Khôi phục từ một bản sao lưu */
export async function restoreBackup(backupId: string): Promise<void> {
  const data = await idbGet(backupId);
  if (!data) throw new Error('Không tìm thấy bản sao lưu này');
  await idbSet(IDB_KEY, data); // Đè lên main_db
}

/** Xóa một bản sao lưu */
export async function deleteBackup(backupId: string): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).delete(backupId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Đọc AppDatabase từ SQLite */
export function sqliteLoad(): AppDatabase | null {
  if (!sqliteDb) return null;
  try {
    const result = sqliteDb.exec(
      `SELECT value FROM app_data WHERE key = 'app_database' LIMIT 1`
    );
    if (result.length > 0 && result[0].values.length > 0) {
      const raw = result[0].values[0][0] as string;
      return JSON.parse(raw) as AppDatabase;
    }
  } catch (e) {
    console.error('[SQLite] Lỗi đọc dữ liệu:', e);
  }
  return null;
}

/** Ghi AppDatabase vào SQLite và persist vào IndexedDB */
export async function sqliteSave(db: AppDatabase): Promise<void> {
  if (!sqliteDb) return;
  try {
    const json = JSON.stringify(db);
    sqliteDb.run(
      `INSERT OR REPLACE INTO app_data(key, value) VALUES (?, ?)`,
      ['app_database', json]
    );
    // Persist async (không block UI)
    persistSQLiteDB().catch(e => console.warn('[SQLite] Persist thất bại:', e));
  } catch (e) {
    console.error('[SQLite] Lỗi ghi dữ liệu:', e);
  }
}

/** Xuất file .db để download */
export function sqliteExportFile(): void {
  if (!sqliteDb) {
    alert('SQLite chưa sẵn sàng!');
    return;
  }
  const data: Uint8Array = sqliteDb.export();
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SoTayGiaoVien_${new Date().toISOString().split('T')[0]}.db`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Trạng thái khởi tạo SQLite (để hiển thị trong UI) */
export function isSQLiteReady(): boolean {
  return sqliteDb !== null;
}

/** Thông tin DB: số bytes, số bảng */
export function getSQLiteInfo(): { sizeBytes: number; ready: boolean } {
  if (!sqliteDb) return { sizeBytes: 0, ready: false };
  try {
    const data: Uint8Array = sqliteDb.export();
    return { sizeBytes: data.byteLength, ready: true };
  } catch {
    return { sizeBytes: 0, ready: true };
  }
}
