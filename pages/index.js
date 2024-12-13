import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAppState } from "../contexts/AppStateContext"; // 追加
import { useError } from "../contexts/ErrorContext"; // 追加
import { useSwipeable } from "react-swipeable";
import {
  fetchWithSpreadsheetId,
  hasSpreadsheetId,
  getCurrentSpreadsheetId,
} from "../utils/api.js";

function SizeModal({
  showSizeModal,
  selectedProduct,
  handleSizeSelect,
  setShowSizeModal,
  setSelectedProduct,
}) {
  if (!showSizeModal || !selectedProduct) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-80">
        <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">
          {selectedProduct.name}のサイズを選択
        </h3>
        <div className="space-y-2">
          {Object.entries(selectedProduct.prices).map(
            ([size, price]) =>
              price > 0 && (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  className="w-full p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
                >
                  {size} - ¥{price.toLocaleString()}
                </button>
              )
          )}
        </div>
        <button
          onClick={() => {
            setShowSizeModal(false);
            setSelectedProduct(null);
          }}
          className="w-full mt-4 p-2 border border-slate-200 rounded-lg text-slate-600"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

const ProductButton = ({ product, onClick }) => {
  const getStockColor = (remainingPercentage) => {
    if (remainingPercentage > 50) return "#69C294";
    if (remainingPercentage > 25) return "#CFCF46";
    if (remainingPercentage > 10) return "#CF7955";
    return "#1F0C0C";
  };

  const remainingPercentage =
    (product.stock.remainingVolume / product.stock.lotVolume) * 100;

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={!product.stock || product.stock.totalLots <= 0}
        className="relative p-3 text-white rounded-lg h-[85px] w-full flex flex-col justify-between overflow-hidden"
        style={{ backgroundColor: getStockColor(remainingPercentage) }}
      >
        <span className="text-sm font-bold line-clamp-2">{product.name}</span>
        <div className="text-xs font-medium">
          残{remainingPercentage.toFixed(1)}%
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-20 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-white bg-opacity-30"
            style={{ width: `${remainingPercentage}%` }}
          />
        </div>
      </button>

      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-sm border border-gray-000 flex items-center justify-center bg-white/60 backdrop-blur-sm text-gray-500 text-sm z-10">
        {product.stock.totalLots}
      </div>
    </div>
  );
};

