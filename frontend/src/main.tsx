
import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles/index.css";
import "./i18n/config";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js")
			.then((registration) => {
				// Force an update check on each page load so clients move off stale SW versions faster.
				registration.update();

				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					if (!newWorker) return;
					newWorker.addEventListener("statechange", () => {
						if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
							newWorker.postMessage({ type: "SKIP_WAITING" });
						}
					});
				});
			})
			.catch((error) => {
				console.error("Service worker registration failed:", error);
			});

		navigator.serviceWorker.addEventListener("controllerchange", () => {
			window.location.reload();
		});
	});
}

createRoot(document.getElementById("root")!).render(
	<AccessibilityProvider>
		<App />
	</AccessibilityProvider>
);
