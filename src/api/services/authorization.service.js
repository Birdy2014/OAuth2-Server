const crypto = require('crypto');
const { currentUnixTime } = require("../utils");
const { Database } = require("../../db/db");

/**
 * Get the user_id and client_id from an authorization_code
 * @param {string} authorization_code
 * @returns {Promise<{user_id: string, client_id: string}>}
 */
exports.getUserAndClientFromAuthorizationCode = async (code) => {
    let result = await Database.query(`SELECT user_id, client_id FROM authorization_code WHERE authorization_code = '${code}'`);
    return result[0] || {};
}

/**
 * Check challenge
 * @param {string} code
 * @param {string} code_verifier
 * @returns {Promise<boolean>}
 */
exports.checkPKCE = async (code, code_verifier) => {
    let challenge = (await Database.query(`SELECT challenge FROM authorization_code WHERE authorization_code = '${code}'`))[0].challenge;
    let hash = crypto.createHash("sha256").update(code_verifier).digest("base64").replace(/\+/g, "_");
    return hash === challenge;
}

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

