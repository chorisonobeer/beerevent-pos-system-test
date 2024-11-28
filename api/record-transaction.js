import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const { items, total, payment, change, timestamp, newBalance } = req.body;

    // トランザクションデータの整形
    const itemsDetails = items.map(item => 
      `${item.name}(${item.quantity}個)`
    ).join(', ');

    const values = [[
      new Date().toLocaleString('ja-JP'),
      itemsDetails,
      total,
      payment,
      change,
      newBalance
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '取引履歴!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error recording transaction:', error);
    res.status(500).json({ error: 'Failed to record transaction' });
  }
}