function SwipeableItem({ item, updateQuantity, removeItem }) {
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
    trackMouse: true,
  });

  return (
    <div
      {...handlers}
      className="relative mb-3 touch-pan-y"
      style={{
        transition: isDragging ? "none" : "transform 0.2s ease-out",
        transform: `translateX(${offset}px)`,
        opacity: Math.max(0, (150 - Math.abs(offset)) / 150),
      }}
    >
      <div className="flex items-center justify-between text-slate-700">
        <span className="flex-1 font-medium">{item.name}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md"
          >
            -
          </button>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) =>
              updateQuantity(item.id, parseInt(e.target.value) || 0)
            }
            className="w-8 text-center border border-slate-200 rounded-md py-1 text-slate-700"
            min="1"
            max="9"
          />
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isOffline } = useAppState(); // 追加
  const { setError } = useError(); // 追加
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [change, setChange] = useState(null);
  const [registerBalance, setRegisterBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [todaySales, setTodaySales] = useState(0);

  const fetchProducts = async () => {
    try {
      const response = await fetchWithSpreadsheetId("/api/products");
      const data = await response.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (error) {
      console.error("商品データの取得に失敗:", error);
      alert("商品データの取得に失敗しました: " + error.message);
    }
  };

  const fetchRegisterBalance = async () => {
    try {
      const response = await fetchWithSpreadsheetId("/api/register-balance");
      const data = await response.json();
      setRegisterBalance(data.balance || 0);
      setTodaySales(data.todaySales || 0);
    } catch (error) {
      console.error("レジ残高の取得に失敗:", error);
      alert("レジ残高の取得に失敗しました: " + error.message);
    }
  };

  const fetchInitialData = async () => {
    try {
      await Promise.all([fetchProducts(), fetchRegisterBalance()]);
    } catch (error) {
      console.error("初期データの取得に失敗:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const storedId = localStorage.getItem("currentSpreadsheetId");
    if (storedId) {
      fetchInitialData();
    } else {
      setIsLoading(false);
    }
  }, []);

  if (!mounted) {
    return null;
  }

  const handleCreateNew = async () => {
    try {
      setIsCreating(true);
      console.log("Creating new spreadsheet...");

      const response = await fetch("/api/create-spreadsheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (!response.ok) {
        throw new Error(data.message || "スプレッドシートの作成に失敗しました");
      }

      if (!data.spreadsheetId) {
        throw new Error("スプレッドシートIDが取得できませんでした");
      }

      console.log("Setting new spreadsheet ID:", data.spreadsheetId);
      localStorage.setItem("currentSpreadsheetId", data.spreadsheetId);

      const history = JSON.parse(
        localStorage.getItem("spreadsheetHistory") || "[]"
      );
      const newHistory = [...new Set([...history, data.spreadsheetId])];
      localStorage.setItem("spreadsheetHistory", JSON.stringify(newHistory));

      alert("新しいスプレッドシートを作成しました。画面を更新します。");
      window.location.reload();
    } catch (error) {
      console.error("Error creating spreadsheet:", error);
      alert(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!localStorage.getItem("currentSpreadsheetId")) {
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
              {isCreating ? "作成中..." : "新規作成"}
            </button>
            <button
              onClick={() => router.push("/settings/event")}
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

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
      originalId: selectedProduct.id,
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
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
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
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id) => {
    setChange(null);
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const handleCheckout = async () => {
    if (isLoading) return;
    if (isOffline) {
      // 追加
      setError("オフライン時は会計処理ができません"); // 追加
      return; // 追加
    } // 追加

    try {
      const total = calculateTotal();
      const payment = parseInt(paymentAmount) || 0;
      if (payment >= total) {
        const transactionData = {
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
          })),
          total,
          payment,
          change: payment - total,
          timestamp: new Date().toISOString(),
          newBalance: registerBalance + total,
        };

        try {
          const response = await fetchWithSpreadsheetId(
            "/api/record-transaction",
            {
              method: "POST",
              body: JSON.stringify(transactionData),
            }
          );

          if (!response.ok) {
            throw new Error("取引の記録に失敗しました");
          }

          setChange(payment - total);
          setRegisterBalance((prev) => prev + total);
          setTodaySales((prev) => prev + total);
          setItems([]);
          setPaymentAmount("");

          try {
            const audio = new Audio("/chime.mp3");
            await audio.play();
          } catch (audioError) {
            console.warn("音声の再生に失敗:", audioError);
          }
        } catch (error) {
          setError("取引の記録に失敗しました。再度お試しください。"); // 変更
          throw error;
        }
      } else {
        setError("支払い金額が不足しています"); // 変更
      }
    } catch (error) {
      console.error("取引の処理に失敗:", error);
      // alert を setError に変更
      setError(error.message || "取引の処理に失敗しました");
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen flex flex-col">
      {/* カート表示エリア - 上部の残りスペースを全て使用 */}
      <div className="flex-1 p-4 overflow-y-auto h-[calc(100vh-155px)] flex">
        {/* flex追加 */}
        <div className="bg-white rounded-lg shadow-lg flex flex-col w-full">
          {/* w-full追加 */}
          {items.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-gray-500">
              カートは空です
            </div>
          ) : (
            <div className="p-2 flex flex-col-reverse flex-grow">
              {items.map((item) => (
                <SwipeableItem
                  key={item.id}
                  item={item}
                  updateQuantity={updateQuantity}
                  removeItem={removeItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 商品グリッド - 会計セクションの上に固定 */}
      <div className="px-4 pb-[155px]">
        {/* 会計セクションの高さ分を確保 */}
        <div className="grid grid-cols-3 gap-2">
          {Array.isArray(products) &&
            products.map((product) => (
              <ProductButton
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product)}
              />
            ))}
        </div>
      </div>

      {/* 会計セクション */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 p-2">
        <div className="max-w-sm mx-auto">
          <input
            type="number"
            value={paymentAmount}
            onChange={handlePaymentChange}
            placeholder="お預かり金額"
            className="w-full p-3 rounded-lg mb-2 bg-white text-slate-900"
          />

          {paymentAmount && (
            <div
              className={`text-right mb-0 font-bold ${
                parseInt(paymentAmount) >= calculateTotal()
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {calculateDifference(paymentAmount)}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-3 bg-slate-800 text-white rounded-lg"
              aria-label="メニューを開く"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <button
              onClick={handleCheckout}
              disabled={
                isLoading ||
                parseInt(paymentAmount) < calculateTotal() ||
                isOffline
              } // 修正
              className={`flex-1 p-3 ${
                isLoading ||
                parseInt(paymentAmount) < calculateTotal() ||
                isOffline
                  ? "bg-slate-700"
                  : "bg-blue-600"
              } text-white rounded-lg`}
            >
              {isLoading
                ? "処理中..."
                : isOffline
                ? "オフライン中"
                : "会計する"}
            </button>
          </div>

          <div className="mt-2 text-right text-sm text-slate-300">
            本日の売上: ¥{todaySales.toLocaleString()}
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
                <h2 className="text-lg font-semibold text-slate-800">
                  メニュー
                </h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  aria-label="メニューを閉じる"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 p-4">
                <div className="space-y-2">
                  {[
                    { label: "POS", path: "/" },
                    { label: "分析", path: "/dashboard" },
                    { label: "設定", path: "/settings/event" },
                  ].map((item) => (
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

      <SizeModal
        showSizeModal={showSizeModal}
        selectedProduct={selectedProduct}
        handleSizeSelect={handleSizeSelect}
        setShowSizeModal={setShowSizeModal}
        setSelectedProduct={setSelectedProduct}
      />
    </div>
  );
}
