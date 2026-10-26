const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

let server;
let baseUrl;

before(async () => {
  // Start server on an ephemeral free port for testing
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    server.close();
  }
});

describe('E. Live HTTP Server Integration Tests', () => {

  test('1. GET / returns 200 OK and lists all system endpoints', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'SmartLib Backend API is running');
    assert.ok(data.endpoints.health);
    assert.ok(data.endpoints.auth);
    assert.ok(data.endpoints.exams);
    assert.ok(data.endpoints.users);
    assert.ok(data.endpoints.resources);
    assert.ok(data.endpoints.reservations);
  });

  test('2. GET /api/health returns 200 OK and reports system status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.uptime);
    assert.ok(data.database);
  });

  test('3. requireDB middleware protects /api/auth when DB is disconnected', async () => {
    // When MongoDB Atlas IP is not yet whitelisted, requireDB returns 503
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@university.edu', password: 'Password123!' })
    });

    if (require('mongoose').connection.readyState !== 1) {
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Database connection is currently unavailable/i);
    } else {
      // If DB is connected, verify normal login response
      assert.ok([200, 401].includes(res.status));
    }
  });

  test('4. Unknown route returns 404 with centralized error handler', async () => {
    const res = await fetch(`${baseUrl}/api/unknown-endpoint-xyz`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /Not Found/i);
  });

  test('5. GET /api/auth/me rejects unauthenticated request with HTTP 401 (or 503 when DB is offline)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    if (require('mongoose').connection.readyState !== 1) {
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.match(data.message, /Database connection is currently unavailable/i);
    } else {
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.message, /authentication required/i);
    }
  });

  test('6. GET /api/resources returns 200 OK with resource catalog', async () => {
    const res = await fetch(`${baseUrl}/api/resources`);
    if (require('mongoose').connection.readyState !== 1) {
      assert.equal(res.status, 503);
    } else {
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
    }
  });

  test('7. GET /api/reservations returns 200 OK with reservations array', async () => {
    const res = await fetch(`${baseUrl}/api/reservations`);
    if (require('mongoose').connection.readyState !== 1) {
      assert.equal(res.status, 503);
    } else {
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
    }
  });
});

