const { Database } = require("../../db/db");
const { respond, handleError } = require("../utils");
const { hasPermission } = require("../services/permission.service");

exports.post = async (req, res) => {
    try {
        if (!req.body.client_id || !req.body.redirect_uri || req.client.name !== "Dashboard")
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

exports.del = async (req, res) => {
    try {
        if (!req.body.client_id || !req.body.redirect_uri || req.client.name !== "Dashboard")
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

exports.addUri = async (client_id, redirect_uri) => {
    try {
        let results = await Database.query(`SELECT client_id FROM client WHERE client_id = '${client_id}'`);
        if (results.length === 1)
            await Database.insert("redirect_uri", { client_id, redirect_uri });
        else
            throw { status: 404, error: "Client not found" };
    } catch (e) {
        if (e.code != "ER_DUP_ENTRY") throw e; //Allow adding URIs multiple times
    }
}

exports.removeUri = async (client_id, redirect_uri) => {
    await Database.query(`DELETE FROM redirect_uri WHERE client_id = '${client_id}' AND redirect_uri = '${redirect_uri}'`);
}
