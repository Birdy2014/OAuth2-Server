import { Database } from '../db/Database';

const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const emailRegEx = /^\S+@\S+\.\S+$/;

/**
 * Get the user id from the login
 * @param {string} login - email, username or user_id
 * @returns {Promise<string>} user_id
 * @throws {string}
 */
export async function getUserId(login: string): Promise<string> {
    let condition: any = {};
    if (uuidRegEx.test(login))
        condition.user_id = login;
    else if (emailRegEx.test(login))
        condition.email = login;
    else
        condition.username = login;

    let result = await Database.select('user', condition);
    if (!result)
        throw `Can't find user ${login}`;
    return result.user_id;
}

/**
 * Get the client_id from the name
 * @param {string} identifier - name or client_id
 * @returns {Promise<string>} client_id
 * @throws {string}
 */
export async function getClientId(identifier: string): Promise<string> {
    let condition: any = {};
    if (uuidRegEx.test(identifier))
        condition.client_id = identifier;
    else
        condition.name = identifier;

    let result = await Database.select('client', condition);
    if (!result)
        throw `Can't find client ${identifier}`;
    return result.client_id;
}
