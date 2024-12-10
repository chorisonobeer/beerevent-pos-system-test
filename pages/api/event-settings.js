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

    // GET処理
    if (req.method === "GET") {
      try {
        // イベント設定の取得
        const settingsResponse = await sheets.spreadsheets.values
          .get({
            spreadsheetId,
            range: "イベント設定!B1:B11",
            valueRenderOption: "UNFORMATTED_VALUE",
          })
          .catch(handleSheetError);

        // 商品マスタの取得
        const productsResponse = await sheets.spreadsheets.values
          .get({
            spreadsheetId,
            range: "商品マスタ!A2:L100",
            valueRenderOption: "UNFORMATTED_VALUE",
          })
          .catch(handleSheetError);

        // デバッグログ追加
        console.log("Settings Response:", settingsResponse.data.values);

        const settingsValues =
          settingsResponse.data.values?.map((row) => row?.[0]) || [];
        const products = validateAndFormatProducts(
          productsResponse.data.values || []
        );

        // 数値フィールドの検証と変換を行う関数
        function validateNumericField(value, defaultValue) {
          const num = Number(value);
          return isNaN(num) ? defaultValue : num;
        }

        const settings = {
          eventName: settingsValues[0] || "",
          startDate: settingsValues[1] || "",
          endDate: settingsValues[2] || "",
          initialBalance: validateNumericField(settingsValues[3], 50000),
          targetSales: validateNumericField(settingsValues[4], 0),
          targetQuantity: validateNumericField(settingsValues[5], 0),
          venueCharge: validateNumericField(settingsValues[6], 0),
          laborCost: validateNumericField(settingsValues[7], 0),
          transportCost: validateNumericField(settingsValues[8], 0),
          miscCost: validateNumericField(settingsValues[9], 0),
          salesMargin: validateNumericField(settingsValues[10], 0),
          products: products,
        };

        // デバッグログ追加
        console.log("Formatted Settings:", settings);

        res.status(200).json(settings);
      } catch (error) {
        console.error("Error fetching settings:", error);
        throw error;
      }
    }

    // POST処理
    else if (req.method === "POST") {
      const {
        eventName,
        startDate,
        endDate,
        initialBalance,
        targetSales,
        targetQuantity,
        venueCharge,
        laborCost,
        transportCost,
        miscCost,
        salesMargin,
        breakEvenPoint,
      } = validatePostData(req.body);

      const values = [
        [eventName],
        [startDate],
        [endDate],
        [initialBalance],
        [targetSales],
        [targetQuantity],
        [venueCharge],
        [laborCost],
        [transportCost],
        [miscCost],
        [salesMargin],
        [breakEvenPoint],
      ];

      await sheets.spreadsheets.values
        .update({
          spreadsheetId,
          range: "イベント設定!B1:B12",
          valueInputOption: "RAW",
          resource: {
            values: values,
          },
        })
        .catch(handleSheetError);

      res.status(200).json({
        success: true,
        message: "Settings updated successfully",
      });
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error handling event settings:", error);
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
  let errorMessage = "イベント設定の処理に失敗しました";

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

// バリデーション関数群
function validateSettingsValues(values) {
  return (values || []).map((row) => row?.[0]);
}

function validateNumericField(value, defaultValue, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    console.warn(
      `Invalid ${fieldName}: ${value}, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  return num;
}

function validateAndFormatProducts(productsData) {
  if (!Array.isArray(productsData)) return [];

  return productsData
    .map((row) => {
      if (!row || row.length < 12) return null;

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
      };
    })
    .filter((product) => product && product.name);
}

function validatePostData(data) {
  if (!data.eventName?.trim()) {
    throw new Error("validation: イベント名は必須です");
  }

  if (!data.startDate || !data.endDate) {
    throw new Error("validation: 開始日と終了日は必須です");
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("validation: 不正な日付形式です");
  }
  if (end < start) {
    throw new Error("validation: 終了日は開始日より後である必要があります");
  }

  return {
    eventName: data.eventName,
    startDate: data.startDate,
    endDate: data.endDate,
    initialBalance: validateNumericField(
      data.initialBalance,
      50000,
      "初期残高"
    ),
    targetSales: validateNumericField(data.targetSales, 0, "目標売上"),
    targetQuantity: validateNumericField(data.targetQuantity, 0, "目標数量"),
    venueCharge: validateNumericField(data.venueCharge, 0, "出店料"),
    laborCost: validateNumericField(data.laborCost, 0, "人件費"),
    transportCost: validateNumericField(data.transportCost, 0, "交通費"),
    miscCost: validateNumericField(data.miscCost, 0, "雑費"),
    salesMargin: validateNumericField(data.salesMargin, 0, "販売マージン"),
    breakEvenPoint: validateNumericField(data.breakEvenPoint, 0, "損益分岐点"),
  };
}
