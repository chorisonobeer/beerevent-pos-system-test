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

    // イベント設定を取得
    const settingsResponse = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "イベント設定!B1:B12",
        valueRenderOption: "UNFORMATTED_VALUE",
      })
      .catch(handleSheetError);

    console.log("Settings data:", settingsResponse.data.values);
    const settings = settingsResponse.data.values?.map((row) => row?.[0]) || [];
    const eventStartDate = settings[1];

    // 取引履歴を取得
    const transactionsResponse = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: "取引履歴!A:F",
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      })
      .catch(handleSheetError);

    console.log("Raw transactions data:", transactionsResponse.data.values);
    const transactions = transactionsResponse.data.values || [];

    // 日付パラメータのチェック
    const targetDate = new Date(req.query.date);
    if (isNaN(targetDate.getTime())) {
      throw new Error("Invalid date parameter");
    }

    const dailyStats = calculateDailyStats(transactions, targetDate);
    const totalQuantitySold = calculateTotalQuantity(
      transactions,
      eventStartDate
    );

    const dashboardData = {
      totalTransactions: dailyStats.totalTransactions,
      totalSales: dailyStats.totalSales,
      dailyTargetSales: Number(settings[4]) || 0,
      targetProgress:
        (dailyStats.totalSales / (Number(settings[4]) || 1)) * 100,
      totalQuantitySold,
      breakEvenPoint: Number(settings[11]) || 0,
      targetQuantity: Number(settings[5]) || 0,
      productSales: Object.values(dailyStats.productSales).sort(
        (a, b) => b.total - a.total
      ),
      dailyTransactions: formatDailyTransactions(dailyStats.transactions),
    };

    console.log("Final dashboard data:", dashboardData);
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", {
      message: error.message,
      stack: error.stack,
      spreadsheetId,
    });
    handleApiError(error, res);
  }
}

function calculateDailyStats(transactions, targetDate) {
  const dailyStats = {
    totalTransactions: 0,
    totalSales: 0,
    productSales: {},
    transactions: [],
  };

  targetDate.setHours(0, 0, 0, 0);
  console.log("Target date for stats:", targetDate);

  transactions.slice(1).forEach((transaction) => {
    try {
      if (!transaction[0]) return;

      const transactionDate = new Date(transaction[0]);
      transactionDate.setHours(0, 0, 0, 0);

      if (transactionDate.getTime() === targetDate.getTime()) {
        const total =
          parseFloat(String(transaction[2]).replace(/[^0-9.-]/g, "")) || 0;
        const itemsStr = transaction[1];

        console.log("Processing transaction:", {
          date: transactionDate,
          total: total,
          items: itemsStr,
        });

        dailyStats.totalTransactions += 1;
        dailyStats.totalSales += total;
        dailyStats.transactions.push(transaction);

        const items = itemsStr.split(",").map((item) => item.trim());
        items.forEach((item) => {
          const match = item.match(/(.+?)\([SML]\)\((\d+)個\)\((\d+)円\)/);
          if (match) {
            // 商品名からサイズ表記を取り出し、基本の商品名のみを使用
            const [_, fullName, quantity, price] = match;
            const baseName = fullName.match(/(.+?)\([SML]\)/)?.[1] || fullName;
            const cleanName = baseName.trim();

            if (!dailyStats.productSales[cleanName]) {
              dailyStats.productSales[cleanName] = {
                name: cleanName,
                quantity: 0,
                total: 0,
              };
            }

            const itemQuantity = parseInt(quantity);
            const itemPrice = parseInt(price);
            if (!isNaN(itemQuantity) && !isNaN(itemPrice)) {
              dailyStats.productSales[cleanName].quantity += itemQuantity;
              dailyStats.productSales[cleanName].total +=
                itemQuantity * itemPrice;
            }
          }
        });
      }
    } catch (error) {
      console.error("Error processing transaction:", error, transaction);
    }
  });

  console.log("Calculated daily stats:", dailyStats);
  return dailyStats;
}

function calculateTotalQuantity(transactions, startDate) {
  const eventStart = startDate ? new Date(startDate) : new Date(0);
  let total = 0;

  transactions.slice(1).forEach((transaction) => {
    try {
      if (!transaction[0]) return;

      const transactionDate = new Date(transaction[0]);
      if (transactionDate >= eventStart) {
        const itemsStr = transaction[1];
        const quantities = itemsStr.match(/\((\d+)個\)/g) || [];
        quantities.forEach((q) => {
          const num = parseInt(q.match(/(\d+)/)[1]);
          if (!isNaN(num)) {
            total += num;
          }
        });
      }
    } catch (error) {
      console.error("Error calculating quantity:", error);
    }
  });

  return total;
}

function formatDailyTransactions(transactions) {
  return transactions
    .map((transaction) => {
      try {
        return {
          time: new Date(transaction[0]).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          details: transaction[1],
          amount:
            parseFloat(String(transaction[2]).replace(/[^0-9.-]/g, "")) || 0,
          payment:
            parseFloat(String(transaction[3]).replace(/[^0-9.-]/g, "")) || 0,
          change:
            parseFloat(String(transaction[4]).replace(/[^0-9.-]/g, "")) || 0,
        };
      } catch (error) {
        console.error("Error formatting transaction:", error);
        return null;
      }
    })
    .filter((t) => t !== null)
    .reverse();
}

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
  let errorMessage = "ダッシュボードデータの取得に失敗しました";

  if (error.message.includes("Invalid date")) {
    statusCode = 400;
    errorMessage = "不正な日付パラメータです";
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
