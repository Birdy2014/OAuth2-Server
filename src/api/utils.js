const configReader = new (require("../ConfigReader"))();

/**
 * Generates an Object for a api response
 * @param {number} status - The HTML status code
 * @param {Object} [data] - Additional data
 * @param {string} [error] - error description
 * @returns {(number|Object)} Object for api response
 */
function respondJSON(status, data, error) {
    if (!data) {
        return {
            status: status,
            error: error
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
 * @param {string} [error] - error description
 */
function respond(res, status, data, error) {
    res.status(status);
    res.json(respondJSON(status, data, error));
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
 * 
 * @param {*} res 
 * @param {Object} e - Error
 */
function handleError(res, e) {
    if (typeof e.status === "number") {
        respond(res, e.status, undefined, e.error);
    } else {
        respond(res, 500, undefined, "Internal Server Error");
        console.error("An error occurred: " + e);
    }
}

/**
 * Checks whether the username contains illegal characters
 * @param {string} username 
 * @returns {Promise<boolean>}
 */
async function checkUsername(username) {
    const forbiddenChars = ["'", ";", "\"", "&", "="];
    return !forbiddenChars.some(i => username.includes(i));
}

/**
 * Checks if email address matches the whitelist of the config file
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
async function checkEmail(email) {
    const emailRegEx = /^\S+@\S+\.\S+$/;
    const forbiddenChars = ["'", ";", "\"", "&", "="];
    if (forbiddenChars.some(i => email.includes(i))) return false;
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

module.exports = { generateToken, currentUnixTime, respond, handleError, checkUsername, checkEmail, checkPassword };