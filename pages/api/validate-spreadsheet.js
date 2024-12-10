import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { spreadsheetId } = req.body;

  if (!spreadsheetId) {
    return res.status(400).json({ message: "Spreadsheet ID is required" });
  }

  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("Google service account credentials are not configured");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // スプレッドシートの基本情報を取得してアクセス可能か確認
    const spreadsheetInfo = await sheets.spreadsheets
      .get({
        spreadsheetId: spreadsheetId,
      })
      .catch((error) => {
        if (error.code === 404) {
          throw new Error("スプレッドシートが見つかりません");
        }
        if (error.code === 403) {
          throw new Error("スプレッドシートへのアクセス権限がありません");
        }
        throw error;
      });

    // 必要なシートの存在確認
    const requiredSheets = ["商品マスタ", "取引履歴", "イベント設定"];
    const sheetResponse = await sheets.spreadsheets
      .get({
        spreadsheetId: spreadsheetId,
        fields: "sheets.properties.title",
      })
      .catch((error) => {
        if (error.code === 404) {
          throw new Error("シート情報の取得に失敗しました");
        }
        throw error;
      });

    const existingSheets = sheetResponse.data.sheets.map(
      (sheet) => sheet.properties.title
    );

    // 必要なシートの存在チェック
    const missingSheets = requiredSheets.filter(
      (sheet) => !existingSheets.includes(sheet)
    );

    if (missingSheets.length > 0) {
      return res.status(400).json({
        message: `Required sheets missing: ${missingSheets.join(", ")}`,
      });
    }

    // シート構造の検証
    await validateSheetStructure(sheets, spreadsheetId);

    res.status(200).json({ valid: true });
  } catch (error) {
    console.error("Validation error:", error);

    let statusCode = 500;
    let errorMessage = "スプレッドシートの検証に失敗しました";

    if (error.message.includes("認証")) {
      statusCode = 401;
      errorMessage = "認証に失敗しました";
    } else if (error.message.includes("権限")) {
      statusCode = 403;
      errorMessage = "アクセス権限がありません";
    } else if (error.message.includes("見つかりません")) {
      statusCode = 404;
      errorMessage = "スプレッドシートが見つかりません";
    } else if (error.message.includes("structure")) {
      statusCode = 400;
      errorMessage = "シート構造が不正です";
    }

    res.status(statusCode).json({
      message: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

async function validateSheetStructure(sheets, spreadsheetId) {
  // 商品マスタの構造確認
  const productMasterHeader = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "商品マスタ!A1:L1",
  });

  if (
    !productMasterHeader.data.values?.[0] ||
    productMasterHeader.data.values[0].length < 12
  ) {
    throw new Error("structure: 商品マスタのヘッダー構造が不正です");
  }

  // 取引履歴の構造確認
  const transactionHeader = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "取引履歴!A1:F1",
  });

  if (
    !transactionHeader.data.values?.[0] ||
    transactionHeader.data.values[0].length < 6
  ) {
    throw new Error("structure: 取引履歴のヘッダー構造が不正です");
  }

  // イベント設定の構造確認
  const eventSettingsCheck = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "イベント設定!A1:B12",
  });

  if (
    !eventSettingsCheck.data.values ||
    eventSettingsCheck.data.values.length < 12
  ) {
    throw new Error("structure: イベント設定の構造が不正です");
  }
}
