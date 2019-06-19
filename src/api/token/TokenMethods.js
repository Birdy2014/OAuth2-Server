const { generateToken, currentUnixTime, respond, requireValues } = require("../utils");
const dbInterface = require("../../DBInterface");
const configReader = require("../../ConfigReader");
const { validateClient } = require("../client/ClientMethods");

async function tokenInfo(req, res) {
    if (!requireValues(res, req.body.access_token, req.header("Authorization"))) return;

    //Validate client
    let client_id, client_secret;
    try {
        [client_id, client_secret] = Buffer.from(req.header("Authorization").substring("Basic ".length), "base64").toString().split(":");
        if (!await dbInterface.validateClient(client_id, client_secret)) {
            respond(res, 401);
            return;
        }
    } catch (e) {
        respond(res, 401);
        return;
    }

    //Validate access token
    try {
        let accessTokenInfo = await validateAccessToken(req.body.access_token, client_id);
        let permissionsResult = await dbInterface.query(`SELECT permission FROM permissions WHERE user_id = '${accessTokenInfo.user_id}'`);
        let permissions = [];
        for (let i = 0; i < permissionsResult.length; i++) {
            permissions[i] = permissionsResult[i].permission;
        }
        let tokenInfoResponse;
        if (accessTokenInfo.active)
            tokenInfoResponse = {
                active: accessTokenInfo.active,
                user_id: accessTokenInfo.user_id,
                username: accessTokenInfo.username,
                email: accessTokenInfo.email,
                permissions: permissions
            }
        else
            tokenInfoResponse = {
                active: false
            }

        respond(res, 200, tokenInfoResponse);
    } catch (e) {
        console.log(e);
        respond(res, 500);
    }
}

async function token(req, res) {
    //Validate Client
    let client_id, client_secret;
    try {
        [client_id, client_secret] = Buffer.from(req.header("Authorization").substring("Basic ".length), "base64").toString().split(":");
        if (!dbInterface.validateClient(client_id, client_secret)) {
            respond(res, 401);
            return;
        }
    } catch (e) {
        respond(res, 401);
        return;
    }

    if (req.body.grant_type === "authorization_code") {
        if (req.body.authorization_code === undefined) {
            respond(res, 400);
            return;
        }

        try {
            let response = await validateAuthorizationCode(req.body.authorization_code, client_id);
            respond(res, 201, response);
        } catch (e) {
            console.log("Error: " + e);
            respond(res, e);
        }
    } else if (req.body.grant_type === "refresh_token") {
        if (req.body.refresh_token === undefined) {
            respond(res, 400);
            return;
        }

        try {
            let response = await refreshAccessToken(req.body.refresh_token, client_id);
            respond(res, 201, response);
        } catch (e) {
            respond(res, e);
        }
    } else {
        respond(res, 400);
    }
}

async function revoke(req, res) {
    //Validate Client
    let client_id, client_secret;
    try {
        [client_id, client_secret] = Buffer.from(req.header("Authorization").substring("Basic ".length), "base64").toString().split(":");
        if (!dbInterface.validateClient(client_id, client_secret)) {
            respond(res, 401);
            return;
        }
    } catch (e) {
        respond(res, 401);
        return;
    }

    if (req.body.access_token === undefined && req.body.refresh_token === undefined) {
        respond(res, 400);
        return;
    }

    if (req.body.access_token !== undefined) {
        //revoke access_token
        try {
            await dbInterface.query(`DELETE FROM access_token WHERE access_token = '${req.body.access_token}' AND client_id = '${client_id}'`);
        } catch (e) {
            console.error(`Failed to revoke access token: ${e}`);
            respond(res, 404);
            return;
        }
    }

    if (req.body.refresh_token !== undefined) {
        //revoke refresh_token
        try {
            await dbInterface.query(`DELETE FROM refresh_token WHERE refresh_token = '${req.body.refresh_token}' AND client_id = '${client_id}'`);
        } catch (e) {
            console.error(`Failed to revoke refresh token: ${e}`);
            respond(res, 404);
            return;
        }
    }

    respond(res, 200);
}

/**
 * Use the authorization_code to generate an access_token and refresh_token
 * @param {string} authorization_code 
 * @param {string} client_id 
 * @returns {(string|string|number)} access_token, refresh_token, expires
 */
async function validateAuthorizationCode(authorization_code, client_id) {
    //Check if authorization code exists
    let results = await dbInterface.query(`SELECT user_id FROM authorization_code WHERE authorization_code = '${authorization_code}' AND client_id = '${client_id}'`);
    if (results.length === 0) throw 404;
    let { user_id } = results[0];

    //Delete authorization code
    await dbInterface.query(`DELETE FROM authorization_code WHERE authorization_code = '${authorization_code}' AND client_id = '${client_id}'`);

    //create unique refresh_token
    let refresh_token;
    let error = true;
    while (error) {
        refresh_token = generateToken(configReader.refreshTokenLength());
        try {
            await dbInterface.query(`INSERT INTO refresh_token (refresh_token, user_id, client_id) VALUES ('${refresh_token}', '${user_id}', '${client_id}')`);
            error = false;
        } catch (e) {
            continue;
        }
    }

    //create unique access_token
    let expires = currentUnixTime() + configReader.accessTokenExpirationTime();
    let access_token;
    error = true;
    while (error) {
        access_token = generateToken(configReader.accessTokenLength());
        try {
            await dbInterface.query(`INSERT INTO access_token (access_token, user_id, client_id, expires) VALUES ('${access_token}', '${user_id}', '${client_id}', '${expires}')`);
            error = false;
        } catch (e) {
            continue;
        }
    }

    return { access_token, refresh_token, expires };
}

/**
 * Validates the access token
 * @param {string} access_token
 * @returns {(boolean|number|string|string)} An object containing wether it is active, user_id, username, email
 */
async function validateAccessToken(access_token, client_id) {
    let results = await dbInterface.query(`SELECT access_token.user_id AS user_id, access_token.expires AS expires, user.username AS username, user.email AS email FROM access_token JOIN user ON access_token.user_id = user.user_id WHERE access_token.access_token = '${access_token}' AND access_token.client_id = '${client_id}'`);
    let active = results.length === 1 && results[0].expires > currentUnixTime();
    if (active)
        return { active: true, user_id: results[0].user_id, username: results[0].username, email: results[0].email };
    else
        return { active: false }
}

/**
 * Use the refresh_token to generate a new access_token
 * @param {string} refresh_token 
 * @param {string} client_id 
 * @returns {(string|number)} access_token, expires
 */
async function refreshAccessToken(refresh_token, client_id) {
    let results = await dbInterface.query(`SELECT user_id FROM refresh_token WHERE refresh_token = '${refresh_token}' AND client_id = '${client_id}'`);
    if (results.length === 0) throw 404;
    let user_id = results[0].user_id;

    //create unique access_token
    let expires = currentUnixTime() + configReader.accessTokenExpirationTime();
    let access_token;
    let error = true;
    while (error) {
        access_token = generateToken(configReader.accessTokenLength());
        try {
            await dbInterface.query(`INSERT INTO access_token (access_token, user_id, client_id, expires) VALUES ('${access_token}', '${user_id}', '${client_id}', '${expires}')`);
            error = false;
        } catch (e) {
            console.error(e);
            continue;
        }
    }

    return { access_token, expires };
}

module.exports = { validateAccessToken, tokenInfo, token, revoke };