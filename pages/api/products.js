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
    console.log('Starting Google Sheets authentication...');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    console.log('Initializing Google Sheets API...');
    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Fetching data from spreadsheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '商品マスタ!A2:D10',
      valueRenderOption: 'UNFORMATTED_VALUE'
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
      spreadsheetId,
      hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT
    });
    res.status(500).json({ error: error.message });
  }
}