const client = require("../services/client.service");
const { respond, handleError } = require("../utils");

exports.get = async (req, res) => {
    try {
        if (!req.user.admin || req.client.name !== "Dashboard")
            throw { status: 403, error: "Insufficient permissions" };

        let clients = await client.getClients();
        respond(res, 200, clients);
    } catch (e) {
        handleError(res, e);
    }
}

exports.post = async (req, res) => {
    try {
        if (!req.body.name || !req.body.redirect_uri || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        let { client_id, client_secret } = await client.createClient(req.body.name, req.user.user_id, req.body.redirect_uri);
        respond(res, 201, { client_id: client_id, client_secret: client_secret });
    } catch (e) {
        handleError(res, e);
    }
}

exports.del = async (req, res) => {
    try {
        if (!req.body.client_id || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        await client.deleteClient(req.body.client_id, req.user.user_id);
        respond(res, 200)
    } catch (e) {
        handleError(res, e);
    }
}
