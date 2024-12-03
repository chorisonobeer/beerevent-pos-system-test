export async function fetchWithSpreadsheetId(url, options = {}) {
    const spreadsheetId = localStorage.getItem('currentSpreadsheetId');
    
    const newOptions = {
      ...options,
      headers: {
        ...options.headers,
        'X-Spreadsheet-ID': spreadsheetId,
      },
    };
  
    return fetch(url, newOptions);
  }