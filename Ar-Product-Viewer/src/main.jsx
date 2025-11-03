// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// --- UNCOMMENT THIS CODE ---
import eruda from 'eruda'
if (process.env.NODE_ENV === 'development') {
  eruda.init()
}
// --- End of code ---

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);