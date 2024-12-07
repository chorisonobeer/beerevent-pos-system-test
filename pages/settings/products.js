import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SettingsTabs from '../../components/SettingsTabs';
import { 
  fetchWithSpreadsheetId, 
  hasSpreadsheetId 
} from '../../utils/api';

export default function ProductSettings() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasSpreadsheetId()) {
      setIsLoading(false);
      return;
    }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetchWithSpreadsheetId('/api/products-settings');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      alert('商品データの取得に失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetchWithSpreadsheetId('/api/products-settings', {
        method: 'POST',
        body: JSON.stringify(products)
      });
      if (response.ok) {
        alert('商品データを保存しました');
      } else {
        throw new Error('保存に失敗しました');
      }
    } catch (error) {
      alert('商品データの保存に失敗しました: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductChange = (index, field, value) => {
    setProducts(prevProducts => {
      const newProducts = [...prevProducts];
      if (field.includes('.')) {
        const [mainField, subField] = field.split('.');
        newProducts[index] = {
          ...newProducts[index],
          [mainField]: {
            ...newProducts[index][mainField],
            [subField]: value
          }
        };
      } else {
        newProducts[index] = {
          ...newProducts[index],
          [field]: value
        };
      }
      return newProducts;
    });
  };

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
            onClick={() => router.push('/settings/event')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg 
              hover:bg-blue-600 transition-colors duration-200"
          >
            設定画面へ
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen flex flex-col">
      <SettingsTabs currentPath="/settings/products" />
      
      <div className="flex-grow p-4 pt-16 pb-16">
        <form onSubmit={handleSubmit}>
          {products.map((product, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-4 mb-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  商品名
                </label>
                <input
                  type="text"
                  value={product.name || ''}
                  onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">販売価格設定</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">S価格</label>
                    <input
                      type="number"
                      value={product.prices?.S || ''}
                      onChange={(e) => handleProductChange(index, 'prices.S', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">M価格</label>
                    <input
                      type="number"
                      value={product.prices?.M || ''}
                      onChange={(e) => handleProductChange(index, 'prices.M', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">L価格</label>
                    <input
                      type="number"
                      value={product.prices?.L || ''}
                      onChange={(e) => handleProductChange(index, 'prices.L', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">1ロットの容量 (ml)</label>
                    <input
                      type="number"
                      value={product.lotVolume || ''}
                      onChange={(e) => handleProductChange(index, 'lotVolume', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">1ロットの原価 (円)</label>
                    <input
                      type="number"
                      value={product.lotCost || ''}
                      onChange={(e) => handleProductChange(index, 'lotCost', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">サイズ別容量 (ml)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Sサイズ</label>
                    <input
                      type="number"
                      value={product.sizeVolumes?.S || ''}
                      onChange={(e) => handleProductChange(index, 'sizeVolumes.S', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Mサイズ</label>
                    <input
                      type="number"
                      value={product.sizeVolumes?.M || ''}
                      onChange={(e) => handleProductChange(index, 'sizeVolumes.M', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Lサイズ</label>
                    <input
                      type="number"
                      value={product.sizeVolumes?.L || ''}
                      onChange={(e) => handleProductChange(index, 'sizeVolumes.L', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-slate-700 mb-2">サイズ別原価（自動計算）</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Sサイズ</label>
                    <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                      {product.costPerSize?.S || 0}円
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Mサイズ</label>
                    <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                      {product.costPerSize?.M || 0}円
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Lサイズ</label>
                    <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                      {product.costPerSize?.L || 0}円
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

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