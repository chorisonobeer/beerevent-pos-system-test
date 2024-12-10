import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
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
    const spreadsheetId = req.headers["x-spreadsheet-id"];

    if (!spreadsheetId) {
      return res.status(400).json({ error: "Spreadsheet ID is required" });
    }

    // 商品マスタの取得
    const productsResponse = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "商品マスタ!A2:D10",
        valueRenderOption: "UNFORMATTED_VALUE",
      })
      .catch(handleSheetError);

    // 価格マップの作成と検証
    const priceMap = createPriceMap(productsResponse.data.values);

    // 取引履歴の取得
    const historyResponse = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "取引履歴!A:F",
        valueRenderOption: "FORMATTED_VALUE",
      })
      .catch(handleSheetError);

    const rows = historyResponse.data.values || [];
    if (rows.length === 0) {
      throw new Error("取引履歴が空です");
    }

    const header = validateHeader(rows[0]);
    const updatedRows = [header];

    // 各取引の商品詳細を新形式に変換
    rows.slice(1).forEach((row) => {
      const updatedRow = convertTransactionRow(row, priceMap);
      if (updatedRow) {
        updatedRows.push(updatedRow);
      }
    });

    // バックアップの作成
    await createBackup(sheets, spreadsheetId, rows);

    // 元のシートの更新
    await updateTransactions(sheets, spreadsheetId, updatedRows);

    res.status(200).json({
      success: true,
      message: "Transaction history migration completed",
      totalRows: updatedRows.length - 1,
    });
  } catch (error) {
    console.error("Error migrating transactions:", error);
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
  let errorMessage = "取引履歴の移行に失敗しました";

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

// ヘルパー関数
function createPriceMap(productsData) {
  if (!Array.isArray(productsData)) {
    throw new Error("validation: 商品マスタのデータ形式が不正です");
  }

  const priceMap = {};
  productsData.forEach((row) => {
    if (row && row[0]) {
      priceMap[`${row[0]}(S)`] = validatePrice(row[1]);
      priceMap[`${row[0]}(M)`] = validatePrice(row[2]);
      priceMap[`${row[0]}(L)`] = validatePrice(row[3]);
    }
  });
  return priceMap;
}

function validatePrice(price) {
  const num = Number(price);
  return isNaN(num) ? 0 : num;
}

function validateHeader(header) {
  if (!Array.isArray(header) || header.length < 6) {
    throw new Error("validation: 取引履歴のヘッダー形式が不正です");
  }
  return header;
}

function convertTransactionRow(row, priceMap) {
  if (!Array.isArray(row) || row.length < 2) return null;

  const itemsStr = row[1];
  const itemMatches = itemsStr.match(/([^(]+\([SML]\])\((\d+)個\)/g) || [];

  const updatedItems = itemMatches
    .map((match) => {
      const [_, productWithSize, quantity] =
        match.match(/([^(]+\([SML]\])\((\d+)個\)/) || [];
      const price = priceMap[productWithSize] || 0;
      return `${productWithSize}(${quantity}個)(${price}円)`;
    })
    .join(", ");

  return [
    row[0], // 日時
    updatedItems, // 更新された商品詳細
    row[2], // 合計金額
    row[3], // 支払い金額
    row[4], // お釣り
    row[5], // レジ残高
  ];
}

async function createBackup(sheets, spreadsheetId, rows) {
  await sheets.spreadsheets.values
    .append({
      spreadsheetId,
      range: "取引履歴_backup!A1",
      valueInputOption: "RAW",
      resource: {
        values: rows,
      },
    })
    .catch((error) => {
      throw new Error(`バックアップの作成に失敗しました: ${error.message}`);
    });
}

async function updateTransactions(sheets, spreadsheetId, updatedRows) {
  await sheets.spreadsheets.values
    .update({
      spreadsheetId,
      range: "取引履歴!A1",
      valueInputOption: "RAW",
      resource: {
        values: updatedRows,
      },
    })
    .catch((error) => {
      throw new Error(`取引履歴の更新に失敗しました: ${error.message}`);
    });
}
