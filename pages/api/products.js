import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    console.log('Starting Google Sheets authentication...');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    console.log('Initializing Google Sheets API...');
    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Fetching data from spreadsheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: '商品マスタ!A2:D10',  // 範囲が正しいか確認
      valueRenderOption: 'UNFORMATTED_VALUE'  // 生の値を取得
    });

    
    console.log('Spreadsheet Response:', response.data);

    if (!response.data.values) {
      console.log('No data found in spreadsheet');
      return res.status(200).json([]);
    }

    console.log('Processing spreadsheet data...');
    const products = response.data.values
      .filter(row => row[0])  // 商品名が存在する行のみフィルタ
      .map((row, index) => ({
        id: index + 1,
        name: row[0],
        prices: {
          S: parseInt(row[1]) || 0,
          M: parseInt(row[2]) || 0,
          L: parseInt(row[3]) || 0
        }
      }));

    console.log('Processed products:', products);

    res.status(200).json(products);
  } catch (error) {
    console.error('Error in products API:', {
      message: error.message,
      stack: error.stack,
      spreadsheetId: process.env.SPREADSHEET_ID,
      hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT
    });
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}