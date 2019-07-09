const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();
const { generateToken, respond, requireValues } = require("../utils");
const { validateUser } = require("../user/UserMethods");

async function post(req, res) {
    if (!requireValues(res, req.body.client_id, req.body.password, req.body.login, req.body.redirect_uri)) return;

    try {
        let authorization_code = await createAuthorizationCode(req.body.client_id, req.body.login, req.body.password, req.body.redirect_uri);
        respond(res, 201, { authorization_code: authorization_code });
    } catch (e) {
        respond(res, e.status, undefined, e.error);
    }
}

/**
 * Create an authorization code for user
 * @param {number} client_id 
 * @param {string} login - email or username or user_id
 * @param {string} password 
 * @returns {string} authorization_code
 */
async function createAuthorizationCode(client_id, login, password, redirect_uri) {
    let user_id = await validateUser(login, password);
    if (!user_id) throw {status: 403, error: "Invalid User credentials"};

    try {
        let isRedirectUriAllowed = await dbInterface.validateClient(client_id, undefined, redirect_uri);
        if (!isRedirectUriAllowed) throw {status: 403, error: "Invalid Client credentials"};
        let isEmailVerified = (await dbInterface.query(`SELECT verified FROM user WHERE user_id = '${user_id}'`))[0].verified;
        if (!isEmailVerified && client_id !== await dbInterface.getDashboardId()) throw {status: 403, error: "Email Address not verified"};
    } catch (e) {
        if (typeof e.status === "number")
            throw e;
        console.log(e);
        throw {status: 500, error: "Internal Server Error"};
    }

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