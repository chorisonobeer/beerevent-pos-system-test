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
    // Google認証の検証
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("Google service account credentials are not configured");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // レジ準備金を取得
    const settingsResponse = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "イベント設定!B4",
        valueRenderOption: "UNFORMATTED_VALUE",
      })
      .catch((error) => {
        if (error.code === 404) {
          throw new Error("シートが見つかりません");
        }
        if (error.code === 403) {
          throw new Error("シートへのアクセス権限がありません");
        }
        throw error;
      });

    const initialBalance = validateBalance(
      settingsResponse.data.values?.[0]?.[0]
    );

    // 取引履歴から本日の取引のみを取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const response = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "取引履歴!A2:F",
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      })
      .catch((error) => {
        if (error.code === 404) {
          throw new Error("取引履歴シートが見つかりません");
        }
        throw error;
      });

    const transactions = validateTransactions(response.data.values || []);
    let todayTotal = 0;
    let totalBalance = initialBalance;

    transactions.forEach((row) => {
      const amount = validateAmount(row[2]);
      totalBalance += amount;

      if (row[0]) {
        const transactionDate = new Date(row[0]);
        transactionDate.setHours(0, 0, 0, 0);
        if (transactionDate.getTime() === today.getTime()) {
          todayTotal += amount;
        }
      }
    });

    res.status(200).json({
      balance: totalBalance,
      todaySales: todayTotal,
    });
  } catch (error) {
    console.error("Error fetching register balance:", error);

    let statusCode = 500;
    let errorMessage = "レジ残高の取得に失敗しました";

    if (error.message.includes("認証")) {
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
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// バリデーション関数群
function validateBalance(value) {
  const balance = Number(value);
  return isNaN(balance) || balance < 0 ? 50000 : balance;
}

function validateAmount(value) {
  const amount = Number(value);
  return isNaN(amount) ? 0 : amount;
}

function validateTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    return [];
  }
  return transactions.filter(
    (row) =>
      Array.isArray(row) &&
      row.length >= 3 &&
      row[0] && // 日付が存在
      !isNaN(new Date(row[0]).getTime()) // 有効な日付
  );
}
