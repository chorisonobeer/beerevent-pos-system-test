import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { fetchWithSpreadsheetId, hasSpreadsheetId } from "../utils/api";
import { useAppState } from "../contexts/AppStateContext"; // 追加
import { useError } from "../contexts/ErrorContext"; // 追加

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [eventDates, setEventDates] = useState([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [eventSettings, setEventSettings] = useState(null);
  const [dailyData, setDailyData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    productSales: [],
    targetProgress: 0,
    totalQuantitySold: 0,
    breakEvenPoint: 0,
    targetQuantity: 0,
    dailyTransactions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dataCache, setDataCache] = useState({});
  const { isOffline } = useAppState(); // 追加
  const { setError } = useError(); // 追加

  useEffect(() => {
    setMounted(true);
    if (hasSpreadsheetId()) {
      fetchEventSettings();
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (eventSettings) {
      generateEventDates();
    }
  }, [eventSettings]);

  useEffect(() => {
    if (eventDates[currentDateIndex]) {
      fetchDailyData(eventDates[currentDateIndex]);
    }
  }, [currentDateIndex, eventDates]);

  const fetchEventSettings = async () => {
    try {
      const response = await fetchWithSpreadsheetId("/api/event-settings");
      const data = await response.json(); // response.okのチェックを削除
      setEventSettings(data);
    } catch (error) {
      setError("イベント設定の取得に失敗しました。再度お試しください。"); // エラーメッセージを簡潔に変更
      setIsLoading(false);
    }
  };

  const generateEventDates = () => {
    try {
      if (!eventSettings?.startDate || !eventSettings?.endDate) {
        throw new Error("イベント日付が設定されていません");
      }

      const start = new Date(eventSettings.startDate);
      const end = new Date(eventSettings.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("不正な日付形式です");
      }

      const dates = [];
      let current = new Date(start);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      setEventDates(dates);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayIndex = dates.findIndex((date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });

      setCurrentDateIndex(todayIndex !== -1 ? todayIndex : dates.length - 1);
    } catch (error) {
      console.error("日付の生成に失敗:", error);
      setError("日付の生成に失敗しました。イベント設定を確認してください。");
      setEventDates([]);
    }
  };

  // fetchDailyData関数の修正
  // pages/dashboard.js の fetchDailyData 関数を修正

  const fetchDailyData = async (date) => {
    const dateKey = date.toISOString().split("T")[0];

    console.log("Fetching data for date:", date.toISOString());

    // オフライン時はキャッシュのみ使用  // 追加
    if (!navigator.onLine) {
      // 追加
      if (dataCache[dateKey]) {
        // 追加
        setDailyData(dataCache[dateKey]); // 追加
        return; // 追加
      } // 追加
      throw new Error("オフライン時にキャッシュが見つかりません"); // 追加
    } // 追加

    if (dataCache[dateKey]) {
      console.log("Using cached data for:", dateKey);
      setDailyData(dataCache[dateKey]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithSpreadsheetId(
        `/api/dashboard?date=${date.toISOString()}`
      );

      if (!response.ok) {
        throw new Error("日次データの取得に失敗しました");
      }

      const data = await response.json();
      console.log("Fetched daily data:", data);

      if (!data || typeof data !== "object") {
        throw new Error("不正なデータ形式です");
      }

      // キャッシュに保存
      setDataCache((prev) => ({
        ...prev,
        [dateKey]: data,
      }));

      setDailyData(data);
    } catch (error) {
      console.error("データの取得に失敗:", error);
      setError("データの取得に失敗しました。再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSizeBreakdown = (productName) => {
    const sizes = { S: 0, M: 0, L: 0 };

    dailyData.dailyTransactions.forEach((transaction) => {
      const items = transaction.details.split(", ");
      items.forEach((item) => {
        if (item.startsWith(productName)) {
          // 例: "商品1(M)(2個)(850円)" から情報を抽出
          const sizeMatch = item.match(/\((S|M|L)\)/);
          const quantityMatch = item.match(/\((\d+)個\)/);

          if (sizeMatch && quantityMatch) {
            const size = sizeMatch[1];
            const quantity = parseInt(quantityMatch[1]);
            sizes[size] += quantity;
          }
        }
      });
    });

    return sizes;
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "¥0";
    return `¥${value.toLocaleString()}`;
  };

  if (!mounted) {
    return null;
  }

  if (!hasSpreadsheetId()) {
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
            onClick={() => router.push("/settings/event")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg 
              hover:bg-blue-600 transition-colors duration-200"
          >
            設定画面へ
          </button>
        </div>
      </div>
    );
  }

  if (!eventSettings || eventDates.length === 0) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen flex flex-col">
      {/* 日付切り替えナビゲーション */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-sm mx-auto flex items-center justify-between p-4">
          <button
            onClick={() => setCurrentDateIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentDateIndex === 0}
            className={`p-2 rounded-lg ${
              currentDateIndex === 0
                ? "text-slate-400"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            ←前日
          </button>

          <div className="font-semibold text-slate-800">
            {eventDates[currentDateIndex]?.toLocaleDateString("ja-JP")}
          </div>

          <button
            onClick={() =>
              setCurrentDateIndex((prev) =>
                Math.min(eventDates.length - 1, prev + 1)
              )
            }
            disabled={currentDateIndex === eventDates.length - 1}
            className={`p-2 rounded-lg ${
              currentDateIndex === eventDates.length - 1
                ? "text-slate-400"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            翌日→
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-grow p-4 pt-20 pb-16">
        {isLoading ? (
          <div className="text-center py-8">データを読み込み中...</div>
        ) : (
          <>
            {/* 売上概要 */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                売上概要
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-600">取引数</div>
                  <div className="text-xl font-bold text-slate-800">
                    {dailyData.totalTransactions}件
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-600">売上</div>
                  <div className="text-xl font-bold text-slate-800">
                    {formatCurrency(dailyData.totalSales)}
                  </div>
                </div>
              </div>
            </div>

            {/* 目標進捗 */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                目標進捗
              </h2>
              <div>
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>
                    本日の売上: {formatCurrency(dailyData.totalSales)}
                  </span>
                  <span>
                    達成率: {(dailyData.targetProgress || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(dailyData.targetProgress || 0, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* 損益分岐までの残り */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>
                    現在まで {dailyData.totalQuantitySold}杯 / 損益分岐まで
                  </span>
                  <span>
                    {Math.max(
                      0,
                      dailyData.breakEvenPoint - dailyData.totalQuantitySold
                    )}
                    杯
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(
                        (dailyData.totalQuantitySold /
                          (dailyData.breakEvenPoint || 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* 目標販売数までの残り */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>
                    現在まで {dailyData.totalQuantitySold}杯 / 目標販売数まで
                  </span>
                  <span>
                    {Math.max(
                      0,
                      dailyData.targetQuantity - dailyData.totalQuantitySold
                    )}
                    杯
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(
                        (dailyData.totalQuantitySold /
                          (dailyData.targetQuantity || 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 商品構成比セクション */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                商品構成比
              </h2>
              {dailyData.productSales.length > 0 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dailyData.productSales.map((product) => ({
                            name: product.name,
                            value: product.total,
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          dataKey="value"
                          labelLine={false}
                          label={({ x, y, name, percent }) => {
                            return `${name} ${(percent * 100).toFixed(0)}%`;
                          }}
                        >
                          {dailyData.productSales.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={`hsl(${
                                (index * 360) / dailyData.productSales.length
                              }, 70%, 60%)`}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 商品一覧（凡例） */}
                  <div className="mt-4 space-y-2">
                    {dailyData.productSales.map((product, index) => {
                      const sizes = calculateSizeBreakdown(product.name);
                      const sizeText = Object.entries(sizes)
                        .filter(([_, count]) => count > 0)
                        .map(([size, count]) => `${size}:${count}杯`)
                        .join(" / ");

                      const color = `hsl(${
                        (index * 360) / dailyData.productSales.length
                      }, 70%, 60%)`;

                      return (
                        <div
                          key={product.name}
                          className="flex items-center gap-2 p-2"
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-slate-700">{product.name}</span>
                          <span className="text-sm text-slate-600">
                            {sizeText}
                          </span>
                          <span className="ml-auto text-slate-700">
                            ¥{product.total.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 py-8">
                  この日の売上データはありません
                </div>
              )}
            </div>

            {/* 取引履歴 */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                本日の取引履歴
              </h2>
              {dailyData.dailyTransactions?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {dailyData.dailyTransactions.map((transaction, index) => (
                    <div key={index} className="py-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-slate-800">
                          {transaction.time}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-slate-800">
                            {formatCurrency(transaction.amount)}
                          </span>
                          {transaction.payment > 0 && (
                            <div className="text-xs text-slate-500">
                              お預かり金額:{" "}
                              {formatCurrency(transaction.payment)}
                            </div>
                          )}
                          {transaction.change > 0 && (
                            <div className="text-xs text-slate-500">
                              お釣り: {formatCurrency(transaction.change)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-slate-600 break-words">
                        {transaction.details}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-4">
                  本日の取引データはありません
                </div>
              )}
            </div>
          </>
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
            className="flex-1 py-3 text-sm font-medium bg-slate-800 text-white"
          >
            分析
          </button>
          <button
            onClick={() => router.push("/settings/event")}
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            設定
          </button>
        </div>
      </div>
    </div>
  );
}
