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

    // 1. 商品マスタの取得
    const productsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '商品マスタ!A2:D10',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    // 商品マスタから価格マップを作成
    const priceMap = {};
    productsResponse.data.values?.forEach(row => {
      if (row[0]) {
        priceMap[`${row[0]}(S)`] = row[1] || 0;
        priceMap[`${row[0]}(M)`] = row[2] || 0;
        priceMap[`${row[0]}(L)`] = row[3] || 0;
      }
    });

    // 2. 取引履歴の取得
    const historyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '取引履歴!A:F',
      valueRenderOption: 'FORMATTED_VALUE'
    });

    const rows = historyResponse.data.values || [];
    const header = rows[0];
    const updatedRows = [header];

    // 3. 各取引の商品詳細を新形式に変換
    rows.slice(1).forEach(row => {
      const itemsStr = row[1];
      const itemMatches = itemsStr.match(/([^(]+\([SML]\])\((\d+)個\)/g) || [];
      
      const updatedItems = itemMatches.map(match => {
        const [_, productWithSize, quantity] = match.match(/([^(]+\([SML]\])\((\d+)個\)/) || [];
        const price = priceMap[productWithSize] || 0;
        return `${productWithSize}(${quantity}個)(${price}円)`;
      }).join(', ');

      updatedRows.push([
        row[0],           // 日時
        updatedItems,     // 更新された商品詳細
        row[2],           // 合計金額
        row[3],           // 支払い金額
        row[4],           // お釣り
        row[5]            // レジ残高
      ]);
    });

    // 4. バックアップシートの作成
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '取引履歴_backup!A1',
      valueInputOption: 'RAW',
      resource: {
        values: rows
      }
    });

    // 5. 元のシートの更新
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: '取引履歴!A1',
      valueInputOption: 'RAW',
      resource: {
        values: updatedRows
      }
    });

    res.status(200).json({
      success: true,
      message: 'Transaction history migration completed',
      totalRows: updatedRows.length - 1
    });

  } catch (error) {
    console.error('Error migrating transactions:', error);
    res.status(500).json({ error: 'Failed to migrate transactions' });
  }
}