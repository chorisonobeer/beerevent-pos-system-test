import { google } from 'googleapis';

export default async function handler(req, res) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  // GET: 商品データの取得
  if (req.method === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '商品マスタ!A2:L10',
        valueRenderOption: 'UNFORMATTED_VALUE'
      });

      const products = (response.data.values || []).map((row) => ({
        name: row[0] || '',
        prices: {
          S: row[1] || 0,
          M: row[2] || 0,
          L: row[3] || 0
        },
        lotVolume: row[4] || 0,      // 1ロットの容量
        lotCost: row[5] || 0,        // 1ロットの原価
        sizeVolumes: {
          S: row[6] || 0,            // Sサイズ容量
          M: row[7] || 0,            // Mサイズ容量
          L: row[8] || 0             // Lサイズ容量
        },
        costPerSize: {               // 各サイズの原価（読み取り専用）
          S: row[9] || 0,            // Sサイズ原価
          M: row[10] || 0,           // Mサイズ原価
          L: row[11] || 0            // Lサイズ原価
        }
      }));

      res.status(200).json(products);
    } catch (error) {
      console.error('商品データ取得エラー:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
  
// POST: 商品データの保存
else if (req.method === 'POST') {
    try {
      const products = req.body;
      
      const values = products.map(product => [
        product.name,          // A: 商品名
        product.prices.S,      // B: S価格
        product.prices.M,      // C: M価格
        product.prices.L,      // D: L価格
        product.lotVolume,     // E: 1ロットの容量
        product.lotCost,       // F: 1ロットの原価
        product.sizeVolumes.S, // G: Sサイズ容量
        product.sizeVolumes.M, // H: Mサイズ容量
        product.sizeVolumes.L  // I: Lサイズ容量
        // J, K, L列（原価計算）は更新しない
      ]);
  
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '商品マスタ!A2:I10', // 更新範囲をI列までに制限
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });
  
      res.status(200).json({ message: 'Products updated successfully' });
    } catch (error) {
      console.error('商品データ保存エラー:', error);
      res.status(500).json({ error: 'Failed to update products' });
    }
  }

  // その他のメソッドは許可しない
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}