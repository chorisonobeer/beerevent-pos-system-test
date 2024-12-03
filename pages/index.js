/*
 * POS System - Main Component
 * 
 * このファイルは、POSシステムのメインコンポーネントを含みます。
 * コンポーネントは論理的なセクションに分かれており、各セクションは
 * 特定の機能や関連する処理をグループ化しています。
 */

// ==================== 1. インポート ====================
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSwipeable } from 'react-swipeable';

// ==================== 2. SwipeableItemコンポーネント ====================
/**
 * スワイプで削除可能な商品アイテムコンポーネント
 * 商品の数量調整と削除機能を提供
 */
const SwipeableItem = ({ item, updateQuantity, removeItem }) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlers = useSwipeable({
    // スワイプ開始時の閾値を設定（ピクセル単位）
    delta: 50, // この距離まではスワイプを開始しない
    
    // スワイプ中の処理
    onSwiping: (data) => {
      // 横方向の移動が10px以上の場合のみスワイプ処理を行う
      if (Math.abs(data.deltaX) > 10) {
        setIsDragging(true);
        setOffset(data.deltaX);
      }
    },
    
    // 左スワイプ完了時
    onSwipedLeft: (data) => {
      setIsDragging(false);
      // 削除のための閾値を100pxに設定
      if (Math.abs(data.deltaX) > 100) {
        removeItem(item.id);
      }
      setOffset(0);
    },
    
    // 右スワイプ完了時
    onSwipedRight: (data) => {
      setIsDragging(false);
      // 削除のための閾値を100pxに設定
      if (Math.abs(data.deltaX) > 100) {
        removeItem(item.id);
      }
      setOffset(0);
    },

    // スワイプがキャンセルされた時
    onSwiped: (data) => {
      // 閾値に達していない場合は位置をリセット
      if (Math.abs(data.deltaX) <= 100) {
        setOffset(0);
        setIsDragging(false);
      }
    },

    trackMouse: true,
    preventScrollOnSwipe: false // スクロールを妨げない
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

// ==================== 3. メインコンポーネント ====================
export default function Home() {
  // ---------- 3.1 ステート管理 ----------
  const router = useRouter();
  const [items, setItems] = useState([]); // カート内アイテム
  const [products, setProducts] = useState([]); // 商品リスト
  const [paymentAmount, setPaymentAmount] = useState(''); // 支払い金額
  const [change, setChange] = useState(null); // おつり
  const [registerBalance, setRegisterBalance] = useState(0); // レジ残高
  const [isLoading, setIsLoading] = useState(false); // ローディング状態
  const [selectedProduct, setSelectedProduct] = useState(null); // 選択中商品
  const [showSizeModal, setShowSizeModal] = useState(false); // サイズモーダル表示
  const [isMenuOpen, setIsMenuOpen] = useState(false); // メニュー表示
  const [dailyTotal, setDailyTotal] = useState(0); // 今日の売上累計

  // ---------- 3.2 副作用（初期データ取得） ----------
  useEffect(() => {
    fetchProducts();
    fetchRegisterBalance();
    fetchDailyTotal(); // 追加
  }, []);

  // ---------- 3.3 データ取得関数 ----------
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

  const fetchDailyTotal = async () => {
    try {
      const response = await fetch('/api/daily-total', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
      });
      const data = await response.json();
      setDailyTotal(data.total || 0);
    } catch (error) {
      console.error('本日の売上取得に失敗:', error);
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

  // ---------- 3.4 計算関数 ----------
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

  // ---------- 3.5 商品関連ハンドラー ----------
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

  // ---------- 3.6 カート操作ハンドラー ----------
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

  // ---------- 3.7 支払い関連ハンドラー ----------
  const handlePaymentChange = (e) => {
    setPaymentAmount(e.target.value);
    setChange(null);
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
  // 音を再生
  const audio = new Audio('/sounds/chime.mp3');
  audio.play();


          setChange(payment - total);
          setRegisterBalance(prev => prev + total);
          setDailyTotal(prev => prev + total); // 売上累計を更新
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

  // ---------- 3.8 モーダルコンポーネント ----------
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

  // ---------- 3.9 メインレイアウトレンダリング ----------
  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen relative">
      <div className="p-4 pb-48">
        {/* 商品グリッド */}
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

        {/* カート表示部分 */}
        <div className="bg-white p-4 rounded-lg mb-2 shadow-md h-[calc(100vh-440px)] relative">
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
      </div>

{/* 支払い関連の固定コンテナ */}
<div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-lg">
  <div className="max-w-sm mx-auto p-4">
    <div className="mb-2">
      <input
        type="number"
        value={paymentAmount}
        onChange={handlePaymentChange}
        placeholder="お預かり金額"
        className="w-full p-2 border border-slate-700 rounded-md text-slate-700 bg-white
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      />

      {paymentAmount && (
        <div className={`text-right font-bold mt-1 ${
          parseInt(paymentAmount) >= calculateTotal() 
            ? 'text-green-400' 
            : 'text-red-400'
        }`}>
          {calculateDifference(paymentAmount)}
        </div>
      )}
    </div>

    <div className="flex gap-2">
      {/* ハンバーガーメニューボタン - より暗い背景に合わせて色を調整 */}
      <button 
        onClick={() => setIsMenuOpen(true)}
        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md 
          transition-colors duration-200"
        aria-label="メニューを開く"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 会計ボタン - 色の対比を維持 */}
      <button
        onClick={handleCheckout}
        disabled={isLoading || parseInt(paymentAmount) < calculateTotal()}
        className={`flex-1 py-3 ${
          isLoading || parseInt(paymentAmount) < calculateTotal() 
            ? 'bg-slate-600' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white rounded-md shadow-md transition-colors duration-200`}
      >
        {isLoading ? '処理中...' : '会計する'}
      </button>
    </div>

    {/* 本日の売上累計 - テキスト色を明るく調整 */}
    <div className="text-right mt-1 text-xs text-slate-300">
      本日の売上: ¥{dailyTotal.toLocaleString()}
    </div>

    {change !== null && !paymentAmount && (
      <div className="text-right text-xl font-bold text-green-400 mt-2">
        お釣り: ¥{change.toLocaleString()}
      </div>
    )}
  </div>
</div>

     {/* サイドメニュー */}
     {isMenuOpen && (
       <>
         <div 
           className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
           onClick={() => setIsMenuOpen(false)}
         />
         <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg z-50 transform 
           transition-transform duration-300">
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

     {/* サイズ選択モーダル */}
     <SizeModal />
   </div>
 );
}