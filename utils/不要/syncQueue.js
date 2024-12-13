import { initDB } from "./indexedDB";

// 同期キューへの追加
export async function addToSyncQueue(operation) {
  const db = await initDB();
  const tx = db.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");

  await store.add({
    operation,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  });
}

// 同期キューの処理
export async function processSyncQueue() {
  const db = await initDB();
  const tx = db.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");
  const queue = await store.getAll();

  for (const item of queue) {
    try {
      await processQueueItem(item, store);
    } catch (error) {
      console.error("Sync failed for item:", error);
      if (item.retryCount < 3) {
        item.retryCount++;
        await store.put(item);
      }
    }
  }
}

// 個別のキューアイテムの処理
async function processQueueItem(item, store) {
  const { operation } = item;

  try {
    await fetch(operation.url, {
      method: operation.method,
      headers: {
        "Content-Type": "application/json",
        "X-Spreadsheet-ID": localStorage.getItem("currentSpreadsheetId"),
      },
      body: JSON.stringify(operation.data),
    });

    await store.delete(item.id);
  } catch (error) {
    throw new Error(`Failed to process queue item: ${error.message}`);
  }
}

// オンライン復帰時の処理
export function setupSyncListener() {
  window.addEventListener("online", () => {
    processSyncQueue().catch(console.error);
  });
}
