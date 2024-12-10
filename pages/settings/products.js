import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import SettingsTabs from "../../components/SettingsTabs";
import { fetchWithSpreadsheetId, hasSpreadsheetId } from "../../utils/api";
import { useError } from "../../contexts/ErrorContext";
import dynamic from "next/dynamic";

function ProductSettings() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { setError } = useError();

  // 追加する関数
  const handleAddProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        name: "",
        prices: { S: 0, M: 0, L: 0 },
        lotVolume: 0,
        lotCost: 0,
        sizeVolumes: { S: 0, M: 0, L: 0 },
        costPerSize: { S: 0, M: 0, L: 0 },
      },
    ]);
  };

  const handleRemoveProduct = (index) => {
    if (confirm("この商品を削除してもよろしいですか？")) {
      setProducts((prev) => prev.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    if (!hasSpreadsheetId()) {
      setIsLoading(false);
      return;
    }

    // ここでデータを取得する前にloadingを表示
    setIsLoading(true);
    fetchProducts();
  }, []);

  // サイズ別原価を計算する関数
  const calculateCostPerSize = (product) => {
    try {
      const lotVolume = Number(product.lotVolume) || 0;
      const lotCost = Number(product.lotCost) || 0;

      if (lotVolume < 0 || lotCost < 0) {
        throw new Error("容量と原価は0以上の数値である必要があります");
      }

      // ロットあたりの単価を計算（ml単価）
      const costPerMl = lotVolume > 0 ? lotCost / lotVolume : 0;

      return {
        S: Number(
          (costPerMl * (Number(product.sizeVolumes?.S) || 0)).toFixed(1)
        ),
        M: Number(
          (costPerMl * (Number(product.sizeVolumes?.M) || 0)).toFixed(1)
        ),
        L: Number(
          (costPerMl * (Number(product.sizeVolumes?.L) || 0)).toFixed(1)
        ),
      };
    } catch (error) {
      console.error("原価計算に失敗:", error);
      setError("原価計算に失敗しました。入力値を確認してください。");
      return { S: 0, M: 0, L: 0 };
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetchWithSpreadsheetId("/api/products-settings");
      if (!response.ok) {
        throw new Error("商品データの取得に失敗しました");
      }
      const data = await response.json();

      // 必ずデータが配列であることを確認
      const safeProducts = Array.isArray(data) ? data : [];
      setProducts(safeProducts);
    } catch (error) {
      console.error("商品データの取得に失敗:", error);
      setError("商品データの取得に失敗しました: " + error.message);
      // エラー時は空配列をセット
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const productsWithCalculatedCosts = products.map((product) => {
        if (!product.name) {
          throw new Error("商品名は必須です");
        }
        return {
          ...product,
          costPerSize: calculateCostPerSize(product),
        };
      });

      const response = await fetchWithSpreadsheetId("/api/products-settings", {
        method: "POST",
        body: JSON.stringify(productsWithCalculatedCosts),
      });

      if (!response.ok) {
        throw new Error("商品データの保存に失敗しました");
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error("商品データの保存に失敗:", error);
      setError(
        error.message || "商品データの保存に失敗しました。再度お試しください。"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductChange = (index, field, value) => {
    setProducts((prevProducts) => {
      const newProducts = [...prevProducts];

      if (field.includes(".")) {
        const [mainField, subField] = field.split(".");
        newProducts[index] = {
          ...newProducts[index],
          [mainField]: {
            ...newProducts[index][mainField],
            [subField]: value,
          },
        };
      } else {
        newProducts[index] = {
          ...newProducts[index],
          [field]: value,
        };
      }

      // 原価の自動計算
      const updatedProduct = newProducts[index];
      const newCostPerSize = calculateCostPerSize(updatedProduct);

      newProducts[index] = {
        ...updatedProduct,
        costPerSize: newCostPerSize,
      };

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
            onClick={() => router.push("/settings/event")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg 
              hover:bg-blue-600 transition-colors duration-200"
          >
            設定画面へ
          </button>
        </div>
      </div>
    );
  }

  // ローディング状態の表示
  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">データを読み込み中...</div>
      </div>
    );
  }

  // 商品データがない場合の表示
  if (!Array.isArray(products) || products.length === 0) {
    return (
      <div className="max-w-sm mx-auto p-4 min-h-screen bg-slate-50">
        <div className="text-center py-8">商品データがありません</div>
      </div>
    );
  }

  // メインのレンダリング

  return (
    <div className="max-w-sm mx-auto bg-slate-50 min-h-screen flex flex-col">
      <SettingsTabs currentPath="/settings/products" />

      <div className="flex-grow p-4 pt-16 pb-16">
        <form onSubmit={handleSubmit}>
          {/* 商品追加ボタン */}
          <button
            type="button"
            onClick={handleAddProduct}
            className="w-full mb-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            商品を追加
          </button>

          {products.map((product, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-4 mb-4 relative"
            >
              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => handleRemoveProduct(index)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-600"
              >
                <svg
                  className="w-5 h-5"
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  商品名
                </label>
                <input
                  type="text"
                  value={product.name || ""}
                  onChange={(e) =>
                    handleProductChange(index, "name", e.target.value)
                  }
                  className="w-full p-2 border border-slate-200 rounded-md"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  販売価格設定
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      S価格
                    </label>
                    <input
                      type="number"
                      value={product.prices?.S || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "prices.S",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      M価格
                    </label>
                    <input
                      type="number"
                      value={product.prices?.M || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "prices.M",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      L価格
                    </label>
                    <input
                      type="number"
                      value={product.prices?.L || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "prices.L",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      1ロットの容量 (ml)
                    </label>
                    <input
                      type="number"
                      value={product.lotVolume || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "lotVolume",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      ロット数
                    </label>
                    <input
                      type="number"
                      value={product.totalLots || 0}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "totalLots",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      1ロットの原価 (円)
                    </label>
                    <input
                      type="number"
                      value={product.lotCost || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "lotCost",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  サイズ別容量 (ml)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Sサイズ
                    </label>
                    <input
                      type="number"
                      value={product.sizeVolumes?.S || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "sizeVolumes.S",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Mサイズ
                    </label>
                    <input
                      type="number"
                      value={product.sizeVolumes?.M || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "sizeVolumes.M",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Lサイズ
                    </label>
                    <input
                      type="number"
                      value={product.sizeVolumes?.L || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "sizeVolumes.L",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* 原価計算の表示部分の後に以下を追加 */}
              <div className="bg-slate-200 p-4 rounded-md">
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  在庫管理
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      現在樽数
                    </label>
                    <input
                      type="number"
                      value={product.totalLots || 0}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "totalLots",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      残量 (ml)
                    </label>
                    <input
                      type="number"
                      value={product.remainingVolume || 0}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "remainingVolume",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      総使用量 (ml)
                    </label>
                    <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                      {(product.totalUsedVolume || 0).toLocaleString()}
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
              isSaving ? "bg-slate-400" : "bg-blue-500 hover:bg-blue-600"
            } text-white rounded-md shadow-md transition-colors duration-200`}
          >
            {isSaving ? "保存中..." : "設定を保存"}
          </button>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-sm mx-auto flex">
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            POS
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            分析
          </button>
          <button
            onClick={() => router.push("/settings/event")}
            className="flex-1 py-3 text-sm font-medium bg-slate-800 text-white"
          >
            設定
          </button>
        </div>
      </div>
      {/* 保存成功モーダル */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <div className="text-center mb-4">商品データを保存しました</div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/"); // POSページへ遷移
              }}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
          transition-colors duration-200"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ファイルの末尾に追加
export default dynamic(() => Promise.resolve(ProductSettings), {
  ssr: false,
});
