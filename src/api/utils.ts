const configReader = require("../configReader");
const logger = require("../logger");

export class ServerError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = "ServerError";
    }
}

/**
 * Generates an Object for a api response
 * @param {number} status - The HTML status code
 * @param {Object} [data] - Additional data
 * @param {string} [error] - error description
 * @returns {{status: number, error?: object, data?: object}} Object for api response
 */
function respondJSON(status: number, data: object|undefined, error: string|undefined) {
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
export function respond(res, status: number, data: object|undefined, error?: string|undefined) {
    res.status(status);
    res.json(respondJSON(status, data, error));
}

/**
 * Generate a random string
 * @param {number} length
 * @returns {string} Random string
 */
export function generateToken(length: number): string {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
    let text = "";
    for (let i = 0; i < length; i++)
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    return text;
}

export function currentUnixTime(): number {
    return Math.floor(Date.now() / 1000);
}

/**
 *
 * @param {*} res
 * @param {Object} e - Error
 */
export function handleError(res, error: Error) {
    if (error instanceof ServerError) {
        respond(res, error.status, undefined, error.message);
    } else if (typeof (error as any).error === "string") {
        respond(res, (error as any).status, undefined, (error as any).error);
    } else {
        respond(res, 500, undefined, "Internal Server Error");
        logger.error(error);
    }
}

/**
 * Checks whether the username contains illegal characters
 * @param {string} username
 * @returns {boolean}
 */
export function checkUsername(username: string): boolean {
    const forbiddenChars = ["'", ";", "\"", "&", "="];
    return !forbiddenChars.some(i => username.includes(i));
}

/**
 * Checks if email address matches the whitelist of the config file
 * @param {string} email
 * @returns {boolean}
 */
export function checkEmail(email: string): boolean {
    const emailRegEx = /^\S+@\S+\.\S+$/;
    const forbiddenChars = ["'", ";", "\"", "&", "="];
    if (forbiddenChars.some(i => email.includes(i))) return false;
    if (!emailRegEx.test(email)) return false;
    if (!configReader.config.emailWhitelist || configReader.config.emailWhitelist.length === 0) return true;
    for (const whitelistDomain of configReader.config.emailWhitelist) {
        if (email.endsWith(whitelistDomain)) return true;
    }
    return false;
}

/**
 * Checks if the password length is ok
 * @param {string} password
 * @returns {boolean}
 */
export function checkPassword(password: string): boolean {
    return password.length >= 8;
}
