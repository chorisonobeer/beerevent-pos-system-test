import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import SettingsTabs from "../../components/SettingsTabs";
import { fetchWithSpreadsheetId, hasSpreadsheetId } from "../../utils/api";
import { useError } from "../../contexts/ErrorContext";

const calculateBreakEvenPoint = (settings) => {
  if (!settings || !settings.products) return 0;

  console.log("Calculating break even point with settings:", settings);

  // 固定費の合計 (B7:B10の合計)
  const fixedCosts =
    Number(settings.venueCharge || 0) + // 出店料
    Number(settings.laborCost || 0) + // 人件費
    Number(settings.transportCost || 0) + // 交通費
    Number(settings.miscCost || 0); // 雑費
  console.log("Fixed costs:", fixedCosts);

  // 販売マージン率（％）
  const marginRate = Number(settings.salesMargin || 0) / 100;
  console.log("Margin rate:", marginRate);

  // 各サイズごとのマージン計算
  let allMargins = [];

  settings.products.forEach((product) => {
    // Sサイズ
    if (product.prices.S > 0) {
      // 売価 - (原価 + 売価 × マージン率)
      const marginS =
        product.prices.S -
        (product.costPerSize.S + product.prices.S * marginRate);
      allMargins.push(marginS);
    }
    // Mサイズ
    if (product.prices.M > 0) {
      const marginM =
        product.prices.M -
        (product.costPerSize.M + product.prices.M * marginRate);
      allMargins.push(marginM);
    }
    // Lサイズ
    if (product.prices.L > 0) {
      const marginL =
        product.prices.L -
        (product.costPerSize.L + product.prices.L * marginRate);
      allMargins.push(marginL);
    }
  });

  console.log("All margins:", allMargins);

  // マージンの平均値を計算
  const averageMargin =
    allMargins.length > 0
      ? allMargins.reduce((sum, margin) => sum + margin, 0) / allMargins.length
      : 0;

  console.log("Average margin:", averageMargin);

  // 損益分岐点の計算（切り上げ）
  const breakEvenPoint =
    averageMargin !== 0 ? Math.ceil(fixedCosts / averageMargin) : 0;

  console.log("Break even point:", breakEvenPoint);
  return breakEvenPoint;
};

// デバウンス関数
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// クリップボードにコピーする関数
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      alert("コピーしました");
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      alert("コピーしました");
    } catch (err) {
      alert("コピーに失敗しました");
    }
    document.body.removeChild(textArea);
  } catch (err) {
    alert("コピーに失敗しました");
  }
};

