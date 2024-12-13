import { initDB } from "./indexedDB";

// 定数定義
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1秒
const ERROR_STORE = "errorLogs";
const MAX_LOG_AGE = 7 * 24 * 60 * 60 * 1000; // 7日間

// APIコール用のリトライラッパー
export async function withRetry(operation, retryCount = 0) {
  try {
    return await operation();
  } catch (error) {
    if (retryCount >= MAX_RETRY_COUNT) {
      throw error;
    }
    // ネットワークエラーの場合のみリトライ
    if (!error.message.includes("Failed to fetch")) {
      throw error;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, RETRY_DELAY * (retryCount + 1))
    );
    return withRetry(operation, retryCount + 1);
  }
}

// エラーメッセージの標準化
export function normalizeError(error) {
  // ネットワークエラー
  if (!navigator.onLine) {
    return {
      code: "OFFLINE",
      message: "インターネット接続がありません",
    };
  }

  // API エラー
  if (error.response) {
    const status = error.response.status;
    switch (status) {
      case 401:
        return {
          code: "AUTH_ERROR",
          message: "認証に失敗しました",
        };
      case 403:
        return {
          code: "PERMISSION_ERROR",
          message: "アクセス権限がありません",
        };
      case 404:
        return {
          code: "NOT_FOUND",
          message: "リソースが見つかりません",
        };
      default:
        return {
          code: "API_ERROR",
          message: "サーバーエラーが発生しました",
        };
    }
  }

  // その他のエラー
  return {
    code: "UNKNOWN_ERROR",
    message: "エラーが発生しました",
  };
}

// データ整合性チェック
export function validateSyncData(localData, serverData) {
  try {
    const localTimestamp = new Date(localData.timestamp);
    const serverTimestamp = new Date(serverData.timestamp);

    return {
      isValid: localTimestamp <= serverTimestamp,
      needsUpdate: localTimestamp < serverTimestamp,
      conflicted: localTimestamp > serverTimestamp,
    };
  } catch (error) {
    return {
      isValid: false,
      needsUpdate: true,
      conflicted: false,
    };
  }
}

// エラーログの記録
export async function logError(error, context = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: normalizeError(error),
    context: {
      url: window.location.href,
      online: navigator.onLine,
      ...context,
    },
  };

  // 開発環境ではコンソールに出力
  if (process.env.NODE_ENV === "development") {
    console.error("Error logged:", errorLog);
  }

  // エラーログの保存とクリーンアップ
  await saveErrorLog(errorLog);
}

// エラーログの保存
async function saveErrorLog(errorLog) {
  try {
    const db = await initDB();
    const tx = db.transaction(ERROR_STORE, "readwrite");
    const store = tx.objectStore(ERROR_STORE);

    await store.add(errorLog);
    await cleanOldLogs(store);
  } catch (error) {
    console.error("Failed to save error log:", error);
  }
}

// 古いログの削除
async function cleanOldLogs(store) {
  try {
    const logs = await store.getAll();
    const cutoffDate = new Date(Date.now() - MAX_LOG_AGE);

    for (const log of logs) {
      if (new Date(log.timestamp) < cutoffDate) {
        await store.delete(log.id);
      }
    }
  } catch (error) {
    console.error("Failed to clean old logs:", error);
  }
}

// オフラインエラー復旧処理
export async function handleOfflineRecovery() {
  if (!navigator.onLine) return;

  const db = await initDB();
  const tx = db.transaction(ERROR_STORE, "readonly");
  const store = tx.objectStore(ERROR_STORE);
  const logs = await store.getAll();

  const offlineErrors = logs.filter((log) => log.error.code === "OFFLINE");
  for (const error of offlineErrors) {
    try {
      // リトライロジックの実行
      await withRetry(async () => {
        // ここで実際の再試行処理を実装
        // 例: APIリクエストの再実行など
      });
    } catch (retryError) {
      console.error("Recovery failed for error:", retryError);
    }
  }
}
