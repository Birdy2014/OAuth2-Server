const db = require("../../db");

/**
 * Get the user_id and client_id from a refresh_token
 * @param {string} refresh_token 
 * @returns {Promise<{string|string}>}
 */
async function getUserAndClientFromRefreshToken(refresh_token) {
    let result = await db.query(`SELECT user_id, client_id FROM refresh_token WHERE refresh_token = '${refresh_token}'`);
    return result[0] || {};
}

module.exports = { getUserAndClientFromRefreshToken };