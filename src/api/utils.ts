import express from 'express';
import { ConfigReader } from '../ConfigReader';
import { Logger } from '../Logger';

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
export function respond(res, status: number, data?: object, error?: string) {
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
        Logger.error(error);
    }
}

export function wrapRoute(fn: Function) {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            await fn(req, res, next)
        } catch (err) {
            next(err);
        }
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
    if (!ConfigReader.config.emailWhitelist || ConfigReader.config.emailWhitelist.length === 0) return true;
    for (const whitelistDomain of ConfigReader.config.emailWhitelist) {
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

export function deepClone(obj: any): any {
    if (obj instanceof Array) {
        return obj.map((val) => deepClone(val));
    } else if (obj instanceof Object) {
        let out = {};
        for (const key in obj)
            if (obj.hasOwnProperty(key))
                out[key] = deepClone(obj[key]);
        return out;
    } else {
        return obj;
    }
}
