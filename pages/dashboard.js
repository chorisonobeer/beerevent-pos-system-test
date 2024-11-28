import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    targetSales: 0,
    targetQuantity: 0,
    salesDifference: 0,
    productSales: [],
    expenses: {
      boothFee: 0,
      laborCost: 0,
      transportationCost: 0,
      miscCost: 0,
      total: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error('ダッシュボードデータの取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '¥0';
    return `¥${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen flex flex-col">
      <div className="flex-grow p-4 pb-16">
        {/* 概要セクション */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">売上概要</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-600">総取引数</div>
              <div className="text-xl font-bold text-slate-800">
                {data.totalTransactions || 0}件
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-600">総売上</div>
              <div className="text-xl font-bold text-slate-800">
                {formatCurrency(data.totalSales)}
              </div>
            </div>
          </div>
        </div>

        {/* 目標進捗セクション */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">目標進捗</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>目標売上: {formatCurrency(data.targetSales)}</span>
                <span>
                  達成率: {((data.totalSales / (data.targetSales || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ 
                    width: `${Math.min(
                      ((data.totalSales || 0) / (data.targetSales || 1)) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>
            </div>
            <div className={`text-right font-bold ${
              (data.salesDifference || 0) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {(data.salesDifference || 0) > 0 
                ? `目標まで ${formatCurrency(data.salesDifference)} 不足`
                : `目標を ${formatCurrency(Math.abs(data.salesDifference || 0))} 超過`}
            </div>
          </div>
        </div>

        {/* 商品別売上セクション */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">商品別売上</h2>
          <div className="space-y-4">
            {(data.productSales || []).map((product) => (
              <div key={product.name} className="border-b border-slate-100 pb-3">
                <div className="font-medium text-slate-800 mb-1">{product.name}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">販売数: </span>
                    <span className="font-medium">{product.quantity || 0}個</span>
                  </div>
                  <div>
                    <span className="text-slate-600">売上: </span>
                    <span className="font-medium">{formatCurrency(product.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 下部タブ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-sm mx-auto flex">
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            POS
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 py-3 text-sm font-medium bg-slate-800 text-white"
          >
            分析
          </button>
          <button
            onClick={() => router.push('/settings/event')}
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            設定
          </button>
        </div>
      </div>
    </div>
  );
}