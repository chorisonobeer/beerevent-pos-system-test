import {
  withRetry,
  generateCacheKey,
  saveToOfflineCache,
  loadFromOfflineCache,
  addToOfflineQueue,
} from "./errorHandling";

export async function fetchWithSpreadsheetId(url, options = {}) {
  const spreadsheetId = localStorage?.getItem("currentSpreadsheetId");

  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is not set");
  }

  const newOptions = {
    ...options,
    headers: {
      ...options.headers,
      "X-Spreadsheet-ID": spreadsheetId,
      "Content-Type": "application/json",
    },
  };

  const cacheKey = generateCacheKey(url, newOptions);

  try {
    // オフライン時はキャッシュを使用
    if (!navigator.onLine) {
      const cachedData = loadFromOfflineCache(cacheKey);
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error("No cached data available");
    }

    // オンライン時は通常のフェッチ（リトライ付き）
    const response = await withRetry(() => fetch(url, newOptions));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // GETリクエストの場合のみキャッシュ
    if (newOptions.method === undefined || newOptions.method === "GET") {
      saveToOfflineCache(cacheKey, data);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // POSTリクエストの場合、オフラインキューに追加
    if (newOptions.method === "POST") {
      addToOfflineQueue(() => fetch(url, newOptions));
    }

    throw error;
  }
}

export function hasSpreadsheetId() {
  if (typeof window === "undefined") return false;
  return !!localStorage?.getItem("currentSpreadsheetId");
}

export function getCurrentSpreadsheetId() {
  if (typeof window === "undefined") return null;
  return localStorage?.getItem("currentSpreadsheetId");
}
