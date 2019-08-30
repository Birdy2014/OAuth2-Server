const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();
const { generateToken, respond, handleError } = require("../utils");

async function post(req, res) {
    try {
        if (!req.client || req.client.origin !== "redirect_uri" || req.user.origin !== "basic")
            throw { status: 400, error: "Invalid arguments" };

        let authorization_code = await createAuthorizationCode(req.body.client_id, req.user.user_id);
        respond(res, 201, { authorization_code: authorization_code });
    } catch (e) {
        handleError(res, e);
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