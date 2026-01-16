
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Thiết lập process.env giả lập. API_KEY sẽ được hệ thống nạp tự động.
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Không tìm thấy phần tử root để gắn ứng dụng");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
