import { google } from "googleapis";

export default async function handler(req, res) {
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

    if (req.method === "GET") {
      const response = await sheets.spreadsheets.values
        .get({
          spreadsheetId,
          range: "商品マスタ!A2:O10",
          valueRenderOption: "UNFORMATTED_VALUE",
        })
        .catch(handleSheetError);

      const rows = response.data.values || [];
      const products = validateAndFormatProducts(rows);

      res.status(200).json(products);
    } else if (req.method === "POST") {
      const products = validatePostData(req.body);
      const values = formatProductsForSheet(products);

      await sheets.spreadsheets.values
        .update({
          spreadsheetId,
          range: "商品マスタ!A2:O10",
          valueInputOption: "RAW",
          resource: {
            values,
          },
        })
        .catch(handleSheetError);

      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error handling products settings:", error);
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
  let errorMessage = "商品設定の処理に失敗しました";

  if (error.message.includes("validation")) {
    statusCode = 400;
    errorMessage = "入力データが不正です";
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

// バリデーション関数
function validateNumericField(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new Error(
      `validation: ${fieldName}は0以上の数値である必要があります`
    );
  }
  return num;
}

function validateAndFormatProducts(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      if (!row || row.length < 15) return null; // 列数チェックを15に更新

      return {
        name: String(row[0] || ""),
        prices: {
          S: validateNumericField(row[1], 0, "価格"),
          M: validateNumericField(row[2], 0, "価格"),
          L: validateNumericField(row[3], 0, "価格"),
        },
        lotVolume: validateNumericField(row[4], 0, "ロット容量"),
        lotCost: validateNumericField(row[5], 0, "ロットコスト"),
        sizeVolumes: {
          S: validateNumericField(row[6], 0, "容量"),
          M: validateNumericField(row[7], 0, "容量"),
          L: validateNumericField(row[8], 0, "容量"),
        },
        costPerSize: {
          S: validateNumericField(row[9], 0, "原価"),
          M: validateNumericField(row[10], 0, "原価"),
          L: validateNumericField(row[11], 0, "原価"),
        },
        // 新しい列のデータを追加
        totalLots: validateNumericField(row[12], 0, "ロット数"),
        remainingVolume: validateNumericField(row[13], 0, "残量"),
        totalUsedVolume: validateNumericField(row[14], 0, "使用量"),
      };
    })
    .filter((product) => product && product.name);
}

function validatePostData(products) {
  if (!Array.isArray(products)) {
    throw new Error("validation: 商品データは配列である必要があります");
  }

  return products.map((product) => {
    if (!product.name?.trim()) {
      throw new Error("validation: 商品名は必須です");
    }

    return {
      name: product.name.trim(),
      prices: {
        S: validateNumericField(product.prices?.S, "S価格"),
        M: validateNumericField(product.prices?.M, "M価格"),
        L: validateNumericField(product.prices?.L, "L価格"),
      },
      lotVolume: validateNumericField(product.lotVolume, "ロット容量"),
      lotCost: validateNumericField(product.lotCost, "ロットコスト"),
      sizeVolumes: {
        S: validateNumericField(product.sizeVolumes?.S, "Sサイズ容量"),
        M: validateNumericField(product.sizeVolumes?.M, "Mサイズ容量"),
        L: validateNumericField(product.sizeVolumes?.L, "Lサイズ容量"),
      },
      costPerSize: {
        S: validateNumericField(product.costPerSize?.S, "S原価"),
        M: validateNumericField(product.costPerSize?.M, "M原価"),
        L: validateNumericField(product.costPerSize?.L, "L原価"),
      },
      // 新しい列のバリデーションを追加
      totalLots: validateNumericField(product.totalLots, "ロット数"),
      remainingVolume: validateNumericField(product.remainingVolume, "残量"),
      totalUsedVolume: validateNumericField(product.totalUsedVolume, "使用量"),
    };
  });
}

function formatProductsForSheet(products) {
  return products.map((product) => [
    product.name,
    product.prices.S,
    product.prices.M,
    product.prices.L,
    product.lotVolume,
    product.lotCost,
    product.sizeVolumes.S,
    product.sizeVolumes.M,
    product.sizeVolumes.L,
    product.costPerSize.S,
    product.costPerSize.M,
    product.costPerSize.L,
    product.totalLots,
    product.remainingVolume,
    product.totalUsedVolume,
  ]);
}
