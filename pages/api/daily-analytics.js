import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 日付パラメータの検証
    const dateParam = req.query.date;
    if (!dateParam) {
      return res.status(400).json({ error: "Date parameter is required" });
    }

    const targetDate = new Date(dateParam);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date parameter" });
    }
    targetDate.setHours(0, 0, 0, 0);

    // Google認証の検証
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("Google service account credentials are not configured");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = req.headers["x-spreadsheet-id"];

    if (!spreadsheetId) {
      return res.status(400).json({ error: "Spreadsheet ID is required" });
    }

    // 取引履歴を取得
    const historyResponse = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "取引履歴!A:C",
        valueRenderOption: "FORMATTED_VALUE",
      })
      .catch(handleSheetError);

    // イベント設定を取得
    const settingsResponse = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "イベント設定!B1:B10",
        valueRenderOption: "FORMATTED_VALUE",
      })
      .catch(handleSheetError);

    const settings = settingsResponse.data.values || [];
    const targetSales = validateNumeric(settings[3], "目標売上");

    // 日次データの集計
    const rows = validateTransactionRows(historyResponse.data.values);
    const dailyData = aggregateDailyData(rows, targetDate, targetSales);

    res.status(200).json(dailyData);
  } catch (error) {
    console.error("Error fetching daily analytics:", error);
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
  let errorMessage = "データの取得に失敗しました";

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
function validateNumeric(value, fieldName) {
  const num = Number(value?.replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) {
    throw new Error(`validation: ${fieldName}が不正です`);
  }
  return num;
}

function validateTransactionRows(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("validation: 取引データが不正です");
  }
  return rows;
}

function aggregateDailyData(rows, targetDate, targetSales) {
  let dailyData = {
    totalSales: 0,
    totalTransactions: 0,
    productSales: {},
    targetProgress: 0,
  };

  // 商品名を正規化する関数
  const normalizeProductName = (name) => {
    return name.replace(/\s+/g, "").replace(/,/g, "").trim();
  };

  // ヘッダー行をスキップして集計
  rows.slice(1).forEach((row) => {
    const transactionDate = new Date(row[0]);
    transactionDate.setHours(0, 0, 0, 0);

    if (transactionDate.getTime() === targetDate.getTime()) {
      const amount = validateNumeric(row[2], "取引金額");
      const itemsStr = row[1];

      dailyData.totalSales += amount;
      dailyData.totalTransactions += 1;

      // 商品別売上の集計
      const itemMatches = itemsStr.match(/(.+?)\(\d+個\)\(\d+円\)/g) || [];
      itemMatches.forEach((match) => {
        const fullMatch = match.match(/(.+?)\((\d+)個\)\((\d+)円\)/);
        if (fullMatch) {
          const [_, fullName, quantity, price] = fullMatch;
          let baseName = fullName.match(/(.+?)\([SML]\)/)?.[1] || fullName;
          const normalizedName = normalizeProductName(baseName);
          const cleanDisplayName = baseName.trim();

          if (!dailyData.productSales[normalizedName]) {
            dailyData.productSales[normalizedName] = {
              quantity: 0,
              total: 0,
              displayName: cleanDisplayName,
            };
          }

          const itemQuantity = parseInt(quantity);
          const itemPrice = parseInt(price);
          if (!isNaN(itemQuantity) && !isNaN(itemPrice)) {
            dailyData.productSales[normalizedName].quantity += itemQuantity;
            dailyData.productSales[normalizedName].total +=
              itemQuantity * itemPrice;
          }
        }
      });
    }
  });

  // 目標に対する進捗率の計算
  dailyData.targetProgress = (dailyData.totalSales / targetSales) * 100;

  // 商品別売上を配列形式に変換
  dailyData.productSales = Object.entries(dailyData.productSales)
    .map(([key, data]) => ({
      name: data.displayName || key,
      quantity: data.quantity,
      total: Math.round(data.total),
    }))
    .sort((a, b) => b.total - a.total);

  return dailyData;
}
