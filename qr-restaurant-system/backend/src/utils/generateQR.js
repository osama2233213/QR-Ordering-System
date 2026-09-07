const QRCode = require('qrcode');

/**
 * Generates a QR Code Data URL pointing to customer ordering URL
 * @param {string} clientBaseUrl - e.g. "http://localhost:5173"
 * @param {string} restaurantId 
 * @param {string} tableId 
 */
const generateTableQR = async (clientBaseUrl, restaurantId, tableId) => {
  const targetUrl = `${clientBaseUrl}/r/${restaurantId}/t/${tableId}`;
  return await QRCode.toDataURL(targetUrl);
};

module.exports = { generateTableQR };
