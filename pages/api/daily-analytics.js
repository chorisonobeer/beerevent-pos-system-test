import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 日付パラメータの取得と検証
    const dateParam = req.query.date;
    if (!dateParam) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const targetDate = new Date(dateParam);
    targetDate.setHours(0, 0, 0, 0);

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 取引履歴を取得
    const historyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '取引履歴!A:C', // 日時、商品詳細、合計金額の列
      valueRenderOption: 'FORMATTED_VALUE'
    });

    // イベント設定を取得（目標値との比較用）
    const settingsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'イベント設定!B1:B10',
      valueRenderOption: 'FORMATTED_VALUE'
    });

    const settings = settingsResponse.data.values || [];
    const targetSales = parseInt(settings[3]) || 0; // 目標売上

    // 日次データの集計
    const rows = historyResponse.data.values || [];
    let dailyData = {
      totalSales: 0,
      totalTransactions: 0,
      productSales: {},
      targetProgress: 0
    };

    // 商品名を正規化する関数
    const normalizeProductName = (name) => {
      return name
        .replace(/\s+/g, '') // スペースを削除
        .replace(/,/g, '')   // カンマを削除
        .trim();             // 前後の空白を削除
    };

    // 取引履歴から対象日のデータのみを抽出して集計
    rows.slice(1).forEach(row => {
      const transactionDate = new Date(row[0]);
      transactionDate.setHours(0, 0, 0, 0);

      if (transactionDate.getTime() === targetDate.getTime()) {
        const amount = Number(row[2].replace(/[^0-9.-]+/g,""));
        const itemsStr = row[1]; // 商品詳細文字列

        // 合計値の更新
        dailyData.totalSales += amount;
        dailyData.totalTransactions += 1;

        // 商品別売上の集計
        const itemMatches = itemsStr.match(/(.+?)\(\d+個\)\(\d+円\)/g) || [];
        itemMatches.forEach(match => {
          // 商品名、数量、単価を抽出
          const fullMatch = match.match(/(.+?)\((\d+)個\)\((\d+)円\)/);
          
          if (fullMatch) {
            const [_, fullName, quantity, price] = fullMatch;
            
            // サイズ情報を除去して基本の商品名を取得
            let baseName = fullName.match(/(.+?)\([SML]\)/)?.[1] || fullName;
            
            // 商品名を正規化
            const normalizedName = normalizeProductName(baseName);
            const cleanDisplayName = baseName.trim().replace(/,/g, '');
            
            if (!dailyData.productSales[normalizedName]) {
              dailyData.productSales[normalizedName] = {
                quantity: 0,
                total: 0,
                displayName: cleanDisplayName
              };
            }

            // 数量と単価から正確な売上を計算
            const itemQuantity = parseInt(quantity);
            const itemPrice = parseInt(price);
            
            dailyData.productSales[normalizedName].quantity += itemQuantity;
            dailyData.productSales[normalizedName].total += itemQuantity * itemPrice;
          }
        });
      }
    });

    // 目標に対する進捗率の計算
    dailyData.targetProgress = (dailyData.totalSales / targetSales) * 100;

    // 商品別売上を配列形式に変換
    dailyData.productSales = Object.entries(dailyData.productSales).map(([key, data]) => ({
      name: data.displayName || key, // 表示用の名前を使用
      quantity: data.quantity,
      total: Math.round(data.total) // 小数点以下を四捨五入
    }));

    // 売上順にソート
    dailyData.productSales.sort((a, b) => b.total - a.total);

    console.log('Processed daily data:', dailyData);
    res.status(200).json(dailyData);

  } catch (error) {
    console.error('Error fetching daily analytics:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
}