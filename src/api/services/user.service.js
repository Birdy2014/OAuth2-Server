const bcrypt = require("bcrypt");
const uuid = require("uuid").v4;
const { Database } = require("../../db/db");
const { generateToken, checkUsername, checkEmail, checkPassword, currentUnixTime } = require("../utils");
const configReader = require("../../configReader");
const { sendVerificationEmail } = require("../services/verification.service");
const { hasPermission } = require("./permission.service");

const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

exports.deleteUser = async user_id => {
    await Database.query(`DELETE FROM authorization_code WHERE user_id = '${user_id}'`);
    await Database.query(`DELETE FROM access_token WHERE user_id = '${user_id}'`);
    await Database.query(`DELETE FROM refresh_token WHERE user_id = '${user_id}'`);
    await Database.query(`DELETE FROM user WHERE user_id = '${user_id}'`);
    await Database.query(`DELETE FROM verification_code WHERE user_id = '${user_id}'`);
    await Database.query(`DELETE FROM user_info WHERE user_id = '${user_id}'`);
}

exports.changeUsername = async (user_id, username) => {
    if (!checkUsername(username)) throw { status: 400, error: "Invalid Username" };
    await Database.query(`UPDATE user SET username = '${username}' WHERE user_id = '${user_id}'`);
}

exports.changePassword = async (user_id, password) => {
    if (!checkPassword(password)) throw { status: 400, error: "Invalid Password" };
    let password_hash = await bcrypt.hash(password, 12);
    await Database.query(`UPDATE user SET password_hash = '${password_hash}' WHERE user_id = '${user_id}'`);
}

exports.changeEmail = async (user_id, email, noVerification) => {
    if (!checkEmail(email)) throw { status: 400, error: "Invalid email address" };
    if (configReader.config.email.enabled && !noVerification) {
        let verification_code = generateToken(12);
        await Database.query(`DELETE FROM verification_code WHERE user_id = '${user_id}'`); //Delete old verification codes
        await Database.insert("verification_code", { user_id, verification_code, email });
        let username = (await Database.query(`SELECT username FROM user WHERE user_id = '${user_id}'`))[0].username;
        sendVerificationEmail(username, email, verification_code, 1);
    } else {
        await Database.query(`UPDATE user SET email = '${email}' WHERE user_id = '${user_id}'`);
    }
}

/**
 * Get all users. admin only
 */
exports.getAllUsers = async () => {
    let results = await Database.query(`SELECT user.user_id AS user_id, user.username AS username, user.email AS email, user.verified AS verified, admins.permission AS permission FROM user LEFT JOIN (SELECT * FROM permissions WHERE client_id = '${Database.dashboard_id}' AND permission = 'admin') admins ON user.user_id = admins.user_id`);
    let users = [];
    await results.forEach(user => {
        users.push({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            verified: user.verified === 1,
            admin: user.permission === "admin"
        });
    });
    return users;
}

exports.getUserInfo = async user_id => {
    let results = await Database.query(`SELECT username, email, verified FROM user WHERE user_id = '${user_id}'`);
    if (results.length === 0)
        throw { status: 400, error: "Invalid arguments" }
    let { username, email, verified } = results[0];
    let admin = await hasPermission(user_id, Database.dashboard_id, "admin");
    let user_info = await exports.getValues(user_id);
    return Object.assign(user_info, { user_id, username, email, verified: verified === 1, admin });
}

/**
 * Get the user id from the login
 * @param {string} login - email, username or user_id
 * @returns {Promise<Object>} user_id
 */
exports.getUserFromLogin = async (login) => {
    let query;
    if (uuidRegEx.test(login))
        query = `SELECT * FROM user WHERE user_id = '${login}'`;
    else if (emailRegEx.test(login))
        query = `SELECT * FROM user WHERE email = '${login}'`;
    else
        query = `SELECT * FROM user WHERE username = '${login}'`;

    let user;
    try {
        user = (await Database.query(query))[0];
    } catch (e) {
        throw { status: 500, error: "Internal Server Error" };
    }
    if (user)
        return user;
    else
        throw { status: 404, error: "User " + login + " not found" };
}

/**
 *
 * @param {string} access_token
 * @returns {Promise<Object>}
 */
exports.getUserFromAccessToken = async (access_token) => {
    if (access_token.startsWith("Bearer ")) access_token = access_token.substring("Bearer ".length);
    let results = await Database.query(`SELECT user_id AS user_id, expires AS expires, client_id AS client_id FROM access_token WHERE access_token = '${access_token}'`);
    if (results.length > 0 && results[0].expires > currentUnixTime()) {
        let user = await exports.getUserInfo(results[0].user_id);
        Object.assign(user, { client_id: results[0].client_id });
        return user;
    } else {
        throw { status: 403, error: "Invalid access_token" };
    }
}

/* Additional user information */

/**
 * Get a pice of additional user information
 * @param {string} user_id
 * @param {string} name
 * @returns {Promise<string>}
 */
exports.getValue = async (user_id, name) => {
    let result = await Database.query(`SELECT value FROM user_info WHERE user_id = '${user_id}' AND name = '${name}'`);
    if (result.length === 0)
        return undefined;
    else
        return result[0].value;
}

/**
 * Get all additional user information
 * @param {string} user_id
 * @returns {Promise<Object>}
 */
exports.getValues = async user_id => {
    let results = await Database.query(`SELECT name, value FROM user_info WHERE user_id = '${user_id}'`);
    let values = {};
    for (const result of results) {
        values[result.name] = result.value;
    }
    return values
}

exports.setValue = async (user_id, name, value) => {
    let user_info = configReader.config.user_info[name];
    if (user_info === undefined)
        throw { status: 400, error: "Invalid option name" };
    else if (user_info !== [] && user_info.length > 0 && !user_info.includes(value)) {
        throw { status: 400, error: "Invalid option value" };
    } else if (await exports.getValue(user_id, name) !== undefined) {
        await Database.query(`UPDATE user_info SET value = '${value}' WHERE user_id = '${user_id}' AND name = '${name}'`);
    } else {
        await Database.insert("user_info", { user_id, name, value });
    }
}

exports.setValues = async (user_id, user_info) => {
    for (const name in user_info) {
        await exports.setValue(user_id, name, user_info[name]);
    }
}

exports.setVerified = async (user_id, verified) => {
    Database.query(`UPDATE user SET verified = '${verified ? "1" : "0"}' WHERE user_id = '${user_id}'`);
}
