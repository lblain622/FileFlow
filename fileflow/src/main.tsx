import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { applyTheme, getStoredTheme } from "./features/settings/theme";

applyTheme(getStoredTheme());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
