export default function Migrate() {
    const handleMigrate = async () => {
      try {
        const response = await fetch('/api/migrate-transactions', {
          method: 'POST'
        });
        const data = await response.json();
        alert(data.message || 'Migration completed');
      } catch (error) {
        alert('Migration failed: ' + error.message);
      }
    };
  
    return (
      <div className="max-w-sm mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">データ移行ツール</h1>
        <button
          onClick={handleMigrate}
          className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          移行を開始
        </button>
      </div>
    );
  }