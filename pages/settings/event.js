import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function EventSettings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    eventName: '',
    startDate: '',
    endDate: '',
    targetSales: '',
    targetQuantity: '',
    boothFee: '',
    laborCost: '',
    transportationCost: '',
    miscCost: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/event-settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('設定の取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/event-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventName: settings.eventName || '',
          startDate: settings.startDate || '',
          endDate: settings.endDate || '',
          targetSales: Number(settings.targetSales) || 0,
          targetQuantity: Number(settings.targetQuantity) || 0,
          boothFee: Number(settings.boothFee) || 0,
          laborCost: Number(settings.laborCost) || 0,
          transportationCost: Number(settings.transportationCost) || 0,
          miscCost: Number(settings.miscCost) || 0
        })
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      const data = await response.json();
      alert('設定を保存しました');
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      alert('設定の保存に失敗しました: ' + error.message);
    } finally {
      setIsSaving(false);
    }
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">イベント情報</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  イベント名
                </label>
                <input
                  type="text"
                  name="eventName"
                  value={settings.eventName}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={settings.startDate}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-200 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    終了日
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={settings.endDate}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-200 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">目標設定</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  目標売上金額
                </label>
                <input
                  type="number"
                  name="targetSales"
                  value={settings.targetSales}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  目標販売数量
                </label>
                <input
                  type="number"
                  name="targetQuantity"
                  value={settings.targetQuantity}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">費用設定</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  出店料
                </label>
                <input
                  type="number"
                  name="boothFee"
                  value={settings.boothFee}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  人件費
                </label>
                <input
                  type="number"
                  name="laborCost"
                  value={settings.laborCost}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  交通費
                </label>
                <input
                  type="number"
                  name="transportationCost"
                  value={settings.transportationCost}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  雑費
                </label>
                <input
                  type="number"
                  name="miscCost"
                  value={settings.miscCost}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
              </div>
            </div>
          </div>

          <div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    初期レジ金
  </label>
  <input
    type="number"
    name="initialCash"
    value={settings.initialCash}
    onChange={handleChange}
    className="w-full p-2 border border-slate-200 rounded-md text-slate-700 
      focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
    required
  />
</div>

          <button
            type="submit"
            disabled={isSaving}
            className={`w-full py-3 ${
              isSaving ? 'bg-slate-400' : 'bg-blue-500 hover:bg-blue-600'
            } text-white rounded-md shadow-md transition-colors duration-200`}
          >
            {isSaving ? '保存中...' : '設定を保存'}
          </button>
        </form>
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
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            分析
          </button>
          <button
            onClick={() => router.push('/settings/event')}
            className="flex-1 py-3 text-sm font-medium bg-slate-800 text-white"
          >
            設定
          </button>
        </div>
      </div>
    </div>
  );
}