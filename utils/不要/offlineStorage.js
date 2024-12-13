import { initDB } from "./indexedDB";

// データの保存
export async function saveOfflineData(key, data) {
  const db = await initDB();
  const tx = db.transaction("offlineData", "readwrite");
  const store = tx.objectStore("offlineData");

  await store.put({
    url: key,
    data: data,
    timestamp: new Date().toISOString(),
  });
}

// データの取得
export async function getOfflineData(key) {
  const db = await initDB();
  const tx = db.transaction("offlineData", "readonly");
  const store = tx.objectStore("offlineData");

  const item = await store.get(key);
  return item?.data || null;
}

// キャッシュの削除
export async function clearOfflineData(key) {
  const db = await initDB();
  const tx = db.transaction("offlineData", "readwrite");
  const store = tx.objectStore("offlineData");

  await store.delete(key);
}

// データの有効期限チェック（24時間）
export async function cleanExpiredData() {
  const db = await initDB();
  const tx = db.transaction("offlineData", "readwrite");
  const store = tx.objectStore("offlineData");
  const items = await store.getAll();

  const now = new Date();
  const expired = items.filter((item) => {
    const timestamp = new Date(item.timestamp);
    const diff = now - timestamp;
    return diff > 24 * 60 * 60 * 1000; // 24時間
  });

  for (const item of expired) {
    await store.delete(item.url);
  }
}
