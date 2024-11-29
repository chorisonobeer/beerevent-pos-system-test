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

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).json(testProducts);
}