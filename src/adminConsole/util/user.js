const db = require("../../db");
const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

/**
 * Get the user id from the login
 * @param {string} login - email, username or user_id
 * @param {function(string)} - async callback with user_id as param
 */
exports.getUserId = (login, callback) => {
    let query;
    if (uuidRegEx.test(login))
        query = `SELECT user_id FROM user WHERE user_id = '${login}'`;
    else if (emailRegEx.test(login))
        query = `SELECT user_id FROM user WHERE email = '${login}'`;
    else
        query = `SELECT user_id FROM user WHERE username = '${login}'`;

    db.query(query).then((result) => {
        if (result.length === 1 && !callback) {
            return result[0].user_id;
        } else if (result.length !== 1 && !callback) {
            throw { status: 404, error: "Cannot find User" };
        } else if (result.length === 1) {
            let user_id = result[0].user_id;
            callback(user_id);
        } else if (result.length === 0) {
            console.log(`Can't find user ${login}`);
        } else {
            console.log(`Found ${result.length} users with name ${login}`);
        }
    });
}