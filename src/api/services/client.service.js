const db = require("../../db");

/**
 * 
 * @param {string} client_id 
 * @returns {Promise<(string|string|string|string)>} - client_id, client_secret, name, dev_id
 */
async function getClientFromClientId(client_id) {
    let result = (await db.query(`SELECT client_id, client_secret, name, dev_id`))[0];
    return result;
}

/**
 * 
 * @param {string} client_id 
 * @param {string} client_secret 
 * @returns {Promise<boolean>}
 */
async function checkClientCredentials(client_id, client_secret) {
    let client = getClientFromClientId(client_id);
    return client.client_secret === client_secret;
}

module.exports = { getClientFromClientId, checkClientCredentials };