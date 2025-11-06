// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ProductProvider from "./contexts/ProductContext.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Bungkus seluruh App dengan ProductProvider */}
    <ProductProvider>
      <App />
    </ProductProvider>
  </React.StrictMode>
);
