import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 環境変数の検証
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("Google service account credentials are not configured");
    }
    if (!process.env.TEMPLATE_SPREADSHEET_ID) {
      throw new Error("Template spreadsheet ID is not configured");
    }
    if (!process.env.OWNER_EMAIL) {
      throw new Error("Owner email is not configured");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    // テンプレートファイルの存在確認とフォルダ情報取得
    const templateFile = await drive.files
      .get({
        fileId: process.env.TEMPLATE_SPREADSHEET_ID,
        fields: "parents",
      })
      .catch((error) => {
        if (error.code === 404) {
          throw new Error("テンプレートファイルが見つかりません");
        }
        if (error.code === 403) {
          throw new Error("テンプレートファイルへのアクセス権限がありません");
        }
        throw error;
      });

    // フォルダ作成
    const currentDate = new Date();
    const folderName = `イベントPOS - ${currentDate.toLocaleDateString(
      "ja-JP"
    )}`;
    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: templateFile.data.parents,
    };

    const folder = await drive.files
      .create({
        resource: folderMetadata,
        fields: "id",
      })
      .catch((error) => {
        throw new Error(`フォルダの作成に失敗しました: ${error.message}`);
      });

    // スプレッドシートのコピーを作成
    const copyRequest = {
      name: `イベントPOS - ${currentDate.toLocaleDateString("ja-JP")}`,
      parents: [folder.data.id],
    };

    const driveResponse = await drive.files
      .copy({
        fileId: process.env.TEMPLATE_SPREADSHEET_ID,
        requestBody: copyRequest,
      })
      .catch((error) => {
        throw new Error(
          `スプレッドシートのコピーに失敗しました: ${error.message}`
        );
      });

    const newSpreadsheetId = driveResponse.data.id;

    // 権限設定
    try {
      // 誰でも閲覧可能に設定
      await drive.permissions.create({
        fileId: newSpreadsheetId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      // 指定したユーザーに編集権限を付与
      await drive.permissions.create({
        fileId: newSpreadsheetId,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: process.env.OWNER_EMAIL,
        },
      });

      // オーナー権限の移譲
      await drive.permissions.create({
        fileId: newSpreadsheetId,
        requestBody: {
          role: "owner",
          type: "user",
          emailAddress: process.env.OWNER_EMAIL,
        },
        transferOwnership: true,
      });

      // フォルダの権限設定
      await drive.permissions.create({
        fileId: folder.data.id,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      await drive.permissions.create({
        fileId: folder.data.id,
        requestBody: {
          role: "owner",
          type: "user",
          emailAddress: process.env.OWNER_EMAIL,
        },
        transferOwnership: true,
      });
    } catch (error) {
      console.error("Permission setting error:", error);
      // 権限設定の失敗は記録するが、処理は継続
    }

    // 初期データのクリア
    await sheets.spreadsheets.values
      .clear({
        spreadsheetId: newSpreadsheetId,
        range: "取引履歴!A2:F1000",
      })
      .catch((error) => {
        throw new Error(`初期データのクリアに失敗しました: ${error.message}`);
      });

    res.status(200).json({
      success: true,
      spreadsheetId: newSpreadsheetId,
      message: "New spreadsheet created successfully",
    });
  } catch (error) {
    console.error("Detailed error:", {
      message: error.message,
      stack: error.stack,
      credentials: !!process.env.GOOGLE_SERVICE_ACCOUNT,
      templateId: !!process.env.TEMPLATE_SPREADSHEET_ID,
      ownerEmail: !!process.env.OWNER_EMAIL,
    });

    let statusCode = 500;
    let errorMessage = "スプレッドシートの作成に失敗しました";

    if (error.message.includes("not configured")) {
      statusCode = 500;
      errorMessage = "環境設定が不正です";
    } else if (error.message.includes("認証")) {
      statusCode = 401;
      errorMessage = "認証に失敗しました";
    } else if (error.message.includes("権限")) {
      statusCode = 403;
      errorMessage = "アクセス権限がありません";
    } else if (error.message.includes("見つかりません")) {
      statusCode = 404;
      errorMessage = "テンプレートファイルが見つかりません";
    }

    res.status(statusCode).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
      message: "環境設定を確認してください。",
    });
  }
}
