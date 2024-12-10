import { google } from "googleapis";

// API Routeハンドラー関数を正しく定義
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // リクエストヘッダーのログ
  console.log("Received transaction request:", {
    headers: req.headers,
    body: req.body,
  });

  const spreadsheetId = req.headers["x-spreadsheet-id"];

  if (!spreadsheetId) {
    return res.status(400).json({ error: "Spreadsheet ID is required" });
  }

  try {
    // リクエストボディの検証
    const { items, total, payment, change, timestamp, newBalance } =
      validateRequestBody(req.body);

    // Google認証の検証
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("Google service account credentials are not configured");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 商品詳細の文字列を作成と検証
    const itemsDetails = validateAndFormatItems(items);

    // スプレッドシートに追加する行データ
    const rowData = [
      [
        new Date(timestamp).toLocaleString("ja-JP"), // 日時
        itemsDetails, // 商品詳細
        total, // 合計金額
        payment, // 支払い金額
        change, // お釣り
        newBalance, // 新しいレジ残高
      ],
    ];

    console.log("Recording transaction:", rowData); // デバッグログ追加

    // スプレッドシートに行を追加
    await sheets.spreadsheets.values
      .append({
        spreadsheetId,
        range: "取引履歴!A:F",
        valueInputOption: "USER_ENTERED",
        resource: {
          values: rowData,
        },
      })
      .catch((error) => {
        if (error.code === 404) {
          throw new Error("取引履歴シートが見つかりません");
        }
        if (error.code === 403) {
          throw new Error("シートへのアクセス権限がありません");
        }
        throw error;
      });

    await updateProductVolumes(sheets, spreadsheetId, items);

    res.status(200).json({
      success: true,
      message: "Transaction recorded successfully",
      data: rowData[0],
    });
  } catch (error) {
    console.error("Error recording transaction:", {
      message: error.message,
      stack: error.stack,
      spreadsheetId,
    });

    let statusCode = 500;
    let errorMessage = "取引の記録に失敗しました";

    if (error.message.includes("validation")) {
      statusCode = 400;
      errorMessage = "リクエストデータが不正です";
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
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// バリデーション関数群は変更なし
function validateRequestBody(body) {
  const { items, total, payment, change, timestamp, newBalance } = body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("validation: items must be a non-empty array");
  }

  if (typeof total !== "number" || total < 0) {
    throw new Error("validation: invalid total amount");
  }

  if (typeof payment !== "number" || payment < 0) {
    throw new Error("validation: invalid payment amount");
  }

  if (typeof change !== "number") {
    throw new Error("validation: invalid change amount");
  }

  if (!timestamp || isNaN(new Date(timestamp).getTime())) {
    throw new Error("validation: invalid timestamp");
  }

  if (typeof newBalance !== "number" || newBalance < 0) {
    throw new Error("validation: invalid balance amount");
  }

  return { items, total, payment, change, timestamp, newBalance };
}

function validateAndFormatItems(items) {
  try {
    return items
      .map((item) => {
        if (
          !item.name ||
          typeof item.quantity !== "number" ||
          typeof item.price !== "number" ||
          item.quantity <= 0 ||
          item.price < 0
        ) {
          throw new Error("validation: invalid item data");
        }
        // フォーマット修正: 商品名(サイズ)(個数)(単価)の形式に統一
        return `${item.name}(${item.quantity}個)(${item.price}円)`;
      })
      .join(", ");
  } catch (error) {
    throw new Error("validation: failed to format items");
  }
}

async function updateProductVolumes(sheets, spreadsheetId, items) {
  try {
    // 現在の商品データを取得
    const productsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "商品マスタ!A2:O",
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const products = productsResponse.data.values || [];
    const updates = [];

    items.forEach((item) => {
      const productMatch = item.name.match(/(.+?)\(([SML])\)/);
      if (productMatch) {
        const [_, productName, size] = productMatch;
        const productRow = products.findIndex((p) => p[0] === productName);

        if (productRow !== -1) {
          const product = products[productRow];
          const sizeVolume =
            size === "S" ? product[6] : size === "M" ? product[7] : product[8];

          let usedVolume = product[14] + sizeVolume * item.quantity;
          let remainingVolume = product[4] - (usedVolume % product[4]);
          let totalLots = product[12];

          // ロット数と残量の計算
          if (remainingVolume <= 0) {
            totalLots--;
            if (totalLots >= 0) {
              remainingVolume = product[4] + remainingVolume;
            }
          }

          updates.push({
            range: `商品マスタ!M${productRow + 2}:O${productRow + 2}`,
            values: [[totalLots, remainingVolume, usedVolume]],
          });
        }
      }
    });

    // 一括更新
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: "RAW",
          data: updates,
        },
      });
    }
  } catch (error) {
    console.error("Error updating product volumes:", error);
  }
}

export default handler;
