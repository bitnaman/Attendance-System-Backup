import React from "react";
import ReactDOM from "react-dom/client";
// Base styles (tables, legacy components)
import "./index.css";
// Ensure the main application styles are always applied
import "./App.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
