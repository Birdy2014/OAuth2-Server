const { generateToken } = require("../utils");
const dbInterface = new (require("../../DBInterface"))();

/**
 * Create an authorization code for user
 * @param {number} client_id 
 * @param {string} user_id
 * @returns {Promise<string>} authorization_code
 */
async function createAuthorizationCode(client_id, user_id) {
    let authorization_code;
    let error = true;
    while (error) {
        try {
            authorization_code = generateToken(30);
            await dbInterface.query(`INSERT INTO authorization_code (authorization_code, user_id, client_id) VALUES ('${authorization_code}', '${user_id}', '${client_id}')`);
            error = false;
        } catch (e) {
            continue;
        }
    }

    return authorization_code;
}

module.exports = { createAuthorizationCode };