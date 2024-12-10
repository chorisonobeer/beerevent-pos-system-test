import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // スプレッドシートIDをヘッダーから取得
  const spreadsheetId = req.headers["x-spreadsheet-id"];

  if (!spreadsheetId) {
    return res.status(400).json({ error: "Spreadsheet ID is required" });
  }

  try {
    // Google認証の検証
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("Google service account credentials are not configured");
    }

    console.log("Starting Google Sheets authentication...");
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    console.log("Initializing Google Sheets API...");
    const sheets = google.sheets({ version: "v4", auth });

    console.log("Fetching data from spreadsheet...");
    const response = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "商品マスタ!A2:O", // A2:D10 から A2:O に変更して在庫情報も取得
        valueRenderOption: "UNFORMATTED_VALUE",
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

    console.log("Spreadsheet Response:", response.data);

    if (!response.data.values) {
      console.log("No data found in spreadsheet");
      return res.status(200).json([]);
    }

    // データの検証と整形
    console.log("Processing spreadsheet data...");
    const products = response.data.values
      .filter((row) => row[0]) // 商品名が存在する行のみフィルタ
      .map((row, index) => {
        console.log("Processing product row:", row); // デバッグログ追加
        return {
          id: index + 1,
          name: row[0],
          prices: {
            S: parseInt(row[1]) || 0,
            M: parseInt(row[2]) || 0,
            L: parseInt(row[3]) || 0,
          },
          stock: {
            totalLots: parseInt(row[12]) || 0,
            remainingVolume: parseFloat(row[13]) || 0,
            lotVolume: parseInt(row[4]) || 0,
          },
        };
      });

    console.log("Processed products:", products); // デバッグログ追加

    res.status(200).json(products);
  } catch (error) {
    console.error("Error in products API:", {
      message: error.message,
      stack: error.stack,
      spreadsheetId,
      hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT,
    });

    // エラーメッセージの分類と適切なステータスコードの設定
    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.message.includes("認証")) {
      statusCode = 401;
      errorMessage = "認証に失敗しました";
    } else if (error.message.includes("権限")) {
      statusCode = 403;
      errorMessage = "アクセス権限がありません";
    } else if (error.message.includes("見つかりません")) {
      statusCode = 404;
      errorMessage = "スプレッドシートが見つかりません";
    }

    res.status(statusCode).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// 価格のバリデーション関数
function validatePrice(value) {
  const price = Number(value);
  if (isNaN(price) || price < 0) {
    return 0; // 不正な価格は0として扱う
  }
  return price;
}
