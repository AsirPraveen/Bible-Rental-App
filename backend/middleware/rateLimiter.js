const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for credential-handling endpoints (login, register, OTP,
 * Google sign-in). These are the endpoints worth brute-forcing, so they get
 * the tightest budget.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per 15 minutes
  message: {
    status: 'error',
    data: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Looser limiter for authenticated session traffic (/userdata, push tokens).
 * These are called on every app launch and org switch, and several users often
 * share one egress IP, so the strict budget would lock out real people.
 */
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    status: 'error',
    data: 'Too many requests from this IP. Please try again shortly.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, sessionLimiter };
