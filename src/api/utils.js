const DBInterface = require("../DBInterface");
const dbInterface = new DBInterface();

const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

/**
 * Generates an Object for a api response
 * @param {number} status - The HTML status code
 * @param {Object} [data] - Additional data
 * @returns {(number|Object)} Object for api response
 */
function respondJSON(status, data) {
    if (data === undefined) {
        return {
            status: status
        };
    } else {
        return {
            status: status,
            data: data
        }
    }
}

/**
 * Sends a response to the client
 * @param {Object} res - The response object from express
 * @param {number} status - The HTML status code
 * @param {Object} [data] - Additional data
 */
function respond(res, status, data) {
    res.status(status);
    res.json(respondJSON(status, data));
}

/**
 * Generate a random string
 * @param {number} length
 * @returns {string} Random string
 */
function generateToken(length) {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
    let text = "";
    for (let i = 0; i < length; i++)
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    return text;
}

function currentUnixTime() {
    return Math.floor(Date.now() / 1000);
}

/**
 * checks if required values exist and return the code 400 and false if they don't
 * @param {*} res
 * @param  {...any} values 
 * @returns {boolean} 
 */
function requireValues(res, ...values) {
    for (const value of values) {
        if (value == undefined) {
            respond(res, 400);
            return false;
        }
    }

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

/**
 * Get the client_id from the name
 * @param {string} identifier - name or client_id
 * @param {function(string)} callback - async callback with client_id as param
 */
async function getClientId(identifier, callback) {
    let query;
    if (uuidRegEx.test(identifier))
        query = `SELECT client_id FROM client WHERE client_id = '${identifier}'`;
    else
        query = `SELECT client_id FROM client WHERE name = '${identifier}'`;

    let result = await dbInterface.query(query);
    if (result.length === 1) {
        let client_id = result[0].client_id;
        await callback(client_id);
    } else if (result.length === 0) {
        console.log(`Can't find client ${identifier}`);
    } else {
        console.log(`Found ${result.length} clients with name ${identifier}`);
    }
}

module.exports = { generateToken, currentUnixTime, respond, requireValues, getUserId, getClientId };