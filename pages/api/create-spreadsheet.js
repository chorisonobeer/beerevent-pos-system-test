import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting spreadsheet creation...');
    
    // 認証情報の確認
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!credentials) {
      throw new Error('Google service account credentials are not configured');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    console.log('Authentication completed');

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    const templateId = process.env.TEMPLATE_SPREADSHEET_ID;
    console.log('Template ID:', templateId);

    if (!templateId) {
      throw new Error('Template spreadsheet ID is not configured');
    }

    // テンプレートファイルの存在確認
    try {
      await drive.files.get({
        fileId: templateId
      });
      console.log('Template file found');
    } catch (error) {
      console.error('Template file not found or not accessible:', error);
      throw new Error('Template spreadsheet is not accessible');
    }

    // テンプレートのスプレッドシートをコピー
    const copyRequest = {
      name: `イベントPOS - ${new Date().toLocaleDateString('ja-JP')}`,
      parents: ['root']
    };

    console.log('Copying template...');
    const driveResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: copyRequest
    });

    const newSpreadsheetId = driveResponse.data.id;
    console.log('New spreadsheet created:', newSpreadsheetId);

    // 新しいスプレッドシートの権限を設定
    console.log('Setting permissions...');
    await drive.permissions.create({
      fileId: newSpreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'anyone'
      }
    });

    // 初期シートの設定をクリア
    console.log('Clearing initial data...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: newSpreadsheetId,
      range: '取引履歴!A2:F1000'
    });

    console.log('Setup completed successfully');
    res.status(200).json({
      success: true,
      spreadsheetId: newSpreadsheetId,
      message: 'New spreadsheet created successfully'
    });

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      credentials: !!process.env.GOOGLE_SERVICE_ACCOUNT,
      templateId: !!process.env.TEMPLATE_SPREADSHEET_ID
    });
    
    res.status(500).json({ 
      error: 'Failed to create spreadsheet',
      details: error.message,
      message: 'スプレッドシートの作成に失敗しました。環境設定を確認してください。'
    });
  }
}