import { google } from 'googleapis';

export default async function handler(req, res) {
  // スプレッドシートIDをヘッダーから取得
  const spreadsheetId = req.headers['x-spreadsheet-id'];
  
  if (!spreadsheetId) {
    return res.status(400).json({ error: 'Spreadsheet ID is required' });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'イベント設定!B1:B12',
      });

      const values = response.data.values?.map(row => row[0]) || [];
      
      const settings = {
        eventName: values[0] || '',
        startDate: values[1] || '',
        endDate: values[2] || '',
        initialCash: values[3] || 0,
        targetSales: parseInt(values[4]) || 0,
        targetQuantity: parseInt(values[5]) || 0,
        boothFee: parseInt(values[6]) || 0,
        laborCost: parseInt(values[7]) || 0,
        transportationCost: parseInt(values[8]) || 0,
        miscCost: parseInt(values[9]) || 0,
        margin: parseInt(values[10]) || 0,
        breakEvenPoint: parseInt(values[11]) || 0
      };

      res.status(200).json(settings);

    } else if (req.method === 'POST') {
      const {
        eventName,
        startDate,
        endDate,
        initialCash,
        targetSales,
        targetQuantity,
        boothFee,
        laborCost,
        transportationCost,
        miscCost,
        margin,
        breakEvenPoint
      } = req.body;

      const values = [
        [eventName],
        [startDate],
        [endDate],
        [initialCash],
        [targetSales],
        [targetQuantity],
        [boothFee],
        [laborCost],
        [transportationCost],
        [miscCost],
        [margin],
        [breakEvenPoint]
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'イベント設定!B1:B12',
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