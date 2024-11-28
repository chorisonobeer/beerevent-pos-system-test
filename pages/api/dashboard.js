import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // イベント設定を取得
    const settingsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'イベント設定!B1:B9',
    });

    const settings = settingsResponse.data.values?.map(row => row[0]) || [];
    const targetSales = parseInt(settings[3]) || 0;
    const targetQuantity = parseInt(settings[4]) || 0;

    // 取引履歴を取得
    const historyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '取引履歴!A:F',
    });

    const transactions = historyResponse.data.values || [];
    
    // 商品マスタを取得
    const productsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '商品マスタ!A:C',
    });

    const products = productsResponse.data.values || [];

    // 集計データの計算
    let totalTransactions = transactions.length - 1; // ヘッダー行を除く
    let totalSales = 0;
    let productSales = {};

    // 商品ごとの集計用の初期化
    products.slice(1).forEach(product => {
      const [name] = product;
      productSales[name] = {
        quantity: 0,
        total: 0
      };
    });

    // 取引履歴から売上を集計
    transactions.slice(1).forEach(transaction => {
      const itemsStr = transaction[1]; // 商品詳細カラム
      const total = parseFloat(transaction[2]); // 合計金額カラム
      totalSales += total;

      // 商品別の集計
      const itemMatches = itemsStr.match(/([^(]+)\((\d+)個\)/g) || [];
      itemMatches.forEach(match => {
        const [_, name, quantity] = match.match(/([^(]+)\((\d+)個\)/) || [];
        if (name && productSales[name.trim()]) {
          productSales[name.trim()].quantity += parseInt(quantity);
          productSales[name.trim()].total += total / itemMatches.length;
        }
      });
    });

    // 経費の計算
    const expenses = {
      boothFee: parseInt(settings[5]) || 0,
      laborCost: parseInt(settings[6]) || 0,
      transportationCost: parseInt(settings[7]) || 0,
      miscCost: parseInt(settings[8]) || 0,
      total: 0
    };
    
    expenses.total = Object.values(expenses).reduce((sum, value) => sum + value, 0);

    const dashboardData = {
      totalTransactions,
      totalSales,
      targetSales,
      targetQuantity,
      salesDifference: targetSales - totalSales,
      expenses,
      profit: totalSales - expenses.total,
      productSales: Object.entries(productSales).map(([name, data]) => ({
        name,
        ...data
      }))
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}