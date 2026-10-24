/* =========================================================
   SMARTLIB - API CONFIGURATION
   ========================================================= */

(function () {
    // Priority order:
    // 1. window.SMARTLIB_API_URL (set dynamically or via script injection)
    // 2. localStorage item "SMARTLIB_API_URL"
    // 3. Fallback to local backend on port 5000
    const defaultApiUrl = "http://localhost:5000/api";

    const getBaseUrl = function () {
        return window.SMARTLIB_API_URL ||
            localStorage.getItem("SMARTLIB_API_URL") ||
            defaultApiUrl;
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
