import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import './index.css';
import App from './App';
import ScrollToTop from './components/ScrollToTop';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

//The AuthProvider component here is passed automatically as children prop to the authProvider in AuthContext
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
