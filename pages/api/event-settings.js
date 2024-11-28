import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'イベント設定!B1:B10', // 範囲を1行増やす
      });

      const values = response.data.values?.map(row => row[0]) || [];
      
      const settings = {
        eventName: values[0] || '',
        startDate: values[1] || '',
        endDate: values[2] || '',
        targetSales: parseInt(values[3]) || 0,
        targetQuantity: parseInt(values[4]) || 0,
        boothFee: parseInt(values[5]) || 0,
        laborCost: parseInt(values[6]) || 0,
        transportationCost: parseInt(values[7]) || 0,
        miscCost: parseInt(values[8]) || 0,
        initialCash: parseInt(values[9]) || 0 // 初期レジ金を追加
      };

      res.status(200).json(settings);

    } else if (req.method === 'POST') {
      const {
        eventName,
        startDate,
        endDate,
        targetSales,
        targetQuantity,
        boothFee,
        laborCost,
        transportationCost,
        miscCost,
        initialCash // 初期レジ金を追加
      } = req.body;

      const values = [
        [eventName],
        [startDate],
        [endDate],
        [targetSales],
        [targetQuantity],
        [boothFee],
        [laborCost],
        [transportationCost],
        [miscCost],
        [initialCash] // 初期レジ金を追加
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'イベント設定!B1:B10', // 範囲を1行増やす
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      res.status(200).json({ success: true, message: 'Settings updated successfully' });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling event settings:', error);
    res.status(500).json({ error: 'Failed to handle event settings: ' + error.message });
  }
}