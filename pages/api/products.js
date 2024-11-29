import { google } from 'googleapis';

export default async function handler(req, res) {
  // レスポンスヘッダーの設定
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  try {
    // 環境変数の確認
    console.log('Checking environment variables');
    if (!process.env.SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error('Missing required environment variables');
    }

    // Google認証の設定
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // スプレッドシートからデータを取得
    console.log('Fetching spreadsheet data');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: '商品マスタ!A2:D10',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    console.log('Raw spreadsheet data:', response.data);

    // データが存在しない場合は空配列を返す
    if (!response.data.values) {
      console.log('No data found in spreadsheet');
      return res.status(200).json([]);
    }

    // データを整形
    const products = response.data.values
      .filter(row => row[0] && row.length >= 4) // 商品名があり、必要な列数がある行のみ
      .map((row, index) => ({
        id: index + 1,
        name: row[0],
        prices: {
          S: Number(row[1]) || 0,
          M: Number(row[2]) || 0,
          L: Number(row[3]) || 0
        }
      }));

    console.log('Processed products:', products);

    // 商品データを返す
    return res.status(200).json(products);

  } catch (error) {
    console.error('Error in /api/products:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.message
    });
  }
}