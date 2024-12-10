import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const spreadsheetId = req.headers["x-spreadsheet-id"];

  if (!spreadsheetId) {
    return res.status(400).json({ error: "Spreadsheet ID is required" });
  }

  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("Google service account credentials are not configured");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 本日の日付を取得（時刻を00:00:00に設定）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const response = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "取引履歴!A:C",
        valueRenderOption: "FORMATTED_VALUE",
      })
      .catch(handleSheetError);

    const rows = validateTransactionRows(response.data.values);
    let dailyTotal = calculateDailyTotal(rows, today);

    res.status(200).json({ total: dailyTotal });
  } catch (error) {
    console.error("Error fetching daily total:", error);
    handleApiError(error, res);
  }
}

// エラーハンドリング関数
function handleSheetError(error) {
  if (error.code === 404) {
    throw new Error("シートが見つかりません");
  }
  if (error.code === 403) {
    throw new Error("シートへのアクセス権限がありません");
  }
  throw error;
}

function handleApiError(error, res) {
  let statusCode = 500;
  let errorMessage = "日次売上の取得に失敗しました";

  if (error.message.includes("validation")) {
    statusCode = 400;
    errorMessage = "データ形式が不正です";
  } else if (error.message.includes("認証")) {
    statusCode = 401;
    errorMessage = "認証に失敗しました";
  } else if (error.message.includes("権限")) {
    statusCode = 403;
    errorMessage = "アクセス権限がありません";
  } else if (error.message.includes("見つかりません")) {
    statusCode = 404;
    errorMessage = "シートが見つかりません";
  }

  res.status(statusCode).json({
    error: errorMessage,
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
}

// バリデーションとデータ処理関数
function validateTransactionRows(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("validation: 取引データが不正です");
  }
  return rows;
}

function calculateDailyTotal(rows, targetDate) {
  let dailyTotal = 0;

  // ヘッダー行をスキップして集計
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[0]) {
      const transactionDate = new Date(row[0]);
      transactionDate.setHours(0, 0, 0, 0);

      if (transactionDate.getTime() === targetDate.getTime()) {
        const amount = parseAmount(row[2]);
        if (!isNaN(amount)) {
          dailyTotal += amount;
        }
      }
    }
  }

  return dailyTotal;
}

function parseAmount(amountStr) {
  if (typeof amountStr !== "string" && typeof amountStr !== "number") {
    return 0;
  }
  // 数値以外の文字を除去して変換
  const amount = Number(String(amountStr).replace(/[^0-9.-]+/g, ""));
  return isNaN(amount) ? 0 : amount;
}
