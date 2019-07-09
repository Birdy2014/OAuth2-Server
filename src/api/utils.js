/**
 * Generates an Object for a api response
 * @param {number} status - The HTML status code
 * @param {Object} [data] - Additional data
 * @returns {(number|Object)} Object for api response
 */
function respondJSON(status, data, error) {
    if (data === undefined) {
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

module.exports = { generateToken, currentUnixTime, respond, requireValues };