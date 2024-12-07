function fetchWithSpreadsheetId(url, options = {}) {
  const spreadsheetId = localStorage?.getItem('currentSpreadsheetId');

  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is not set');
  }

  const newOptions = {
    ...options,
    headers: {
      ...options.headers,
      'X-Spreadsheet-ID': spreadsheetId,
      'Content-Type': 'application/json',
    },
  };

  return fetch(url, newOptions);
}

function hasSpreadsheetId() {
  if (typeof window === 'undefined') return false;
  return !!localStorage?.getItem('currentSpreadsheetId');
}

function getCurrentSpreadsheetId() {
  if (typeof window === 'undefined') return null;
  return localStorage?.getItem('currentSpreadsheetId');
}

function getSpreadsheetHistory() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage?.getItem('spreadsheetHistory') || '[]');
  } catch {
    return [];
  }
}

function addToSpreadsheetHistory(id) {
  if (typeof window === 'undefined') return;
  const history = getSpreadsheetHistory();
  if (!history.includes(id)) {
    const newHistory = [...history, id];
    localStorage?.setItem('spreadsheetHistory', JSON.stringify(newHistory));
  }
}

export {
  fetchWithSpreadsheetId,
  hasSpreadsheetId,
  getCurrentSpreadsheetId,
  getSpreadsheetHistory,
  addToSpreadsheetHistory
};