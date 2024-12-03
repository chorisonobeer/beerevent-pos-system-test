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

    // 初期レジ金を取得
    const initialCashResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'イベント設定!B4', // 初期レジ金の位置
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    // 取引履歴の合計を取得
    const historyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '取引履歴!C2:C', // 取引金額の列
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    // 初期レジ金を取得（存在しない場合は0）
    const initialCash = initialCashResponse.data.values?.[0]?.[0] || 0;

    // 取引合計を計算
    let transactionsTotal = 0;
    if (historyResponse.data.values) {
      transactionsTotal = historyResponse.data.values.reduce((sum, row) => {
        return sum + (row[0] || 0);
      }, 0);
    }

    // 合計残高を計算（初期レジ金 + 取引合計）
    const totalBalance = Number(initialCash) + Number(transactionsTotal);

    console.log({
      initialCash,
      transactionsTotal,
      totalBalance,
      spreadsheetId
    });

    res.status(200).json({ balance: totalBalance });
  } catch (error) {
    console.error('Error fetching register balance:', {
      message: error.message,
      stack: error.stack,
      spreadsheetId
    });
    res.status(500).json({ error: 'Failed to fetch register balance' });
  }
}