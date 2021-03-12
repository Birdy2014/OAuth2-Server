const { Database } = require("../../db/db");

/**
 *
 * @param {string} client_id
 * @returns {Promise<(string|string|string|string)>} - client_id, client_secret, name, dev_id
 */
exports.getClientFromId = async (client_id) => {
    let result;
    try {
        result = (await Database.query(`SELECT * FROM client WHERE client_id = '${client_id}'`))[0];
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

exports.getClients = async () => {
    let results = await Database.query("SELECT client_id, name, dev_id FROM client");
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
