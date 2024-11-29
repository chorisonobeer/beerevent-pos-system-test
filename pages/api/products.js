export default function handler(req, res) {
  const testProducts = [
    {
      id: 1,
      name: 'IPA',
      prices: { S: 700, M: 850, L: 1000 }
    },
    {
      id: 2,
      name: 'Stout',
      prices: { S: 700, M: 850, L: 1000 }
    },
    {
      id: 3,
      name: 'ラグニタス',
      prices: { S: 700, M: 850, L: 1000 }
    }
  ];

  // CORSヘッダーとキャッシュ制御を設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  // 単純に固定データを返す
  res.status(200).json(testProducts);
}