const crypto = require('crypto');

/**
 * Generates a cryptographically secure random session token.
 * @returns {string} 64-character hexadecimal token string
 */
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  generateSessionToken,
};
