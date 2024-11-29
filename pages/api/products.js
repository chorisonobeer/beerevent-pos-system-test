import { google } from 'googleapis';

export default async function handler(req, res) {
  // キャッシュを無効化
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // デバッグログを追加
    console.log('Fetching products from sheet...');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '商品マスタ!A2:D10', // 範囲を具体的に指定
    });

    // デバッグログを追加
    console.log('Sheet response:', response.data);

    if (!response.data.values) {
      throw new Error('No data found in spreadsheet');
    }

    const products = response.data.values.map((row, index) => ({
      id: index + 1,
      name: row[0] || '',
      prices: {
        S: parseInt(row[1]) || 0,
        M: parseInt(row[2]) || 0,
        L: parseInt(row[3]) || 0
      }
    })).filter(product => product.name); // 空の行を除外

    // デバッグログを追加
    console.log('Processed products:', products);

    res.status(200).json(products);
  } catch (error) {
    console.error('Error in /api/products:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}