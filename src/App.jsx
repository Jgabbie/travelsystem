import logo from './logo.svg';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './App.css';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
