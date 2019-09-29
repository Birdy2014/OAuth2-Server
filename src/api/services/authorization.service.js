const { generateToken, currentUnixTime } = require("../utils");
const db = require("../../db");
const configReader = require("../../configReader");

/**
 * Create an authorization code for user
 * @param {number} client_id 
 * @param {string} user_id
 * @returns {Promise<string>} authorization_code
 */
async function createAuthorizationCode(client_id, user_id) {
    let authorization_code = generateToken(30);
    await db.query(`INSERT INTO authorization_code (authorization_code, user_id, client_id, expires) VALUES ('${authorization_code}', '${user_id}', '${client_id}', '${currentUnixTime() + configReader.config.authorizationCodeExpirationTime}')`);
    return authorization_code;
}

module.exports = { createAuthorizationCode };