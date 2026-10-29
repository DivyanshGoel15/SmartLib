const resolveCorsOptions = (env = process.env) => {
  const origins = (env.CLIENT_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV === 'production') {
    if (!origins.length || origins.includes('*')) {
      throw new Error('CLIENT_ORIGIN must list explicit trusted origins in production.');
    }

    for (const origin of origins) {
      let parsedOrigin;
      try {
        parsedOrigin = new URL(origin);
      } catch (error) {
        throw new Error('CLIENT_ORIGIN must contain valid HTTP or HTTPS origins.');
      }
      if (!['http:', 'https:'].includes(parsedOrigin.protocol) ||
          parsedOrigin.origin !== origin) {
        throw new Error('CLIENT_ORIGIN must contain valid HTTP or HTTPS origins.');
      }
    }
  }

  return {
    origin: !origins.length || origins.includes('*') ? true : origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    credentials: true
  };
};

module.exports = { resolveCorsOptions };
