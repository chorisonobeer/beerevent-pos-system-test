import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SettingsTabs from '../../components/SettingsTabs';




export default function ProductSettings() {
  const router = useRouter();
// 冒頭のuseState宣言部分
const [products, setProducts] = useState([{
    name: '',
    prices: { S: 0, M: 0, L: 0 },
    lotVolume: 0,
    lotCost: 0,
    sizeVolumes: { S: 0, M: 0, L: 0 },
    costPerSize: { S: 0, M: 0, L: 0 }
  }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

 // fetchProducts関数
const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products-settings');
      const data = await response.json();
      const formattedData = data.map(product => ({
        ...product,
        sizeVolumes: product.sizeVolumes || { S: 0, M: 0, L: 0 },
        costPerSize: product.costPerSize || { S: 0, M: 0, L: 0 }
      }));
      setProducts(formattedData);
    } catch (error) {
      console.error('商品データの取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/products-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(products)
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      alert('商品データを保存しました');
    } catch (error) {
      console.error('保存に失敗:', error);
      alert('保存に失敗しました: ' + error.message);
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
                  value={product.name}
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
                      value={product.prices.S}
                      onChange={(e) => handleProductChange(index, 'prices.S', Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">M価格</label>
                    <input
                      type="number"
                      value={product.prices.M}
                      onChange={(e) => handleProductChange(index, 'prices.M', Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">L価格</label>
                    <input
                      type="number"
                      value={product.prices.L}
                      onChange={(e) => handleProductChange(index, 'prices.L', Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">原価設定</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">1ロットの容量 (ml)</label>
                    <input
                      type="number"
                      value={product.lotVolume}
                      onChange={(e) => handleProductChange(index, 'lotVolume', Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">1ロットの原価 (円)</label>
                    <input
                      type="number"
                      value={product.lotCost}
                      onChange={(e) => handleProductChange(index, 'lotCost', Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-600 mb-2">サイズ別容量 (ml)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Sサイズ</label>
                      <input
                        type="number"
                        value={product.sizeVolumes.S}
                        onChange={(e) => handleProductChange(index, 'sizeVolumes.S', Number(e.target.value))}
                        className="w-full p-2 border border-slate-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Mサイズ</label>
                      <input
                        type="number"
                        value={product.sizeVolumes.M}
                        onChange={(e) => handleProductChange(index, 'sizeVolumes.M', Number(e.target.value))}
                        className="w-full p-2 border border-slate-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Lサイズ</label>
                      <input
                        type="number"
                        value={product.sizeVolumes.L}
                        onChange={(e) => handleProductChange(index, 'sizeVolumes.L', Number(e.target.value))}
                        className="w-full p-2 border border-slate-200 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-600 mb-2">サイズ別原価（自動計算）</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Sサイズ</label>
                      <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                        {product.costPerSize.S.toFixed(1)}円
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Mサイズ</label>
                      <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                        {product.costPerSize.M.toFixed(1)}円
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Lサイズ</label>
                      <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                        {product.costPerSize.L.toFixed(1)}円
                      </div>
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
            onClick={() => router.push('/settings/products')}
            className="flex-1 py-3 text-sm font-medium bg-slate-800 text-white"
          >
            設定
          </button>
        </div>
      </div>
    </div>
  );
}