import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SettingsTabs from '../../components/SettingsTabs';
import { 
  fetchWithSpreadsheetId, 
  hasSpreadsheetId,
  addToSpreadsheetHistory 
} from '../../utils/api';

export default function EventSettings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSpreadsheetModal, setShowSpreadsheetModal] = useState(false);
  const [currentSpreadsheetId, setCurrentSpreadsheetId] = useState('');
  const [spreadsheetHistory, setSpreadsheetHistory] = useState([]);
  const [settings, setSettings] = useState({
    eventName: '',
    startDate: '',
    endDate: '',
    initialCash: '',
    targetSales: '',
    targetQuantity: '',
    boothFee: '',
    laborCost: '',
    transportationCost: '',
    miscCost: '',
    margin: '',
    breakEvenPoint: ''
  });

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    const storedId = localStorage.getItem('currentSpreadsheetId');
    const storedHistory = JSON.parse(localStorage.getItem('spreadsheetHistory') || '[]');
    setCurrentSpreadsheetId(storedId || '');
    setSpreadsheetHistory(storedHistory);
    if (storedId) {
      await fetchSettings();
    }
    setIsLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const response = await fetchWithSpreadsheetId('/api/event-settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      alert('設定の取得に失敗しました: ' + error.message);
    }
  };

  const handleCreateNew = async () => {
    try {
      const response = await fetch('/api/create-spreadsheet', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.spreadsheetId) {
        localStorage.setItem('currentSpreadsheetId', data.spreadsheetId);
        addToSpreadsheetHistory(data.spreadsheetId);
        setCurrentSpreadsheetId(data.spreadsheetId);
        setSpreadsheetHistory(prev => [...new Set([...prev, data.spreadsheetId])]);
        router.reload();
      }
    } catch (error) {
      alert('新規スプレッドシートの作成に失敗しました: ' + error.message);
    }
  };

  const handleSpreadsheetSelect = (id) => {
    localStorage.setItem('currentSpreadsheetId', id);
    setCurrentSpreadsheetId(id);
    setShowSpreadsheetModal(false);
    router.reload();
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
      const response = await fetchWithSpreadsheetId('/api/event-settings', {
        method: 'POST',
        body: JSON.stringify({
          eventName: settings.eventName || '',
          startDate: settings.startDate || '',
          endDate: settings.endDate || '',
          initialCash: Number(settings.initialCash) || 0,
          targetSales: Number(settings.targetSales) || 0,
          targetQuantity: Number(settings.targetQuantity) || 0,
          boothFee: Number(settings.boothFee) || 0,
          laborCost: Number(settings.laborCost) || 0,
          transportationCost: Number(settings.transportationCost) || 0,
          miscCost: Number(settings.miscCost) || 0,
          margin: Number(settings.margin) || 0,
          breakEvenPoint: Number(settings.breakEvenPoint) || 0
        })
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      alert('設定を保存しました');
    } catch (error) {
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

  if (!currentSpreadsheetId) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">
          <div className="text-xl font-bold text-slate-800 mb-4">
            スプレッドシートが設定されていません
          </div>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg 
              hover:bg-blue-600 transition-colors duration-200"
          >
            新規作成
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen flex flex-col">
      <SettingsTabs currentPath="/settings/event" />
      
      <div className="flex-grow p-4 pt-16 pb-16">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  初期レジ金
                </label>
                <input
                  type="number"
                  name="initialCash"
                  value={settings.initialCash}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
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

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">収益設定</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  販売マージン (%)
                </label>
                <input
                  type="number"
                  name="margin"
                  value={settings.margin}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  損益分岐杯数
                </label>
                <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                  {settings.breakEvenPoint}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              スプレッドシート管理
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  現在のスプレッドシートID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentSpreadsheetId}
                    readOnly
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(currentSpreadsheetId)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"
                    title="IDをコピー"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors duration-200"
                >
                  新規作成
                </button>
                <button
                  type="button"
                  onClick={() => setShowSpreadsheetModal(true)}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200"
                >
                  切り替え
                </button>
              </div>
            </div>
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

      {showSpreadsheetModal && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg p-4 w-80">
           <h3 className="text-lg font-bold text-slate-800 mb-4">
             スプレッドシート選択
           </h3>
           <div className="max-h-60 overflow-y-auto space-y-2">
             {spreadsheetHistory.map((id) => (
               <button
                 key={id}
                 onClick={() => handleSpreadsheetSelect(id)}
                 className="w-full p-2 text-left hover:bg-slate-100 rounded-md"
               >
                 {id}
               </button>
             ))}
           </div>
           <button
             onClick={() => setShowSpreadsheetModal(false)}
             className="w-full mt-4 p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
           >
             キャンセル
           </button>
         </div>
       </div>
     )}

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