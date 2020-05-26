const crypto = require('crypto');
const { generateToken, currentUnixTime } = require("../utils");
const db = require("../../db");
const configReader = require("../../configReader");

/**
 * Create an authorization code for user
 * @param {number} client_id 
 * @param {string} user_id
 * @param {string} challenge
 * @returns {Promise<string>} authorization_code
 */
async function createAuthorizationCode(client_id, user_id, challenge) {
    let authorization_code = generateToken(30);
    await db.query(`INSERT INTO authorization_code (authorization_code, user_id, client_id, expires, challenge) VALUES ('${authorization_code}', '${user_id}', '${client_id}', '${currentUnixTime() + configReader.config.authorizationCodeExpirationTime}', '${challenge}')`);
    return authorization_code;
}

/**
 * Get the user_id and client_id from an authorization_code
 * @param {string} authorization_code 
 * @returns {Promise<(string|string)>}
 */
async function getUserAndClientFromAuthorizationCode(code) {
    let result = await db.query(`SELECT user_id, client_id FROM authorization_code WHERE authorization_code = '${code}'`);
    return result[0] || {};
}

/**
 * Check challenge
 * @param {string} code
 * @param {string} code_verifier
 * @returns {Promise<boolean>}
 */
async function checkPKCE(code, code_verifier) {
    let challenge = (await db.query(`SELECT challenge FROM authorization_code WHERE authorization_code = '${code}'`))[0].challenge;
    let hash = crypto.createHash("sha256").update(code_verifier).digest("base64").replace(/\+/g, "_");
    return hash === challenge;
}

module.exports = { createAuthorizationCode, getUserAndClientFromAuthorizationCode, checkPKCE };
