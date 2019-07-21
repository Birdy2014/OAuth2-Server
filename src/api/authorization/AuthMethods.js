const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();
const { generateToken, respond } = require("../utils");

async function post(req, res) {
    if (!req.client || req.client.origin !== "redirect_uri" || req.user.origin !== "basic") {
        respond(res, 400, undefined, "Invalid arguments");
        return;
    }

    try {
        let authorization_code = await createAuthorizationCode(req.body.client_id, req.user.user_id);
        respond(res, 201, { authorization_code: authorization_code });
    } catch (e) {
        respond(res, e.status, undefined, e.error);
    }
}

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

module.exports = { post: post };