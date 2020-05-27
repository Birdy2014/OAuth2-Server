const { generateToken, currentUnixTime } = require("../utils");
const configReader = require("../../configReader");
const db = require("../../db");

/**
 * Get the user_id and client_id from a refresh_token
 * @param {string} refresh_token 
 * @returns {Promise<{string|string}>}
 */
exports.getUserAndClientFromRefreshToken = async (refresh_token) => {
    let result = await db.query(`SELECT user_id, client_id FROM refresh_token WHERE refresh_token = '${refresh_token}'`);
    return result[0] || {};
}

/**
 * Use the authorization_code to generate an access_token and refresh_token
 * @param {string} user_id 
 * @param {string} client_id 
 * @returns {Promise<(string|string|number)>} access_token, refresh_token, expires
 */
exports.generateRefreshToken = async (user_id, client_id) => {
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
    let { access_token, expires } = await exports.generateAccessToken(user_id, client_id);

    return { access_token, refresh_token, expires };
}

/**
 * Validates the access token
 * @param {string} access_token
 * @returns {(boolean|number|string|string)} An object containing wether it is active, user_id, username, email
 */
exports.validateAccessToken = async (access_token, client_id) => {
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
exports.generateAccessToken = async (user_id, client_id) => {
    let expires = currentUnixTime() + configReader.config.accessTokenExpirationTime;
    let access_token;
    let error = true;
    while (error) {
        access_token = generateToken(configReader.config.accessTokenLength);
        try {
            await db.query(`INSERT INTO access_token (access_token, user_id, client_id, expires) VALUES ('${access_token}', '${user_id}', '${client_id}', '${expires}')`);
            error = false;
        } catch (e) {
            continue;
        }
    }

    return { access_token, expires };
}