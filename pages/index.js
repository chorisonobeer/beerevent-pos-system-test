import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSwipeable } from 'react-swipeable';
import { 
  fetchWithSpreadsheetId, 
  hasSpreadsheetId, 
  getCurrentSpreadsheetId 
} from '../utils/api.js';  // .js拡張子を追加

// setLoadingステート追加（コンポーネントの先頭で）
const [isCreating, setIsCreating] = useState(false);

// SwipeableItemコンポーネント
const SwipeableItem = ({ item, updateQuantity, removeItem }) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlers = useSwipeable({
    onSwiping: (data) => {
      setIsDragging(true);
      setOffset(data.deltaX);
    },
    onSwipedLeft: (data) => {
      setIsDragging(false);
      if (Math.abs(data.deltaX) > 100) {
        removeItem(item.id);
      } else {
        setOffset(0);
      }
    },
    onSwipedRight: (data) => {
      setIsDragging(false);
      if (Math.abs(data.deltaX) > 100) {
        removeItem(item.id);
      } else {
        setOffset(0);
      }
    },
    trackMouse: true
  });

  return (
    <div
      {...handlers}
      className="relative mb-3 touch-pan-y"
      style={{
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        transform: `translateX(${offset}px)`,
        opacity: Math.max(0, (150 - Math.abs(offset)) / 150)
      }}
    >
      <div className="flex items-center justify-between text-slate-700">
        <span className="flex-1 font-medium">{item.name}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md 
              transition-colors duration-200"
          >
            -
          </button>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
            className="w-8 text-center border border-slate-200 rounded-md py-1 text-slate-700"
            min="1"
            max="9"
          />
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md 
              transition-colors duration-200"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [change, setChange] = useState(null);
  const [registerBalance, setRegisterBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
    const storedId = localStorage.getItem('currentSpreadsheetId');
    if (storedId) {
      fetchInitialData();
    } else {
      setIsLoading(false);
    }
  }, []);

  if (!mounted) {
    return null;
  }

