import { normalizeError } from "./errorHandling";

// キャッシュのキー生成
const getCacheKey = (url, spreadsheetId) => `cache_${spreadsheetId}_${url}`;

export async function fetchWithSpreadsheetId(url, options = {}) {
  const spreadsheetId = localStorage.getItem("currentSpreadsheetId");

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

  // GETリクエストの場合のみキャッシュを使用
  const isGetRequest = !options.method || options.method === "GET";
  const cacheKey = getCacheKey(url, spreadsheetId);

  try {
    if (!navigator.onLine) {
      if (isGetRequest) {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          return new Response(cachedData, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      throw new Error("オフライン時はデータを取得できません");
    }

    const response = await fetch(url, newOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    // GETリクエストの場合はキャッシュを更新
    if (isGetRequest) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(responseData));
      } catch (e) {
        // localStorage容量超過などのエラーを無視
        console.warn("Cache update failed:", e);
      }
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const normalizedError = normalizeError(error);
    console.error("API Error:", normalizedError);
    throw normalizedError;
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

// キャッシュクリーンアップ（古いキャッシュを削除）
export function cleanupCache() {
  if (typeof window === "undefined") return;

  const currentSpreadsheetId = getCurrentSpreadsheetId();
  if (!currentSpreadsheetId) return;

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("cache_") && !key.includes(currentSpreadsheetId)) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn("Cache cleanup failed:", e);
      }
    }
  });
}
