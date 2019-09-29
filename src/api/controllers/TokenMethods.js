const { generateToken, currentUnixTime, respond, handleError } = require("../utils");
const db = require("../../db");
const configReader = require("../../configReader");

async function tokenInfo(req, res) {
    try {
        if (!req.client || req.client.origin !== "secret" || !req.user)
            throw { status: 400, error: "Invalid arguments" };

        let tokenInfoResponse = req.user;
        tokenInfoResponse.active = true;
        tokenInfoResponse.origin = undefined;

        respond(res, 200, tokenInfoResponse);
    } catch (e) {
        handleError(res, e);
    }
}

async function token(req, res) {
    try {
        switch (req.body.grant_type) {
            case "authorization_code": {
                if (req.user.origin !== "authorization_code" || req.client.client_id !== req.body.client_id)
                    throw { status: 400, error: "Invalid arguments" };

                let response = await generateRefreshToken(req.user.user_id, req.client.client_id);
                respond(res, 201, response);
                break;
            }
            case "refresh_token": {
                if (req.user.origin !== "refresh_token" || req.client.client_id !== req.body.client_id)
                    throw { status: 400, error: "Invalid arguments" };

                let response = await generateAccessToken(req.user.user_id, req.client.client_id);
                respond(res, 201, response);
                break;
            }
            default:
                throw { status: 400, error: "Invalid arguments" };
        }
    } catch (e) {
        handleError(res, e);
    }
}

async function revoke(req, res) {
    try {
        if (!req.body.access_token && !req.body.refresh_token)
            throw { status: 400, error: "Invalid arguments" };

        if (req.body.access_token) //revoke access_token
            await db.query(`DELETE FROM access_token WHERE access_token = '${req.body.access_token}'`);

        if (req.body.refresh_token) //revoke refresh_token
            await db.query(`DELETE FROM refresh_token WHERE refresh_token = '${req.body.refresh_token}'`);

        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

/**
 * Use the authorization_code to generate an access_token and refresh_token
 * @param {string} user_id 
 * @param {string} client_id 
 * @returns {Promise<(string|string|number)>} access_token, refresh_token, expires
 */
async function generateRefreshToken(user_id, client_id) {
    //create unique refresh_token
    let refresh_token;
    let error = true;
    while (error) {
        refresh_token = generateToken(configReader.config.refreshTokenLength);
        try {
            await db.query(`INSERT INTO refresh_token (refresh_token, user_id, client_id, expires) VALUES ('${refresh_token}', '${user_id}', '${client_id}', '${currentUnixTime() + configReader.config.refreshTokenExpirationTime}')`);
            error = false;
        } catch (e) {
            continue;
        }
    }

    //create unique access_token
    let { access_token, expires } = await generateAccessToken(user_id, client_id);

    return { access_token, refresh_token, expires };
}

/**
 * Validates the access token
 * @param {string} access_token
 * @returns {(boolean|number|string|string)} An object containing wether it is active, user_id, username, email
 */
async function validateAccessToken(access_token, client_id) {
    let results = await db.query(`SELECT access_token.user_id AS user_id, access_token.expires AS expires, user.username AS username, user.email AS email FROM access_token JOIN user ON access_token.user_id = user.user_id WHERE access_token.access_token = '${access_token}' AND access_token.client_id = '${client_id}'`);
    let active = results.length === 1 && results[0].expires > currentUnixTime();
    if (active)
        return { active: true, user_id: results[0].user_id, username: results[0].username, email: results[0].email };
    else
        return { active: false }
}

/**
 * Generate a new access_token
 * @param {string} user_id 
 * @param {string} client_id 
 * @returns {Promise<(string|number)>} access_token, expires
 */
async function generateAccessToken(user_id, client_id) {
    let expires = currentUnixTime() + configReader.config.accessTokenExpirationTime;
    let access_token;
    let error = true;
    while (error) {
        access_token = generateToken(configReader.config.accessTokenLength);
        try {
            await db.query(`INSERT INTO access_token (access_token, user_id, client_id, expires) VALUES ('${access_token}', '${user_id}', '${client_id}', '${expires}')`);
            error = false;
        } catch (e) {
            console.error(e);
            continue;
        }
    }

    return { access_token, expires };
}

module.exports = { validateAccessToken, tokenInfo, token, revoke };