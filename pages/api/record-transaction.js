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

    const { 
      items, 
      total, 
      payment, 
      change, 
      timestamp,
      newBalance 
    } = req.body;

    // 商品詳細の文字列を作成
    const itemsDetails = items.map(item => 
      `${item.name}(${item.quantity}個)`
    ).join(', ');

    // スプレッドシートに追加する行データ
    const rowData = [
      [
        new Date(timestamp).toLocaleString('ja-JP'), // 日時
        itemsDetails,                                // 商品詳細
        total,                                      // 合計金額
        payment,                                    // 支払い金額
        change,                                     // お釣り
        newBalance                                  // 新しいレジ残高
      ]
    ];

    // スプレッドシートに行を追加
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '取引履歴!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: rowData
      }
    });

    res.status(200).json({ 
      success: true,
      message: 'Transaction recorded successfully',
      data: rowData[0]
    });

  } catch (error) {
    console.error('Error recording transaction:', error);
    res.status(500).json({ 
      error: 'Failed to record transaction',
      details: error.message
    });
  }
}