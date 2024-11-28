import { useState, useEffect } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('pos');
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [change, setChange] = useState(null);
  const [registerBalance, setRegisterBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

const [products, setProducts] = useState([  // 空の配列で初期化
  { id: 1, name: '商品A', price: 1000 },  // 初期データを設定
  { id: 2, name: '商品B', price: 1200 },
  { id: 3, name: '商品C', price: 1500 },
  { id: 4, name: '商品D', price: 1650 },
  { id: 5, name: '商品E', price: 1900 }
]);

  useEffect(() => {
    fetchProducts();
    fetchRegisterBalance();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
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

  const handleInput = (e, id, field, value) => {
    e.preventDefault();
    const updatedProducts = products.map(product =>
      product.id === id ? { ...product, [field]: value } : product
    );
    setProducts(updatedProducts);
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
    setItems(prevItems => 
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id) => {
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
    <div className="flex gap-2 mb-2">
      <input
        type="text"
        value={product.name}
        onChange={(e) => handleInput(e, product.id, 'name', e.target.value)}
        placeholder="商品名"
        className="flex-1 p-2 border rounded"
      />
      <input
        type="number"
        value={product.price}
        onChange={(e) => handleInput(e, product.id, 'price', parseInt(e.target.value) || 0)}
        placeholder="価格"
        className="w-32 p-2 border rounded"
      />
    </div>
  );

  return (
    <div className="max-w-sm mx-auto p-4 bg-gray-100 min-h-screen">
      <div className="flex mb-4">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex-1 p-4 ${activeTab === 'pos' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          POS
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 p-4 ${activeTab === 'settings' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          商品設定
        </button>
      </div>

      {activeTab === 'pos' ? (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addItem(product)}
                className="p-4 bg-yellow-500 text-white rounded-lg text-sm active:opacity-75 whitespace-pre-line"
              >
                {`${product.name}\n¥${product.price.toLocaleString()}`}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 rounded-lg mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between mb-2">
                <span className="flex-1">{item.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-2 bg-gray-200 rounded"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                    className="w-16 text-center border rounded"
                  />
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-2 bg-gray-200 rounded"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-2 px-2 bg-red-500 text-white rounded"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <div className="text-right text-xl font-bold mt-4">
              合計: ¥{calculateTotal().toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <div className="mb-4 text-right">
              レジ残高: ¥{registerBalance.toLocaleString()}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="お預かり金額"
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className={`px-4 ${isLoading ? 'bg-gray-400' : 'bg-green-500'} text-white rounded`}
              >
                {isLoading ? '処理中...' : '会計する'}
              </button>
            </div>
            {change !== null && (
              <div className="text-right text-xl font-bold">
                お釣り: ¥{change.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-lg">
          {products.map((product) => (
            <div key={product.id} className="mb-4 p-4 border rounded">
              <ProductInput product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}