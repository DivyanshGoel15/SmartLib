/* =========================================================
   SMARTLIB - SHARED API CONFIGURATION
   ========================================================= */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        // Node.js / Test environment
        module.exports = factory();
    } else {
        // Browser environment
        root.SMARTLIB_CONFIG = factory(root);
    }
}(typeof self !== "undefined" ? self : this, function (root) {
    var PROD_API_URL = "https://smartlib-sjya.onrender.com/api";
    var LOCAL_API_URL = "http://localhost:5000/api";

    /**
     * Determines whether the current frontend execution context is local
     * (localhost, 127.0.0.1, or IPv6 loopback).
     * @param {Object} [loc] Optional custom location object for testability.
     * @returns {boolean}
     */
    function isLocalEnvironment(loc) {
        var targetLoc = loc || (typeof window !== "undefined" && window.location ? window.location : null);
        if (!targetLoc || !targetLoc.hostname) return false;
        var host = targetLoc.hostname.toLowerCase();
        return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    }

    /**
     * Resolves the appropriate backend API base URL based on host environment.
     * Priority:
     *   1. Explicit runtime override (window.SMARTLIB_API_URL or options.runtimeUrl)
     *   2. localStorage "SMARTLIB_API_URL" (purged if stale localhost in production)
     *   3. Environment-aware default (localhost → LOCAL_API_URL; production → PROD_API_URL)
     *
     * @param {Object} [options] Optional overrides for testing / dependency injection.
     * @param {Object} [options.location]   Custom location object with hostname property.
     * @param {Object} [options.storage]    Custom storage object with getItem/removeItem.
     * @param {string} [options.runtimeUrl] Explicit runtime URL override.
     * @returns {string} Cleaned API base URL without trailing slash.
     */
    function resolveApiBaseUrl(options) {
        options = options || {};
        var loc = options.location || (typeof window !== "undefined" && window.location ? window.location : null);
        var storage = options.storage || (typeof window !== "undefined" && window.localStorage ? window.localStorage : null);
        var runtimeUrl = options.runtimeUrl || (typeof window !== "undefined" ? window.SMARTLIB_API_URL : undefined);

        // 1. Explicit runtime override on window takes highest priority
        if (runtimeUrl && typeof runtimeUrl === "string") {
            return runtimeUrl.replace(/\/+$/, "");
        }

        var isLocal = isLocalEnvironment(loc);
        var defaultUrl = isLocal ? LOCAL_API_URL : PROD_API_URL;

        // 2. LocalStorage override (if explicitly saved)
        if (storage) {
            try {
                var stored = storage.getItem("SMARTLIB_API_URL");
                if (stored && typeof stored === "string") {
                    // Safety: in production, purge any stale localhost references
                    if (!isLocal && (stored.indexOf("localhost") !== -1 || stored.indexOf("127.0.0.1") !== -1)) {
                        storage.removeItem("SMARTLIB_API_URL");
                        return defaultUrl;
                    }
                    return stored.replace(/\/+$/, "");
                }
            } catch (e) {
                // Ignore storage access errors in private browsing / sandboxed contexts
            }
        }

        // 3. Environment-aware default
        return defaultUrl;
    }

    var currentUrl = resolveApiBaseUrl();

    var config = {
        PROD_API_URL: PROD_API_URL,
        LOCAL_API_URL: LOCAL_API_URL,
        API_BASE_URL: currentUrl,
        isLocalEnvironment: isLocalEnvironment,
        resolveApiBaseUrl: resolveApiBaseUrl,
        getBaseUrl: function (options) {
            return resolveApiBaseUrl(options);
        },
        setApiUrl: function (url) {
            if (url && typeof url === "string") {
                var cleaned = url.replace(/\/+$/, "");
                try {
                    if (typeof localStorage !== "undefined") {
                        localStorage.setItem("SMARTLIB_API_URL", cleaned);
                    }
                } catch (e) {}
                this.API_BASE_URL = cleaned;
                console.log("[SmartLib Config] Backend API URL updated to:", cleaned);
            }
        },
        resetApiUrl: function () {
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.removeItem("SMARTLIB_API_URL");
                }
            } catch (e) {}
            var defUrl = isLocalEnvironment() ? LOCAL_API_URL : PROD_API_URL;
            this.API_BASE_URL = defUrl;
            console.log("[SmartLib Config] Backend API URL reset to default:", defUrl);
            return defUrl;
        }
    };

    return config;
}));
