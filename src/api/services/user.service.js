const bcrypt = require("bcrypt");
const { Database } = require("../../db/db");
const { generateToken, checkEmail, checkPassword } = require("../utils");
const configReader = require("../../configReader");
const { sendVerificationEmail } = require("../services/verification.service");

const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

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