export default function EventSettings() {
  const router = useRouter();
  // State定義
  const [isClient, setIsClient] = useState(false);
  const [settings, setSettings] = useState({
    eventName: "",
    startDate: "",
    endDate: "",
    initialBalance: 50000,
    targetSales: "",
    targetQuantity: "",
    venueCharge: "",
    laborCost: "",
    transportCost: "",
    miscCost: "",
    salesMargin: "",
    breakEvenPoint: 0,
    products: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newSpreadsheetId, setNewSpreadsheetId] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [currentSpreadsheetId, setCurrentSpreadsheetId] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { setError } = useError();

  // クライアントサイドでの初期化
  useEffect(() => {
    setIsClient(true);
    setCurrentSpreadsheetId(localStorage.getItem("currentSpreadsheetId") || "");
  }, []);

  // データ取得
  useEffect(() => {
    if (isClient && !hasSpreadsheetId()) {
      setIsLoading(false);
      return;
    }
    if (isClient) {
      fetchSettings();
    }
  }, [isClient]);

  // 損益分岐点の計算
  const currentBreakEvenPoint = useMemo(
    () => calculateBreakEvenPoint(settings),
    [settings]
  );

  // 自動保存のデバウンス
  const debouncedSave = useMemo(
    () =>
      debounce(async (newSettings) => {
        try {
          const response = await fetchWithSpreadsheetId("/api/event-settings", {
            method: "POST",
            body: JSON.stringify(newSettings),
          });
          if (!response.ok) {
            throw new Error("Failed to save settings");
          }
        } catch (error) {
          console.error("Settings save error:", error);
        }
      }, 2000),
    []
  );

  // 設定変更時の自動保存
  useEffect(() => {
    if (settings.eventName) {
      const newSettings = {
        ...settings,
        breakEvenPoint: currentBreakEvenPoint,
      };
      debouncedSave(newSettings);
    }
  }, [settings, currentBreakEvenPoint]);

  // イベントハンドラー関数
  const fetchSettings = async () => {
    try {
      const response = await fetchWithSpreadsheetId("/api/event-settings");
      if (!response.ok) {
        throw new Error("設定の取得に失敗しました");
      }
      const data = await response.json();
      console.log("Fetched settings:", data); // デバッグログ追加

      // 数値フィールドの型変換を確実に行う
      const formattedData = {
        ...data,
        initialBalance: Number(data.initialBalance) || 50000,
        venueCharge: Number(data.venueCharge) || 0,
        laborCost: Number(data.laborCost) || 0,
        transportCost: Number(data.transportCost) || 0,
        miscCost: Number(data.miscCost) || 0,
        targetSales: Number(data.targetSales) || 0,
        targetQuantity: Number(data.targetQuantity) || 0,
        salesMargin: Number(data.salesMargin) || 0,
      };

      console.log("Formatted settings:", formattedData); // デバッグログ追加
      setSettings(formattedData);
    } catch (error) {
      console.error("設定の取得に失敗:", error);
      setError("設定の取得に失敗しました: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 入力値の検証
      if (!settings.eventName?.trim()) {
        throw new Error("イベント名は必須です");
      }
      if (!settings.startDate || !settings.endDate) {
        throw new Error("開始日と終了日は必須です");
      }

      const start = new Date(settings.startDate);
      const end = new Date(settings.endDate);
      if (end < start) {
        throw new Error("終了日は開始日より後の日付を指定してください");
      }

      const settingsToSave = {
        ...settings,
        breakEvenPoint: currentBreakEvenPoint,
      };

      const response = await fetchWithSpreadsheetId("/api/event-settings", {
        method: "POST",
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) {
        throw new Error("設定の保存に失敗しました");
      }

      await fetchSettings();
      setShowSuccessModal(true);
    } catch (error) {
      console.error("設定の保存に失敗:", error);
      setError(
        error.message || "設定の保存に失敗しました。再度お試しください。"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpreadsheetSwitch = async () => {
    if (!newSpreadsheetId) {
      setError("スプレッドシートIDを入力してください");
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch("/api/validate-spreadsheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spreadsheetId: newSpreadsheetId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "無効なスプレッドシートIDです");
      }

      localStorage.setItem("currentSpreadsheetId", newSpreadsheetId);
      const history = JSON.parse(
        localStorage.getItem("spreadsheetHistory") || "[]"
      );
      const newHistory = [...new Set([...history, newSpreadsheetId])];
      localStorage.setItem("spreadsheetHistory", JSON.stringify(newHistory));

      window.location.reload();
    } catch (error) {
      console.error("スプレッドシート切り替えエラー:", error);
      setError(error.message || "スプレッドシートの切り替えに失敗しました");
    } finally {
      setIsValidating(false);
    }
  };

  // 初期レンダリング時は読み込み中を表示
  if (!isClient) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">データを読み込み中...</div>
      </div>
    );
  }

  // スプレッドシート未設定時の表示
  if (isClient && !hasSpreadsheetId()) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">
          <div className="text-xl font-bold text-slate-800 mb-4">
            スプレッドシートが設定されていません
          </div>
          <div className="text-slate-600 mb-6">
            イベントの設定を行ってください
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg 
             hover:bg-blue-600 transition-colors duration-200"
          >
            POS画面へ
          </button>
        </div>
      </div>
    );
  }

  // データ読み込み中の表示
  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">データを読み込み中...</div>
      </div>
    );
  }

  // メインのレンダリング
  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen flex flex-col">
      <SettingsTabs currentPath="/settings/event" />

      <div className="p-4 pt-16 pb-24">
        <div className="space-y-4">
          {/* イベント基本情報 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">基本情報</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  イベント名
                </label>
                <input
                  type="text"
                  name="eventName"
                  value={settings.eventName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={settings.startDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={settings.endDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  レジ準備金
                </label>
                <input
                  type="number"
                  name="initialBalance"
                  value={settings.initialBalance}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          {/* 目標設定 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">目標設定</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  目標売上
                </label>
                <input
                  type="number"
                  name="targetSales"
                  value={settings.targetSales}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  目標販売数
                </label>
                <input
                  type="number"
                  name="targetQuantity"
                  value={settings.targetQuantity}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          {/* コスト設定 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">コスト設定</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  出店料
                </label>
                <input
                  type="number"
                  name="venueCharge"
                  value={settings.venueCharge}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  人件費
                </label>
                <input
                  type="number"
                  name="laborCost"
                  value={settings.laborCost}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  交通費
                </label>
                <input
                  type="number"
                  name="transportCost"
                  value={settings.transportCost}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  雑費
                </label>
                <input
                  type="number"
                  name="miscCost"
                  value={settings.miscCost}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              販売マージン（％）
            </label>
            <input
              type="number"
              name="salesMargin"
              value={settings.salesMargin}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <button
              type="submit"
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full py-3 ${
                isSaving ? "bg-slate-400" : "bg-blue-500 hover:bg-blue-600"
              } text-white rounded-md shadow-md transition-colors duration-200`}
            >
              {isSaving ? "保存中..." : "設定を保存"}
            </button>
          </div>

          {/* 損益分岐点 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">損益分岐点</h2>
            <div className="font-bold text-slate-800">
              {currentBreakEvenPoint}杯
            </div>
          </div>

          {/* スプレッドシート管理 */}
          <div className="bg-slate-400 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">スプレッドシート管理</h2>

            {/* 新規作成ボタン */}
            <button
              onClick={async () => {
                try {
                  if (
                    !confirm(
                      "新しいイベントを作成しますか？\n既存のデータは上書きされません。"
                    )
                  ) {
                    return;
                  }

                  setIsValidating(true);
                  const response = await fetch("/api/create-spreadsheet", {
                    method: "POST",
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(
                      error.message || "スプレッドシートの作成に失敗しました"
                    );
                  }

                  const data = await response.json();
                  if (!data.spreadsheetId) {
                    throw new Error("スプレッドシートIDが取得できませんでした");
                  }

                  localStorage.setItem(
                    "currentSpreadsheetId",
                    data.spreadsheetId
                  );
                  const history = JSON.parse(
                    localStorage.getItem("spreadsheetHistory") || "[]"
                  );
                  const newHistory = [
                    ...new Set([...history, data.spreadsheetId]),
                  ];
                  localStorage.setItem(
                    "spreadsheetHistory",
                    JSON.stringify(newHistory)
                  );

                  alert("新しいイベントのスプレッドシートを作成しました");
                  window.location.reload();
                } catch (error) {
                  console.error("スプレッドシート作成エラー:", error);
                  alert(error.message);
                } finally {
                  setIsValidating(false);
                }
              }}
              className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 
            transition-colors duration-200 mb-4"
              disabled={isValidating}
            >
              {isValidating ? "作成中..." : "新しいイベントの初期設定"}
            </button>

            {/* ID切替部分 */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSpreadsheetId}
                onChange={(e) => setNewSpreadsheetId(e.target.value)}
                placeholder="スプレッドシートIDを入力"
                className="flex-1 p-1.5 border rounded-md text-sm bg-white"
              />
              <button
                onClick={handleSpreadsheetSwitch}
                disabled={isValidating}
                className={`px-4 py-1.5 rounded-md text-white ${
                  isValidating
                    ? "bg-slate-400"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isValidating ? "確認中..." : "切替"}
              </button>
            </div>

            <div className="text-sm text-slate-600">
              現在のID:
              <span className="font-mono truncate inline-block max-w-[180px] align-bottom">
                {currentSpreadsheetId}
              </span>
              <button
                onClick={() => copyToClipboard(currentSpreadsheetId)}
                className="ml-2 p-1 hover:bg-slate-100 rounded inline-flex items-center"
                title="IDをコピー"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* ここにモーダルを追加 */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-80">
              <div className="text-center mb-4">設定を保存しました</div>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/");
                }}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
              transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 下部タブ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-sm mx-auto flex">
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            POS
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            分析
          </button>
          <button
            onClick={() => router.push("/settings/event")}
            className="flex-1 py-3 text-sm font-medium bg-slate-800 text-white"
          >
            設定
          </button>
        </div>
      </div>
    </div>
  );
}
