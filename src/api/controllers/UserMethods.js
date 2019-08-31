const bcrypt = require("bcrypt");
const DBInterface = require("../../DBInterface");
const { respond, generateToken, handleError } = require("../utils");
const ConfigReader = require("../../ConfigReader");
const { sendVerificationEmail } = require("./VerificationMethods");
const dbInterface = new DBInterface();
const configReader = new ConfigReader();

const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

async function get(req, res) {

}

async function post(req, res) {
    try {
        if (!req.body.email || !req.body.username || !req.body.password)
            throw { status: 400, error: "Invalid arguments" };

        let user_id = await createUser(req.body.email, req.body.username, req.body.password);
        respond(res, 201, { user_id });
    } catch (e) {
        handleError(res, e);
    }
}

async function put(req, res) {
    try {
        if (!req.user || req.user.origin !== "access_token" || req.client.name !== "Dashboard" || !(req.body.username || req.body.password || req.body.email))
            throw { status: 400, error: "Invalid arguments" };

        if (req.body.username) await changeUsername(req.user.user_id, req.body.username);
        if (req.body.password) await changePassword(req.user.user_id, req.body.password);
        if (req.body.email) await changeEmail(req.user.user_id, req.body.email);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

async function del(req, res) {
    try {
        if (!req.user || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        await deleteUser(req.user.user_id);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

/**
 * Create a new user
 * @param {string} email 
 * @param {string} username 
 * @param {string} password 
 * @returns {string} user_id
 */
async function createUser(email, username, password) {
    if (!await checkEmail(email)) throw { status: 400, error: "Invalid email address" };
    if (!await checkPassword(password)) throw { status: 400, error: "Invalid Password" };

    //Create password hash
    let password_hash = await bcrypt.hash(password, 12);

    //Create user
    try {
        await dbInterface.query(`INSERT INTO user (user_id, email, username, password_hash) VALUES (uuid(), '${email}', '${username}', '${password_hash}')`);
    } catch (e) {
        if (e.code === "ER_DUP_ENTRY")
            throw { status: 409, error: "User already exists" };
        else
            throw e;
    }

    let user_id = (await dbInterface.query(`SELECT user_id FROM user WHERE email = '${email}'`))[0].user_id;

    if (configReader.emailVerificationEnabled()) {
        let verification_code = generateToken(12);
        await dbInterface.query(`INSERT INTO verification_code (user_id, verification_code) VALUES ('${user_id}', '${verification_code}')`);
        sendVerificationEmail(username, email, verification_code);
    } else {
        await dbInterface.query(`UPDATE user SET verified = true WHERE user_id = '${user_id}'`);
    }

    return user_id;
}

async function deleteUser(user_id) {
    await dbInterface.query(`DELETE FROM authorization_code WHERE user_id = '${user_id}'`);
    await dbInterface.query(`DELETE FROM access_token WHERE user_id = '${user_id}'`);
    await dbInterface.query(`DELETE FROM refresh_token WHERE user_id = '${user_id}'`);
    await dbInterface.query(`DELETE FROM user WHERE user_id = '${user_id}'`);
}

async function changeUsername(user_id, username) {
    await dbInterface.query(`UPDATE user SET username = '${username}' WHERE user_id = '${user_id}'`);
}

async function changePassword(user_id, password) {
    if (!await checkPassword(password)) throw { status: 400, error: "Invalid Password" };
    let password_hash = await bcrypt.hash(password, 12);
    await dbInterface.query(`UPDATE user SET password_hash = '${password_hash}' WHERE user_id = '${user_id}'`);
}

async function changeEmail(user_id, email) {
    if (!await checkEmail(email)) throw { status: 400, error: "Invalid email address" };
    if (configReader.emailVerificationEnabled()) {
        let verification_code = generateToken(12);
        await dbInterface.query(`DELETE FROM verification_code WHERE user_id = '${user_id}'`); //Delete old verification codes
        await dbInterface.query(`INSERT INTO verification_code (user_id, verification_code, email) VALUES ('${user_id}', '${verification_code}', '${email}')`);
        let username = (await dbInterface.query(`SELECT username FROM user WHERE user_id = '${user_id}'`))[0].username;
        sendVerificationEmail(username, email, verification_code);
    } else {
        await dbInterface.query(`UPDATE user SET email = '${email}' WHERE user_id = '${user_id}'`);
    }
}

async function getUserInfo() {

}

/**
 * Checks if user exists and returns it's user_id
 * @param {string} login - user_id, email or username
 * @param {string} password
 * @returns {string} user_id or empty string
 */
async function validateUser(login, password) {
    let query;
    if (uuidRegEx.test(login))
        query = `SELECT password_hash, user_id FROM user WHERE user_id = '${login}'`;
    else if (emailRegEx.test(login))
        query = `SELECT password_hash, user_id FROM user WHERE email = '${login}'`;
    else
        query = `SELECT password_hash, user_id FROM user WHERE username = '${login}'`;

    try {
        let { password_hash, user_id } = (await dbInterface.query(query))[0];
        if (await bcrypt.compare(password, password_hash))
            return user_id;
        else
            return "";
    } catch (e) {
        return "";
    }
}

/**
 * Checks if email address matches the whitelist of the config file
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
async function checkEmail(email) {
    if (!emailRegEx.test(email)) return false;
    if (!configReader.emailWhitelist() || configReader.emailWhitelist().length === 0) return true;
    for (const whitelistDomain of configReader.emailWhitelist()) {
        if (email.endsWith(whitelistDomain)) return true;
    }
    return false;
}

/**
 * Checks if the password length is ok
 * @param {string} password 
 * @returns {Promise<boolean>}
 */
async function checkPassword(password) {
    if (password.length >= 8)
        return true;
}

/**
 * Get the user id from the login
 * @param {string} login - email, username or user_id
 * @param {function(string)} - async callback with user_id as param
 */
async function getUserId(login, callback) {
    let query;
    if (uuidRegEx.test(login))
        query = `SELECT user_id FROM user WHERE user_id = '${login}'`;
    else if (emailRegEx.test(login))
        query = `SELECT user_id FROM user WHERE email = '${login}'`;
    else
        query = `SELECT user_id FROM user WHERE username = '${login}'`;

    let result = await dbInterface.query(query);
    if (result.length === 1) {
        let user_id = result[0].user_id;
        await callback(user_id);
    } else if (result.length === 0) {
        console.log(`Can't find user ${login}`);
    } else {
        console.log(`Found ${result.length} users with name ${login}`);
    }
}

module.exports = { post, put, del, validateUser, createUser, deleteUser, changeUsername, changePassword, changeEmail, getUserId };