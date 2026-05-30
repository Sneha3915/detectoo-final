import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Detector from "./pages/Detector";
import About from "./pages/About";

import "./styles/main.css";

export default function App() {

  return (

    <BrowserRouter>

      <div className="app">

        <Navbar />

        <Routes>

          <Route path="/" element={<Home />} />

          <Route
            path="/detector"
            element={<Detector />}
          />

          <Route
            path="/about"
            element={<About />}
          />

        </Routes>

      </div>

    </BrowserRouter>
  );
}