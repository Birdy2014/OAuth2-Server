import { Database } from '../db/db';

const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

/**
 * Get the user id from the login
 * @param {string} login - email, username or user_id
 * @returns {Promise<string>} user_id
 * @throws {string}
 */
export async function getUserId(login: string): Promise<string> {
    let query: string;
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

/**
 * Get the client_id from the name
 * @param {string} identifier - name or client_id
 * @returns {Promise<string>} client_id
 * @throws {string}
 */
export async function getClientId(identifier: string): Promise<string> {
    let query: string;
    if (uuidRegEx.test(identifier))
        query = `SELECT client_id FROM client WHERE client_id = '${identifier}'`;
    else
        query = `SELECT client_id FROM client WHERE name = '${identifier}'`;

    let result = await Database.query(query);
    if (result.length === 1) {
        return result[0].client_id;
    } else if (result.length === 0) {
        throw `Can't find client ${identifier}`;
    } else {
        throw `Found ${result.length} clients with name ${identifier}`;
    }
}
