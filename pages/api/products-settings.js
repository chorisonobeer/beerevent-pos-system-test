import { google } from 'googleapis';

export default async function handler(req, res) {
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
        range: '商品マスタ!A2:L10',
        valueRenderOption: 'UNFORMATTED_VALUE'
      });

      const rows = response.data.values || [];
      const products = rows.map(row => ({
        name: row[0] || '',
        prices: {
          S: row[1] || 0,
          M: row[2] || 0,
          L: row[3] || 0
        },
        lotVolume: row[4] || 0,
        lotCost: row[5] || 0,
        sizeVolumes: {
          S: row[6] || 0,
          M: row[7] || 0,
          L: row[8] || 0
        },
        costPerSize: {
          S: row[9] || 0,
          M: row[10] || 0,
          L: row[11] || 0
        }
      }));

      res.status(200).json(products);

    } else if (req.method === 'POST') {
      const products = req.body;

      const values = products.map(product => {
        const calculateCost = (sizeVolume) => {
          if (!product.lotVolume || product.lotVolume === 0) return 0;
          return (product.lotCost / product.lotVolume) * sizeVolume;
        };

        return [
          product.name,
          product.prices?.S || 0,
          product.prices?.M || 0,
          product.prices?.L || 0,
          product.lotVolume || 0,
          product.lotCost || 0,
          product.sizeVolumes?.S || 0,
          product.sizeVolumes?.M || 0,
          product.sizeVolumes?.L || 0,
          calculateCost(product.sizeVolumes?.S || 0),
          calculateCost(product.sizeVolumes?.M || 0),
          calculateCost(product.sizeVolumes?.L || 0)
        ];
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '商品マスタ!A2:L10',
        valueInputOption: 'RAW',
        resource: {
          values
        }
      });

      res.status(200).json({ success: true });

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error handling products settings:', error);
    res.status(500).json({ 
      error: 'Failed to handle products settings',
      details: error.message 
    });
  }
}