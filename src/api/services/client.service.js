const db = require("../../db");
const uuid = require("uuid").v4;
const utils = require("../utils");

/**
 * 
 * @param {string} client_id 
 * @returns {Promise<(string|string|string|string)>} - client_id, client_secret, name, dev_id
 */
exports.getClientFromId = async (client_id) => {
    let result;
    try {
        result = (await db.query(`SELECT * FROM client WHERE client_id = '${client_id}'`))[0];
    } catch (e) {
        throw { status: 500, error: "Internal Server Error" };
    }
    if (result)
        return result;
    else
        throw { status: 404, error: "Client " + client_id + " not found" };
}

/**
 * 
 * @param {string} client_id 
 * @param {string} client_secret 
 * @returns {Promise<boolean>}
 */
exports.checkClientCredentials = async (client_id, client_secret) => {
    let client = await exports.getClientFromId(client_id);
    return client.client_secret === client_secret;
}

/**
 * Creates a new client
 * @param {string} name - The name of the client,
 * @param {number} developer_id - The id of the developer
 * @returns {Promise<(string|string)>} client_id and client_secret
 */
exports.createClient = async (name, developer_id, redirect_uri) => {
    //Does a client with the same name already exist?
    if ((await db.query(`SELECT * FROM client WHERE name='${name}'`)).length === 1) throw { status: 409, error: "Client already exists" };

    //Generate the client_secret
    let client_secret = utils.generateToken(12);

    //Create the client
    let client_id = uuid();
    await db.query(`INSERT INTO client (client_id, client_secret, name, dev_id) VALUES ('${client_id}', '${client_secret}', '${name}', '${developer_id}')`);

    await db.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${client_id}', '${redirect_uri}')`);

    return { client_id, client_secret };
}

/**
 * Deletes a client
 * @param {string} client_id 
 * @param {number} developer_id
 */
exports.deleteClient = async (client_id) => {
    if ((await db.query(`SELECT * FROM client WHERE client_id='${client_id}'`)).length !== 1) throw { status: 404, error: "Client not found" };

    await db.query(`DELETE FROM authorization_code WHERE client_id = '${client_id}'`);
    await db.query(`DELETE FROM access_token WHERE client_id = '${client_id}'`);
    await db.query(`DELETE FROM refresh_token WHERE client_id = '${client_id}'`);
    await db.query(`DELETE FROM client WHERE client_id = '${client_id}'`);
    await db.query(`DELETE FROM redirect_uri WHERE client_id = '${client_id}'`);
}

exports.getClients = async () => {
    let results = await db.query("SELECT client_id, name, dev_id FROM client");
    let clients = [];
    results.forEach(client => {
        clients.push({
            client_id: client.client_id,
            name: client.name,
            dev_id: client.dev_id
        });
    });
    return clients;
}

/**
 * check if client exists and is valid
 * @param {string} client_id
 * @param {string} client_secret
 * @returns {Promise<Object>}
 */
exports.getClientFromSecret = async (client_id, client_secret) => {
    let client = await exports.getClientFromId(client_id);
    if (client.client_secret === client_secret) {
        return client;
    } else {
        return { status: 403, error: "Invalid client_secret" };
    }
}

/**
 * 
 * @param {string} client_id
 * @param {string} redirect_uri
 * @returns {Promise<Object>}
 */
exports.getClientFromRedirectUri = async (client_id, redirect_uri) => {
    let client = await exports.getClientFromId(client_id);
    let redirect_uris = await db.query(`SELECT redirect_uri FROM redirect_uri WHERE client_id = '${client_id}'`);
    for (const item of redirect_uris) {
        if (redirect_uri.startsWith(item.redirect_uri)) {
            return client;
        }
    }
    throw { status: 403, error: "Invalid redirect_uri" };
}

//TODO change name
