const bcrypt = require("bcrypt");
const uuid = require("uuid/v4");
const DBInterface = require("../../DBInterface");
const { generateToken, checkUsername, checkEmail, checkPassword } = require("../utils");
const ConfigReader = require("../../ConfigReader");
const { sendVerificationEmail } = require("../services/verification.service");
const { hasPermission } = require("./permission.service");
const dbInterface = new DBInterface();
const configReader = new ConfigReader();

const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

/**
 * Create a new user
 * @param {string} email 
 * @param {string} username 
 * @param {string} password 
 * @returns {string} user_id
 */
async function createUser(email, username, password, user_info) {
    if (!await checkEmail(email)) throw { status: 400, error: "Invalid Username" };
    if (!await checkEmail(email)) throw { status: 400, error: "Invalid email address" };
    if (!await checkPassword(password)) throw { status: 400, error: "Invalid Password" };

    //Create password hash
    let password_hash = await bcrypt.hash(password, 12);

    //Create user
    let user_id = uuid();
    try {
        await dbInterface.query(`INSERT INTO user (user_id, email, username, password_hash) VALUES ('${user_id}', '${email}', '${username}', '${password_hash}')`);
    } catch (e) {
        if (e.code === "ER_DUP_ENTRY" || e.code === "SQLITE_CONSTRAINT")
            throw { status: 409, error: "User already exists" };
        else
            throw e;
    }

    if (configReader.emailVerificationEnabled()) {
        let verification_code = generateToken(12);
        await dbInterface.query(`INSERT INTO verification_code (user_id, email, verification_code) VALUES ('${user_id}', '${email}', '${verification_code}')`);
        sendVerificationEmail(username, email, verification_code, 0);
    } else {
        await dbInterface.query(`UPDATE user SET verified = true WHERE user_id = '${user_id}'`);
    }

    //set user_info
    if (user_info)
        await setValues(user_id, user_info);

    return user_id;
}

async function deleteUser(user_id) {
    await dbInterface.query(`DELETE FROM authorization_code WHERE user_id = '${user_id}'`);
    await dbInterface.query(`DELETE FROM access_token WHERE user_id = '${user_id}'`);
    await dbInterface.query(`DELETE FROM refresh_token WHERE user_id = '${user_id}'`);
    await dbInterface.query(`DELETE FROM user WHERE user_id = '${user_id}'`);
    await dbInterface.query(`DELETE FROM verification_code WHERE user_id = '${user_id}'`);
    await dbInterface.query(`DELETE FROM user_info WHERE user_id = '${user_id}'`);
}

async function changeUsername(user_id, username) {
    if (!await checkUsername(username)) throw { status: 400, error: "Invalid Username" };
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
        sendVerificationEmail(username, email, verification_code, 1);
    } else {
        await dbInterface.query(`UPDATE user SET email = '${email}' WHERE user_id = '${user_id}'`);
    }
}

/**
 * Get all users. admin only
 */
async function getAllUsers() {
    let results = await dbInterface.query(`SELECT user.user_id AS user_id, user.username AS username, user.email AS email, user.verified AS verified, admins.permission AS permission FROM user LEFT JOIN (SELECT * FROM permissions WHERE client_id = '${await dbInterface.getDashboardId()}' AND permission = 'admin') admins ON user.user_id = admins.user_id`);
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

async function getUserInfo(user_id) {
    let results = await dbInterface.query(`SELECT username, email, verified FROM user WHERE user_id = '${user_id}'`);
    if (results.length === 0)
        throw { status: 400, error: "Invalid arguments" }
    let { username, email, verified } = results[0];
    let admin = await hasPermission(user_id, await dbInterface.getDashboardId(), "admin");
    let options = await getValues(user_id);
    return { user_id, username, email, verified: verified === 1, admin, options }
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
    if (result.length === 1 && !callback) {
        return result[0].user_id;
    } else if (result.length !== 1 && !callback) {
        throw { status: 404, error: "Cannot find User" };
    } else if (result.length === 1) {
        let user_id = result[0].user_id;
        await callback(user_id);
    } else if (result.length === 0) {
        console.log(`Can't find user ${login}`);
    } else {
        console.log(`Found ${result.length} users with name ${login}`);
    }
}

/* Additional user information */

/**
 * Get a pice of additional user information
 * @param {string} user_id 
 * @param {string} name 
 * @returns {Promise<string>}
 */
async function getValue(user_id, name) {
    let result = await dbInterface.query(`SELECT value FROM user_info WHERE user_id = '${user_id}' AND name = '${name}'`);
    if (result.length === 0)
        return undefined;
    else
        return result[0].value;
}

/**
 * Get all additional user information
 * @param {string} user_id 
 * @returns {Promise<string>}
 */
async function getValues(user_id) {
    let results = await dbInterface.query(`SELECT name, value FROM user_info WHERE user_id = '${user_id}'`);
    let values = {};
    for (const result of results) {
        values[result.name] = result.value;
    }
}

async function setValue(user_id, name, value) {
    let user_info = configReader.config.user_info[name];
    if (user_info === undefined)
        throw { status: 400, error: "Invalid option name" };
    else if (user_info !== [] && user_info.length > 0 && !user_info.includes(value)) {
        throw { status: 400, error: "Invalid option value" };
    } else if (await getValue(user_id, name)) {
        await dbInterface.query(`UPDATE user_info SET value = '${value}' WHERE user_id = '${user_id}' AND name = '${name}'`);
    } else {
        await dbInterface.query(`INSERT INTO user_info (user_id, name, value) VALUES ('${user_id}', '${name}', '${value}')`);
    }
}

async function setValues(user_id, user_info) {
    for (const name in user_info) {
        await setValue(user_id, name, user_info[name]);
    }
}

module.exports = { validateUser, createUser, deleteUser, changeUsername, changePassword, changeEmail, getUserId, getAllUsers, getUserInfo, setValues };