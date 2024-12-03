import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSwipeable } from 'react-swipeable';

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchRegisterBalance();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (error) {
      console.error('商品データの取得に失敗:', error);
    }
  };

  const fetchRegisterBalance = async () => {
    try {
      const response = await fetch('/api/register-balance', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });
      const data = await response.json();
      setRegisterBalance(data.balance || 0);
    } catch (error) {
      console.error('レジ残高の取得に失敗:', error);
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

        const response = await fetch('/api/record-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
    } finally {
      setIsLoading(false);
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

  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen relative">
{/* ハンバーガーメニューボタン */}
<button 
  onClick={() => setIsMenuOpen(true)}
  className="fixed top-3 right-3 p-1.5 rounded-full bg-slate-800 text-white shadow-lg z-30" // サイズ調整
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> // アイコンサイズ調整
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
</button>

      {/* サイドメニュー */}
      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg z-50 p-4">
            <div className="flex justify-end">
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => {
                  router.push('/');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-100 rounded"
              >
                POS
              </button>
              <button
                onClick={() => {
                  router.push('/dashboard');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-100 rounded"
              >
                分析
              </button>
              <button
                onClick={() => {
                  router.push('/settings/event');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-100 rounded"
              >
                設定
              </button>
            </div>
          </div>
        </>
      )}

      <div className="p-4 pt-16">
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
              transition-all duration-200 ease-in-out h-12`}
              disabled={!Object.values(product.prices).some(price => price > 0)}
            >
              {product.name.length > 6 ? `${product.name.slice(0, 6)}...` : product.name}
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-lg mb-2 shadow-md max-h-[calc(100vh-400px)] overflow-y-auto">
  {items.map((item) => (
    <SwipeableItem
      key={item.id}
      item={item}
      updateQuantity={updateQuantity}
      removeItem={removeItem}
    />
  ))}
  <div className="text-right text-xl font-bold mt-6 pb-2 text-slate-800 sticky bottom-0 bg-white">
    合計: ¥{calculateTotal().toLocaleString()}
  </div>
</div>

<div className="bg-gradient-to-b from-slate-50 to-white p-4 rounded-lg shadow-md border border-slate-100">
  <div className="mb-4">
    <input
      type="number"
      value={paymentAmount}
      onChange={handlePaymentChange}
      placeholder="お預かり金額"
      className="w-full p-2 border border-slate-200 rounded-md text-slate-700 
        focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
    />

            {paymentAmount && (
              <div className={`text-right font-bold mt-2 ${
                parseInt(paymentAmount) >= calculateTotal() 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {calculateDifference(paymentAmount)}
              </div>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={isLoading || parseInt(paymentAmount) < calculateTotal()}
            className={`w-full py-3 ${
              isLoading || parseInt(paymentAmount) < calculateTotal() 
                ? 'bg-slate-400' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white rounded-md shadow-md transition-colors duration-200`}
          >
            {isLoading ? '処理中...' : '会計する'}
          </button>

          {change !== null && !paymentAmount && (
            <div className="text-right text-xl font-bold text-slate-800 mt-4">
              お釣り: ¥{change.toLocaleString()}
            </div>
          )}
        </div>

        <SizeModal />
      </div>
    </div>
  );
}