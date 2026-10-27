/**
 * SmartLib - API URL Selection Unit Tests
 *
 * Validates that the shared config module (js/config.js) correctly resolves
 * the backend API base URL based on the current host environment:
 *
 *   - localhost / 127.0.0.1  →  http://localhost:5000/api
 *   - Any production domain   →  https://smartlib-sjya.onrender.com/api
 *
 * Run:  node --test test/apiUrlSelection.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// The UMD config module exports its config object in Node.js
const config = require('../../js/config.js');

// ---------------------------------------------------------------------------
// Helpers – tiny localStorage mock
// ---------------------------------------------------------------------------
function createMockStorage(initial = {}) {
    const store = { ...initial };
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
        setItem(key, val) { store[key] = String(val); },
        removeItem(key) { delete store[key]; },
        _dump() { return { ...store }; }
    };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('F. API URL Selection (js/config.js)', () => {

    // ----- isLocalEnvironment ------------------------------------------------

    test('1. isLocalEnvironment returns true for hostname "localhost"', () => {
        assert.strictEqual(
            config.isLocalEnvironment({ hostname: 'localhost' }),
            true
        );
    });

    test('2. isLocalEnvironment returns true for hostname "127.0.0.1"', () => {
        assert.strictEqual(
            config.isLocalEnvironment({ hostname: '127.0.0.1' }),
            true
        );
    });

    test('3. isLocalEnvironment returns true for IPv6 loopback "[::1]"', () => {
        assert.strictEqual(
            config.isLocalEnvironment({ hostname: '[::1]' }),
            true
        );
    });

    test('4. isLocalEnvironment returns false for Render frontend hostname', () => {
        assert.strictEqual(
            config.isLocalEnvironment({ hostname: 'smartlib-frontend-nhu7.onrender.com' }),
            false
        );
    });

    test('5. isLocalEnvironment returns false for any arbitrary production domain', () => {
        assert.strictEqual(
            config.isLocalEnvironment({ hostname: 'example.com' }),
            false
        );
    });

    test('6. isLocalEnvironment returns false when no location is provided', () => {
        assert.strictEqual(config.isLocalEnvironment(null), false);
        assert.strictEqual(config.isLocalEnvironment(undefined), false);
        assert.strictEqual(config.isLocalEnvironment({}), false);
    });

    // ----- resolveApiBaseUrl – default selection ------------------------------

    test('7. resolveApiBaseUrl selects LOCAL_API_URL when hostname is "localhost"', () => {
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'localhost' },
            storage: createMockStorage()
        });
        assert.strictEqual(url, config.LOCAL_API_URL);
    });

    test('8. resolveApiBaseUrl selects LOCAL_API_URL when hostname is "127.0.0.1"', () => {
        const url = config.resolveApiBaseUrl({
            location: { hostname: '127.0.0.1' },
            storage: createMockStorage()
        });
        assert.strictEqual(url, config.LOCAL_API_URL);
    });

    test('9. resolveApiBaseUrl selects PROD_API_URL for Render frontend hostname', () => {
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'smartlib-frontend-nhu7.onrender.com' },
            storage: createMockStorage()
        });
        assert.strictEqual(url, config.PROD_API_URL);
    });

    test('10. resolveApiBaseUrl selects PROD_API_URL for any non-localhost domain', () => {
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'my-university.edu' },
            storage: createMockStorage()
        });
        assert.strictEqual(url, config.PROD_API_URL);
    });

    // ----- Stale localStorage cleanup ----------------------------------------

    test('11. In production, stale "localhost:5000" in localStorage is purged and PROD URL returned', () => {
        const storage = createMockStorage({
            SMARTLIB_API_URL: 'http://localhost:5000/api'
        });
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'smartlib-frontend-nhu7.onrender.com' },
            storage: storage
        });
        assert.strictEqual(url, config.PROD_API_URL);
        // Verify the stale entry was removed
        assert.strictEqual(storage.getItem('SMARTLIB_API_URL'), null);
    });

    test('12. In production, stale "127.0.0.1" in localStorage is purged and PROD URL returned', () => {
        const storage = createMockStorage({
            SMARTLIB_API_URL: 'http://127.0.0.1:5000/api'
        });
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'example.com' },
            storage: storage
        });
        assert.strictEqual(url, config.PROD_API_URL);
        assert.strictEqual(storage.getItem('SMARTLIB_API_URL'), null);
    });

    test('13. On localhost, a stored "localhost:5000" URL is NOT purged', () => {
        const storage = createMockStorage({
            SMARTLIB_API_URL: 'http://localhost:5000/api'
        });
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'localhost' },
            storage: storage
        });
        assert.strictEqual(url, 'http://localhost:5000/api');
        assert.strictEqual(storage.getItem('SMARTLIB_API_URL'), 'http://localhost:5000/api');
    });

    // ----- Valid localStorage override in production -------------------------

    test('14. In production, a valid non-localhost localStorage URL is used', () => {
        const storage = createMockStorage({
            SMARTLIB_API_URL: 'https://custom-backend.onrender.com/api'
        });
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'smartlib-frontend-nhu7.onrender.com' },
            storage: storage
        });
        assert.strictEqual(url, 'https://custom-backend.onrender.com/api');
    });

    // ----- Runtime override (window.SMARTLIB_API_URL) -------------------------

    test('15. runtimeUrl override takes precedence over everything else', () => {
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'smartlib-frontend-nhu7.onrender.com' },
            storage: createMockStorage({ SMARTLIB_API_URL: 'https://other.com/api' }),
            runtimeUrl: 'https://override-backend.example.com/api'
        });
        assert.strictEqual(url, 'https://override-backend.example.com/api');
    });

    test('16. runtimeUrl trailing slash is stripped', () => {
        const url = config.resolveApiBaseUrl({
            location: { hostname: 'localhost' },
            storage: createMockStorage(),
            runtimeUrl: 'http://localhost:5000/api///'
        });
        assert.strictEqual(url, 'http://localhost:5000/api');
    });

    // ----- Exported constants ------------------------------------------------

    test('17. PROD_API_URL constant is correct', () => {
        assert.strictEqual(config.PROD_API_URL, 'https://smartlib-sjya.onrender.com/api');
    });

    test('18. LOCAL_API_URL constant is correct', () => {
        assert.strictEqual(config.LOCAL_API_URL, 'http://localhost:5000/api');
    });

    // ----- getBaseUrl alias ---------------------------------------------------

    test('19. getBaseUrl delegates to resolveApiBaseUrl', () => {
        const url = config.getBaseUrl({
            location: { hostname: 'localhost' },
            storage: createMockStorage()
        });
        assert.strictEqual(url, config.LOCAL_API_URL);
    });
});
