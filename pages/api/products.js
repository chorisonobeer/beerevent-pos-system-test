import { google } from 'googleapis';

export default async function handler(req, res) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '商品マスタ!A2:D', // D列まで取得（商品名, S価格, M価格, L価格）
    });

    const products = response.data.values.map((row, index) => ({
      id: index + 1,
      name: row[0],
      prices: {
        S: parseInt(row[1]) || 0,
        M: parseInt(row[2]) || 0,
        L: parseInt(row[3]) || 0
      }
    }));

    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}