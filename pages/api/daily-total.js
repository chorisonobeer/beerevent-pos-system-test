// /pages/api/daily-total.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 本日の日付を取得（時刻を00:00:00に設定）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '取引履歴!A:C',
      valueRenderOption: 'FORMATTED_VALUE' // 日付を文字列として取得
    });

    const rows = response.data.values || [];
    let dailyTotal = 0;

    // ヘッダー行をスキップし、本日の取引のみ合計
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) { // 日付が存在する場合のみ処理
        const transactionDate = new Date(rows[i][0]);
        transactionDate.setHours(0, 0, 0, 0);
        
        // 日付が今日の場合のみ合計に加算
        if (transactionDate.getTime() === today.getTime()) {
          const amount = Number(rows[i][2].replace(/[^0-9.-]+/g,"")); // 数値以外の文字を削除して変換
          if (!isNaN(amount)) {
            dailyTotal += amount;
          }
        }
      }
    }

    console.log('Daily total calculated:', dailyTotal);
    res.status(200).json({ total: dailyTotal });

  } catch (error) {
    console.error('Error fetching daily total:', error);
    res.status(500).json({ error: 'Failed to fetch daily total' });
  }
}