import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSwipeable } from 'react-swipeable';

// SwipeableItem コンポーネント
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
  const [activeTab, setActiveTab] = useState('pos');
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([
    { 
      id: 1, 
      name: '商品A',
      prices: {
        S: 1000,
        M: 1200,
        L: 1400
      }
    }
  ]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [change, setChange] = useState(null);
  const [registerBalance, setRegisterBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSizeModal, setShowSizeModal] = useState(false);

  useEffect(() => {
    console.log('Current products:', products);
    fetchProducts();
    fetchRegisterBalance();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      console.log('Fetched data:', data);
      setProducts(data);
    } catch (error) {
      console.error('商品データの取得に失敗:', error);
    }
  };

  const fetchRegisterBalance = async () => {
    try {
      const response = await fetch('/api/register-balance');
      const data = await response.json();
      setRegisterBalance(data.balance);
    } catch (error) {
      console.error('レジ残高の取得に失敗:', error);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowSizeModal(true);
  };

  const handleSizeSelect = (size) => {
    if (!selectedProduct) return;

    const price = selectedProduct.prices[size];
    if (!price) return;

    const productWithSize = {
      id: `${selectedProduct.id}-${size}`,
      name: `${selectedProduct.name}(${size})`,
      price: price
    };

    addItem(productWithSize);
    setShowSizeModal(false);
    setSelectedProduct(null);
    setChange(null);
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

  const handlePaymentChange = (e) => {
    setPaymentAmount(e.target.value);
    setChange(null);
  };

  const handleInput = (e, id, field, value) => {
    e.preventDefault();
    const updatedProducts = products.map(product =>
      product.id === id ? { ...product, [field]: value } : product
    );
    setProducts(updatedProducts);
  };

  const addItem = (product) => {
    setChange(null);
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

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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

  const ProductInput = ({ product }) => (
    <div className="space-y-2">
      <input
        type="text"
        value={product.name}
        onChange={(e) => handleInput(e, product.id, 'name', e.target.value)}
        placeholder="商品名"
        className="w-full p-2 border border-slate-200 rounded-md text-slate-700 
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      />
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(product.prices).map(([size, price]) => (
          <div key={size}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {size}サイズ
            </label>
            <input
              type="number"
              value={price || ''}
              onChange={(e) => handleInput(e, product.id, `prices.${size}`, parseInt(e.target.value) || 0)}
              placeholder={`${size}サイズの価格`}
              className="w-full p-2 border border-slate-200 rounded-md text-slate-700 
                focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );

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
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen flex flex-col">
      <div className="flex-grow pb-16 p-4">
        {activeTab === 'pos' ? (
          <div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {Array.isArray(products) && products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className={`p-4 ${
                    Object.values(product.prices).some(price => price > 0)
                      ? 'bg-slate-800 hover:bg-slate-700'
                      : 'bg-slate-400'
                  } text-white rounded-lg text-sm active:opacity-75 whitespace-pre-line shadow-md 
                  transition-all duration-200 ease-in-out`}
                  disabled={!Object.values(product.prices).some(price => price > 0)}
                >
                  {product.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-4 rounded-lg mb-4 shadow-md">
              {items.map((item) => (
                <SwipeableItem
                  key={item.id}
                  item={item}
                  updateQuantity={updateQuantity}
                  removeItem={removeItem}
                />
              ))}
              <div className="text-right text-xl font-bold mt-6 text-slate-800">
                合計: ¥{calculateTotal().toLocaleString()}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="mb-4 text-right text-slate-800 font-medium">
                レジ残高: ¥{registerBalance.toLocaleString()}
              </div>
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
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-md">
            {Array.isArray(products) && products.map((product) => (
              <div key={product.id} className="mb-4 p-4 border border-slate-200 rounded-lg">
                <ProductInput product={product} />
              </div>
            ))}
          </div>
        )}
      </div>

{/* 下部タブ */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-sm mx-auto flex">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'pos' 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
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
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            設定
          </button>
        </div>
      </div>

      <SizeModal />
    </div>
  );
}