// スプレッドシート未設定時の表示部分を修正
if (!localStorage.getItem('currentSpreadsheetId')) {
  return (
    <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
      <div className="text-center py-8">
        <div className="text-xl font-bold text-slate-800 mb-4">
          スプレッドシートが設定されていません
        </div>
        <div className="space-y-4">
          <button
            onClick={async () => {
              if (isCreating) return;
              setIsCreating(true);
              await handleCreateNew();
              setIsCreating(false);
            }}
            disabled={isCreating}
            className="px-6 py-3 bg-green-500 text-white rounded-lg 
              hover:bg-green-600 transition-colors duration-200 w-full"
          >
            {isCreating ? '作成中...' : '新規作成'}
          </button>
          <button
            onClick={() => router.push('/settings/event')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg 
              hover:bg-blue-600 transition-colors duration-200 w-full"
          >
            設定画面へ
          </button>
        </div>
      </div>
    </div>
  );
}

  const fetchProducts = async () => {
    try {
      const response = await fetchWithSpreadsheetId('/api/products');
      const data = await response.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (error) {
      console.error('商品データの取得に失敗:', error);
      alert('商品データの取得に失敗しました: ' + error.message);
    }
  };

  const fetchRegisterBalance = async () => {
    try {
      const response = await fetchWithSpreadsheetId('/api/register-balance');
      const data = await response.json();
      setRegisterBalance(data.balance || 0);
    } catch (error) {
      console.error('レジ残高の取得に失敗:', error);
      alert('レジ残高の取得に失敗しました: ' + error.message);
    }
  };

  

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateDifference = (input) => {
    const payment = parseInt(input) || 0;
    const total = calculateTotal();
    const diff = payment - total;
    if (payment === 0) return null;
    if (diff < 0) {
      return `${Math.abs(diff).toLocaleString()}円不足`;
    }
    return `${diff.toLocaleString()}円のお釣り`;
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowSizeModal(true);
  };

  const handleSizeSelect = (size) => {
    if (!selectedProduct) return;

    const price = selectedProduct.prices[size];
    if (!price) return;

    addItem({
      id: `${selectedProduct.id}-${size}`,
      name: `${selectedProduct.name}(${size})`,
      price: price,
      originalSize: size,
      originalId: selectedProduct.id
    });

    setShowSizeModal(false);
    setSelectedProduct(null);
    setChange(null);
  };

  const handlePaymentChange = (e) => {
    setPaymentAmount(e.target.value);
    setChange(null);
  };

  const addItem = (product) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    setChange(null);
    setItems(prevItems => 
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id) => {
    setChange(null);
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const total = calculateTotal();
      const payment = parseInt(paymentAmount) || 0;
      if (payment >= total) {
        const transactionData = {
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
          })),
          total,
          payment,
          change: payment - total,
          timestamp: new Date().toISOString(),
          newBalance: registerBalance + total
        };
  
        const response = await fetchWithSpreadsheetId('/api/record-transaction', {
          method: 'POST',
          body: JSON.stringify(transactionData),
        });
  
        if (response.ok) {
          setChange(payment - total);
          setRegisterBalance(prev => prev + total);
          setItems([]);
          setPaymentAmount('');
        }
      }
    } catch (error) {
      console.error('取引の記録に失敗:', error);
      alert('取引の記録に失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    console.log('Creating new spreadsheet...');
    try {
      const response = await fetch('/api/create-spreadsheet', {
        method: 'POST'
      });
      console.log('Response received:', response);
      const data = await response.json();
      console.log('Data:', data);
      
      if (data.spreadsheetId) {
        localStorage.setItem('currentSpreadsheetId', data.spreadsheetId);
        const history = JSON.parse(localStorage.getItem('spreadsheetHistory') || '[]');
        const newHistory = [...new Set([...history, data.spreadsheetId])];
        localStorage.setItem('spreadsheetHistory', JSON.stringify(newHistory));
        
        console.log('Reloading page...');
        router.reload();
      }
    } catch (error) {
      console.error('スプレッドシート作成エラー:', error);
      alert('スプレッドシートの作成に失敗しました：' + error.message);
    }
  };

  const SizeModal = () => {
    if (!showSizeModal || !selectedProduct) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4 w-80">
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">
            {selectedProduct.name}のサイズを選択
          </h3>
          <div className="space-y-2">
            {Object.entries(selectedProduct.prices).map(([size, price]) => (
              price > 0 && (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  className="w-full p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg 
                    transition-colors duration-200"
                >
                  {size} - ¥{price.toLocaleString()}
                </button>
              )
            ))}
          </div>
          <button
            onClick={() => {
              setShowSizeModal(false);
              setSelectedProduct(null);
            }}
            className="w-full mt-4 p-2 border border-slate-200 rounded-lg text-slate-600
              hover:bg-slate-50 transition-colors duration-200"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  };

  if (!localStorage.getItem('currentSpreadsheetId')) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">
          <div className="text-xl font-bold text-slate-800 mb-4">
            スプレッドシートが設定されていません
          </div>
          <div className="flex flex-col gap-4">
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-green-500 text-white rounded-lg 
                hover:bg-green-600 transition-colors duration-200"
            >
              新規作成
            </button>
            <button
              onClick={() => router.push('/settings/event')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg 
                hover:bg-blue-600 transition-colors duration-200"
            >
              設定画面へ
            </button>
          </div>
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
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen relative">
      <div className="p-4 pt-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Array.isArray(products) && products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product)}
              className={`p-2 ${
                Object.values(product.prices).some(price => price > 0)
                  ? 'bg-slate-800 hover:bg-slate-700'
                  : 'bg-slate-400'
              } text-white rounded-lg text-xs active:opacity-75 whitespace-pre-line shadow-md 
              transition-all duration-200 ease-in-out h-12 flex items-center justify-center text-center`}
              disabled={!Object.values(product.prices).some(price => price > 0)}
            >
              <span className="w-full truncate">
                {product.name.length > 6 ? `${product.name.slice(0, 6)}...` : product.name}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-lg mb-2 shadow-md h-[calc(100vh-500px)] relative">
          <div className="overflow-y-auto h-[calc(100%-40px)]">
            {items.length === 0 ? (
              <div className="text-center text-slate-500 py-4">カートは空です</div>
            ) : (
              items.map((item) => (
                <SwipeableItem
                  key={item.id}
                  item={item}
                  updateQuantity={updateQuantity}
                  removeItem={removeItem}
                />
              ))
            )}
          </div>
          {items.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t pt-2 pb-1 px-4">
              <div className="text-right text-xl font-bold text-slate-800">
                合計: ¥{calculateTotal().toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-sm mx-auto p-4">
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors duration-200"
                aria-label="メニューを開く"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <button
                onClick={handleCheckout}
                disabled={isLoading || parseInt(paymentAmount) < calculateTotal()}
                className={`flex-1 py-3 ${
                  isLoading || parseInt(paymentAmount) < calculateTotal() 
                    ? 'bg-slate-400' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white rounded-md shadow-md transition-colors duration-200`}
              >
                {isLoading ? '処理中...' : '会計する'}
              </button>
            </div>

            <div className="h-24">
              <input
                type="number"
                value={paymentAmount}
                onChange={handlePaymentChange}
                placeholder="お預かり金額"
                className="w-full p-2 border border-slate-200 rounded-md text-slate-700 
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mb-2"
              />


                    {paymentAmount && (
                <div className={`text-right font-bold ${
                  parseInt(paymentAmount) >= calculateTotal() 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {calculateDifference(paymentAmount)}
                </div>
              )}

              {change !== null && !paymentAmount && (
                <div className="text-right text-xl font-bold text-green-600">
                  お釣り: ¥{change.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* サイドメニュー */}
      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-slate-800">メニュー</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  aria-label="メニューを閉じる"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 p-4">
                <div className="space-y-2">
                  {[
                    { label: 'POS', path: '/' },
                    { label: '分析', path: '/dashboard' },
                    { label: '設定', path: '/settings/event' }
                  ].map(item => (
                    <button
                      key={item.path}
                      onClick={() => {
                        router.push(item.path);
                        setIsMenuOpen(false);
                      }}
                      className="w-full p-3 text-left hover:bg-slate-100 rounded-lg transition-colors
                        duration-200 flex items-center text-slate-700"
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </>
      )}

      <SizeModal />
    </div>
  );
}