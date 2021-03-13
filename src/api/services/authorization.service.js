const crypto = require('crypto');
const { currentUnixTime } = require("../utils");

// TODO: 2FA
/**
 *
 * @param {string} key
 * @param {string} counter
 * @returns {number}
 */
function hotp(key, counter) {
    let hmac = crypto.createHmac("sha1", key).update(counter).digest("hex");
    let offset = parseInt(hmac.substr(-1), 16);
    return hmac.substr(offset, 6);
}

/**
 * Generates a Time-based One-time Password
 * @param {string} key
 * @returns {number}
 */
exports.totp = (key) => {
    let counter = Math.floor(currentUnixTime() / 30).toString();
    return hotp(key, counter);
}

