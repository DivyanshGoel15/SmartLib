/* =========================================================
   SMARTLIB - API CONFIGURATION
   ========================================================= */

(function () {
    // Priority order:
    // 1. window.SMARTLIB_API_URL (set dynamically or via script injection)
    // 2. localStorage item "SMARTLIB_API_URL"
    // Live Cloud Backend on Render
    const RENDER_API_URL = "https://smartlib-sjya.onrender.com/api";
    const LOCAL_API_URL = "http://localhost:5000/api";

    // Use local backend if explicitly running locally on port 5000 or via ?dev=local query
    const isExplicitLocalDev = (typeof window !== "undefined" && window.location &&
        (window.location.port === "5000" || (window.location.search && window.location.search.includes("dev=local"))));

    const defaultApiUrl = isExplicitLocalDev ? LOCAL_API_URL : RENDER_API_URL;

    const getBaseUrl = function () {
        if (typeof window !== "undefined" && window.SMARTLIB_API_URL) {
            return window.SMARTLIB_API_URL;
        }
        try {
            const stored = localStorage.getItem("SMARTLIB_API_URL");
            if (stored) {
                if (stored.includes("localhost:5000") && !isExplicitLocalDev) {
                    localStorage.removeItem("SMARTLIB_API_URL");
                    return defaultApiUrl;
                }
                return stored;
            }
        } catch (e) {}
        return defaultApiUrl;
    };

    window.SMARTLIB_CONFIG = {
        API_BASE_URL: getBaseUrl(),
        getBaseUrl: getBaseUrl,
        setApiUrl: function (url) {
            if (url && typeof url === "string") {
                const cleaned = url.replace(/\/+$/, "");
                localStorage.setItem("SMARTLIB_API_URL", cleaned);
                this.API_BASE_URL = cleaned;
                console.log("[SmartLib Config] Backend API URL updated to:", cleaned);
            }
        },
        resetApiUrl: function () {
            localStorage.removeItem("SMARTLIB_API_URL");
            this.API_BASE_URL = defaultApiUrl;
            console.log("[SmartLib Config] Backend API URL reset to default:", defaultApiUrl);
        }
    };
})();
