import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";  // ✅ Change this - import App instead of RentifyPro
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />  {/* ✅ Change this - render App instead of RentifyPro */}
  </React.StrictMode>
);