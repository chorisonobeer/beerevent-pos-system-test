import { google } from 'googleapis';

export default async function handler(req, res) {
  console.log('=== API Start: /api/products ===');
  
  // 環境変数のチェック
  console.log('Environment variables:', {
    hasSpreadsheetId: Boolean(process.env.SPREADSHEET_ID),
    spreadsheetIdValue: process.env.SPREADSHEET_ID,
    hasGoogleCreds: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT)
  });

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    // Google Sheets APIの初期化
    console.log('Initializing Google Sheets API...');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    console.log('Auth initialized successfully');

    const sheets = google.sheets({ version: 'v4', auth });
    
    // スプレッドシートからのデータ取得
    console.log('Fetching data from sheet...', {
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: '商品マスタ!A2:D10'
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: '商品マスタ!A2:D10',
    });

    console.log('Sheet response:', {
      hasValues: Boolean(response.data.values),
      rowCount: response.data.values?.length,
      firstRow: response.data.values?.[0]
    });

    if (!response.data.values) {
      console.log('No values found in response');
      return res.status(200).json([]);
    }

    const products = response.data.values
      .filter(row => row[0]) // 商品名が存在する行のみ
      .map((row, index) => ({
        id: index + 1,
        name: row[0],
        prices: {
          S: parseInt(row[1]) || 0,
          M: parseInt(row[2]) || 0,
          L: parseInt(row[3]) || 0
        }
      }));

    console.log('Processed products:', {
      count: products.length,
      firstProduct: products[0]
    });

    res.status(200).json(products);

  } catch (error) {
    console.error('Error in products API:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      error: error.message,
      type: error.name,
      code: error.code
    });
  }
}