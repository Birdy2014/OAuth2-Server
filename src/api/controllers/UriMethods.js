const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();
const { respond, handleError } = require("../utils");
const { hasPermission } = require("../services/permission.service");

async function post(req, res) {
    try {
        if (!req.body.client_id || !req.body.redirect_uri || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        //Only Admin
        if (!(req.user.admin || await hasPermission(req.user.user_id, req.body.client_id, "admin")))
            throw { status: 403, error: "Insufficient permissions" };

        await addUri(req.body.client_id, req.body.redirect_uri);
        respond(res, 201);
    } catch (e) {
        handleError(res, e);
    }
}

async function del(req, res) {
    try {
        if (!req.body.client_id || !req.body.redirect_uri || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        //Only Admin
        if (!(req.user.admin || await hasPermission(req.user.user_id, req.body.client_id, "admin")))
            throw { status: 403, error: "Insufficient permissions" };

        await removeUri(req.body.client_id, req.body.redirect_uri);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

async function addUri(client_id, redirect_uri) {
    try {
        let results = await dbInterface.query(`SELECT client_id FROM client WHERE client_id = '${client_id}'`);
        if (results.length === 1)
            await dbInterface.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${client_id}', '${redirect_uri}')`);
        else
            throw { status: 404, error: "Client not found" };
    } catch (e) {
        if (e.code != "ER_DUP_ENTRY") throw e; //Allow adding URIs multiple times
    }
}

async function removeUri(client_id, redirect_uri) {
    await dbInterface.query(`DELETE FROM redirect_uri WHERE client_id = '${client_id}' AND redirect_uri = '${redirect_uri}'`);
}

module.exports = { post, del, addUri, removeUri };