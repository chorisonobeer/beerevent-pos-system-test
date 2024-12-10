// リトライ設定
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // ミリ秒

// API呼び出し用のリトライラッパー
export async function withRetry(operation, retryCount = RETRY_COUNT) {
  for (let i = 0; i < retryCount; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retryCount - 1) throw error;

      // ネットワークエラーの場合のみリトライ
      if (!error.message.includes("Failed to fetch")) throw error;

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY * (i + 1))
      );
    }
  }
}

// オフラインキャッシュのキー生成
export function generateCacheKey(endpoint, params = {}) {
  return `pos_cache_${endpoint}_${JSON.stringify(params)}`;
}

// オフラインキャッシュの保存
export function saveToOfflineCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: new Date().getTime(),
      })
    );
  } catch (error) {
    console.error("Cache save error:", error);
  }
}

// オフラインキャッシュからの読み込み
export function loadFromOfflineCache(key, maxAge = 3600000) {
  // デフォルト1時間
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (new Date().getTime() - timestamp > maxAge) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Cache load error:", error);
    return null;
  }
}

// オフラインキューの管理
export function addToOfflineQueue(operation) {
  try {
    const queue = JSON.parse(localStorage.getItem("pos_offline_queue") || "[]");
    queue.push({
      operation,
      timestamp: new Date().getTime(),
    });
    localStorage.setItem("pos_offline_queue", JSON.stringify(queue));
  } catch (error) {
    console.error("Queue save error:", error);
  }
}

// オフラインキューの処理
export async function processOfflineQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem("pos_offline_queue") || "[]");
    if (queue.length === 0) return;

    const newQueue = [];
    for (const item of queue) {
      try {
        await withRetry(() => item.operation());
      } catch (error) {
        newQueue.push(item);
      }
    }

    localStorage.setItem("pos_offline_queue", JSON.stringify(newQueue));
  } catch (error) {
    console.error("Queue processing error:", error);
  }
}

// オンライン状態の監視
export function setupOnlineListener(callback) {
  window.addEventListener("online", () => {
    callback(true);
    processOfflineQueue();
  });

  window.addEventListener("offline", () => {
    callback(false);
  });
}
