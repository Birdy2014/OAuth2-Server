const db = require("../../db");
const { generateToken, respond, handleError } = require("../utils");
const uuid = require("uuid").v4;
const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;

async function get(req, res) {
    try {
        if (!req.user.admin || req.client.name !== "Dashboard")
            throw { status: 403, error: "Insufficient permissions" };

        let clients = await getClients();
        respond(res, 200, clients);
    } catch (e) {
        handleError(res, e);
    }
}

async function post(req, res) {
    try {
        if (!req.body.name || !req.body.redirect_uri || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        let { client_id, client_secret } = await createClient(req.body.name, req.user.user_id, req.body.redirect_uri);
        respond(res, 201, { client_id: client_id, client_secret: client_secret });
    } catch (e) {
        handleError(res, e);
    }
}

async function del(req, res) {
    try {
        if (!req.body.client_id || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        await deleteClient(req.body.client_id, req.user.user_id);
        respond(res, 200)
    } catch (e) {
        handleError(res, e);
    }
}

/**
 * Creates a new client
 * @param {string} name - The name of the client,
 * @param {number} developer_id - The id of the developer
 * @returns {Promise<(string|string)>} client_id and client_secret
 */
async function createClient(name, developer_id, redirect_uri) {
    //Does a client with the same name already exist?
    if ((await db.query(`SELECT * FROM client WHERE name='${name}'`)).length === 1) throw { status: 409, error: "Client already exists" };

    //Generate the client_secret
    let client_secret = generateToken(12);

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
async function deleteClient(client_id) {
    if ((await db.query(`SELECT * FROM client WHERE client_id='${client_id}'`)).length !== 1) throw { status: 404, error: "Client not found" };

    await db.query(`DELETE FROM authorization_code WHERE client_id = '${client_id}'`);
    await db.query(`DELETE FROM access_token WHERE client_id = '${client_id}'`);
    await db.query(`DELETE FROM refresh_token WHERE client_id = '${client_id}'`);
    await db.query(`DELETE FROM client WHERE client_id = '${client_id}'`);
    await db.query(`DELETE FROM redirect_uri WHERE client_id = '${client_id}'`);
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

    let result = await db.query(query);
    if (result.length === 1) {
        let client_id = result[0].client_id;
        await callback(client_id);
    } else if (result.length === 0) {
        console.log(`Can't find client ${identifier}`);
    } else {
        console.log(`Found ${result.length} clients with name ${identifier}`);
    }
}

async function getClients() {
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

//TODO change name

module.exports = { get, post, del, createClient, deleteClient, getClientId };