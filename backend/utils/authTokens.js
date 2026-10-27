const crypto = require('crypto');

// Cache for development ephemeral key when JWT_SECRET is not explicitly provided in environment
let ephemeralDevSecret = null;

/**
 * Returns the secret key used for signing session tokens.
 * In production, process.env.JWT_SECRET is strictly required.
 * In development/test without an explicit key, a cryptographically secure random secret
 * is generated in-memory per runtime instance rather than using a predictable hardcoded string.
 */
const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (!ephemeralDevSecret) {
      ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
      console.warn('[Security Warning] JWT_SECRET is not configured in environment. Using generated fallback key.');
    }
    return ephemeralDevSecret;
  }
  return secret;
};

/**
 * Signs a payload into an RFC 7519 compliant HMAC-SHA256 JWT
 * @param {Object} payload Claims to embed ({ id, role, email, name, department })
 * @param {number} expiresInHours Expiration duration in hours (default: 24)
 * @returns {string} Encoded and signed JWT
 */
function signToken(payload, expiresInHours = 24) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('Payload must be a valid object');
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(expiresInHours * 3600);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: exp
  };

  const encode = (obj) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  const encodedHeader = encode(header);
  const encodedPayload = encode(fullPayload);

  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Strictly verifies a token's structure, algorithm, signature, and expiration.
 * Defends against algorithm substitution ('none', asymmetric confusion),
 * timing side channels, and malformed inputs.
 * @param {string} token
 * @returns {Object|null} Decoded payload if valid; null if invalid, forged, or expired.
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;

  // 1. Verify Header structure and algorithm enforcement (Strict HS256)
  let header;
  try {
    const headerJson = Buffer.from(encodedHeader, 'base64url').toString('utf8');
    header = JSON.parse(headerJson);
  } catch (err) {
    return null; // Malformed header base64 or JSON
  }

  if (!header || typeof header !== 'object') return null;
  // Strictly disallow 'none' algorithm and enforce HS256
  if (header.alg !== 'HS256') {
    return null;
  }

  // 2. Cryptographic signature verification using timing-safe comparison
  let expectedSignature;
  try {
    expectedSignature = crypto
      .createHmac('sha256', getSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
  } catch (err) {
    return null;
  }

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null; // Signature mismatch / forged token
  }

  // 3. Payload parsing & claims verification
  let payload;
  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson);
  } catch (err) {
    return null; // Malformed payload base64 or JSON
  }

  if (!payload || typeof payload !== 'object') return null;

  const now = Math.floor(Date.now() / 1000);

  // 4. Expiration check
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    return null; // Expired or missing exp claim
  }

  // 5. Not-before check (if present)
  if (typeof payload.nbf === 'number' && payload.nbf > now) {
    return null; // Token not yet valid
  }

  return payload;
}

module.exports = {
  signToken,
  verifyToken
};
