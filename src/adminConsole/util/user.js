const { Database } = require("../../db/db");
const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

/**
 * Get the user id from the login
 * @param {string} login - email, username or user_id
 * @returns {Promise<string>} user_id
 * @throws {string}
 */
exports.getUserId = async (login) => {
    let query;
    if (uuidRegEx.test(login))
        query = `SELECT user_id FROM user WHERE user_id = '${login}'`;
    else if (emailRegEx.test(login))
        query = `SELECT user_id FROM user WHERE email = '${login}'`;
    else
        query = `SELECT user_id FROM user WHERE username = '${login}'`;

    let result = await Database.query(query);
    if (result.length === 1) {
        return result[0].user_id;
    } else if (result.length === 0) {
        throw `Can't find user ${login}`;
    } else {
        throw `Found ${result.length} users with name ${login}`;
    }
}
