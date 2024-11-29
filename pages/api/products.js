import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    console.log('Starting API request...');
    console.log('SPREADSHEET_ID:', process.env.SPREADSHEET_ID);

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // より具体的なレスポンスのログ
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: '商品マスタ!A2:D10',
    });

    console.log('Raw API Response:', JSON.stringify(response.data, null, 2));

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

    console.log('Processed products:', JSON.stringify(products, null, 2));

    res.status(200).json(products);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ error: error.message });
  }
}