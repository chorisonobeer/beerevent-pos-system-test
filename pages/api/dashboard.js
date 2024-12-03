import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // スプレッドシートIDをヘッダーから取得
  const spreadsheetId = req.headers['x-spreadsheet-id'];
  
  if (!spreadsheetId) {
    return res.status(400).json({ error: 'Spreadsheet ID is required' });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // イベント設定を取得
    const settingsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'イベント設定!B1:B12',
    });

    const settings = settingsResponse.data.values?.map(row => row[0]) || [];
    const eventStartDate = settings[1];
    const eventEndDate = settings[2];

    // 取引履歴を取得
    const historyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '取引履歴!A:F',
    });

    const transactions = historyResponse.data.values || [];

    // 特定の日付のデータのみを集計する関数
    const calculateDailyStats = (transactions, targetDate) => {
      const dailyStats = {
        totalTransactions: 0,
        totalSales: 0,
        productSales: {}
      };

      transactions.slice(1).forEach(transaction => {
        const transactionDate = new Date(transaction[0]);
        transactionDate.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        if (transactionDate.getTime() === targetDate.getTime()) {
          const total = parseFloat(transaction[2]);
          const itemsStr = transaction[1];
          dailyStats.totalTransactions += 1;
          dailyStats.totalSales += total;

          // カンマで商品を分割
          const items = itemsStr.split(',').map(item => item.trim());
          
          items.forEach(item => {
            // 各商品のデータを抽出
            const matchResult = item.match(/(.+?)\(([SML])\)\((\d+)個\)\((\d+)円\)/);
            if (matchResult) {
              const [_, baseName, size, quantity, price] = matchResult;
              // 商品名を正規化（カンマと空白を除去）
              const cleanName = baseName.trim().replace(/,/g, '');

              if (!dailyStats.productSales[cleanName]) {
                dailyStats.productSales[cleanName] = {
                  name: cleanName,
                  quantity: 0,
                  total: 0
                };
              }

              const itemQuantity = parseInt(quantity);
              const itemPrice = parseInt(price);
              dailyStats.productSales[cleanName].quantity += itemQuantity;
              dailyStats.productSales[cleanName].total += itemQuantity * itemPrice;
            }
          });
        }
      });

      return dailyStats;
    };

    // イベント開始から現在までの総販売数を計算
    const calculateTotalQuantity = (transactions, startDate) => {
      return transactions.slice(1).reduce((total, transaction) => {
        const transactionDate = new Date(transaction[0]);
        const eventStart = new Date(startDate);
        if (transactionDate >= eventStart) {
          const itemsStr = transaction[1];
          const quantities = (itemsStr.match(/\((\d+)個\)/g) || [])
            .map(q => parseInt(q.match(/(\d+)/)[1]));
          return total + quantities.reduce((sum, q) => sum + q, 0);
        }
        return total;
      }, 0);
    };

    const targetDate = new Date(req.query.date);
    const dailyStats = calculateDailyStats(transactions, targetDate);
    const totalQuantitySold = calculateTotalQuantity(transactions, eventStartDate);

    // その日の取引履歴を抽出
    const dailyTransactions = transactions.slice(1).filter(transaction => {
      const transactionDate = new Date(transaction[0]);
      transactionDate.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      return transactionDate.getTime() === targetDate.getTime();
    }).map(transaction => ({
      time: new Date(transaction[0]).toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      details: transaction[1],
      amount: parseInt(transaction[2]),
      payment: parseInt(transaction[3]),
      change: parseInt(transaction[4])
    })).reverse();

    const dashboardData = {
      totalTransactions: dailyStats.totalTransactions,
      totalSales: dailyStats.totalSales,
      dailyTargetSales: parseInt(settings[4]) || 0,
      targetProgress: (dailyStats.totalSales / (parseInt(settings[4]) || 1)) * 100,
      totalQuantitySold: totalQuantitySold,
      breakEvenPoint: parseInt(settings[11]) || 0,
      targetQuantity: parseInt(settings[5]) || 0,
      productSales: Object.entries(dailyStats.productSales).map(([key, data]) => ({
        name: data.name,
        quantity: data.quantity,
        total: Math.round(data.total)
      })).sort((a, b) => b.total - a.total),
      dailyTransactions
    };

    res.status(200).json(dashboardData);

  } catch (error) {
    console.error('Error fetching dashboard data:', {
      message: error.message,
      stack: error.stack,
      spreadsheetId
    });
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}