import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Google APIの認証
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    // Google Drive APIとSheets APIの初期化
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // テンプレートのスプレッドシートをコピー
    const copyRequest = {
      name: `イベントPOS - ${new Date().toLocaleDateString('ja-JP')}`,
      parents: ['root'] // ドライブのルートに作成
    };

    const templateId = process.env.TEMPLATE_SPREADSHEET_ID; // テンプレートのIDを環境変数から取得
    const driveResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: copyRequest
    });

    const newSpreadsheetId = driveResponse.data.id;

    // 新しいスプレッドシートの権限を設定
    await drive.permissions.create({
      fileId: newSpreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'anyone'
      }
    });

    // 初期シートの設定
    await sheets.spreadsheets.values.clear({
      spreadsheetId: newSpreadsheetId,
      range: 'イベント設定!B1:B12'
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: newSpreadsheetId,
      range: '取引履歴!A2:F1000'
    });

    res.status(200).json({
      success: true,
      spreadsheetId: newSpreadsheetId
    });

  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    res.status(500).json({ 
      error: 'Failed to create spreadsheet',
      details: error.message 
    });
  }
}