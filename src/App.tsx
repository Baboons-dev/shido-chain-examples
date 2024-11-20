import React from "react";
import logo from "./logo.svg";
import "./App.css";
import Header from "./components/Header";
import { Route, BrowserRouter as Router } from "react-router-dom";
import { Routes } from "react-router-dom";
import PoolPage from "./pages/Pool";

function App() {
  return (
    <div className="App">
      <Header />
      <Router>
        <Routes>
          <Route path="/pool/" element={<PoolPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
