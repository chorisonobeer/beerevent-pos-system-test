import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 取引履歴の最新のレジ残高を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '取引履歴!F2:F',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    let balance = 0;
    if (response.data.values && response.data.values.length > 0) {
      // 最後の行のレジ残高を取得
      balance = response.data.values[response.data.values.length - 1][0] || 0;
    }

    res.status(200).json({ balance });
  } catch (error) {
    console.error('Error fetching register balance:', error);
    res.status(500).json({ error: 'Failed to fetch register balance' });
  }
}