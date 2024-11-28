import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 初期レジ金を取得
    const initialCashResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'イベント設定!B10', // 初期レジ金の位置
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
      totalBalance
    });

    res.status(200).json({ balance: totalBalance });
  } catch (error) {
    console.error('Error fetching register balance:', error);
    res.status(500).json({ error: 'Failed to fetch register balance' });
  }
}