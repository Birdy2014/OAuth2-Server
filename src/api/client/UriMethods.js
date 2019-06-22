const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();
const { respond, requireValues } = require("../utils");
const { validateAccessToken } = require("../token/TokenMethods");
const { hasPermission } = require("../permission/PermissionMethods");

async function post(req, res) {
    if (!requireValues(req.header("Authorization"), req.body.client_id, req.body.redirect_uri)) return;

    //Only using the Dashboard
    let request_user_id = (await validateAccessToken(req.header("Authorization"), await dbInterface.getDashboardId())).user_id;
    if (!request_user_id) {
        respond(res, 403);
        return;
    }

    //Only Admin
    if (!(await hasPermission(request_user_id, await dbInterface.getDashboardId(), "admin") || await hasPermission(request_user_id, req.body.client_id, "admin"))) {
        respond(res, 403);
        return;
    }

    try {
        await addUri(req.body.client_id, req.body.redirect_uri);
        respond(res, 201);
    } catch (e) {
        if (typeof e === "number")
            respond(res, e);
        else
            respond(res, 500);
    }
}

async function del(req, res) {
    if (!requireValues(req.header("Authorization"), req.body.client_id, req.body.redirect_uri)) return;

    //Only using the Dashboard
    let request_user_id = (await validateAccessToken(req.header("Authorization"), await dbInterface.getDashboardId())).user_id;
    if (!request_user_id) {
        respond(res, 403);
        return;
    }

    //Only Admin
    if (!(await hasPermission(request_user_id, await dbInterface.getDashboardId(), "admin") || await hasPermission(request_user_id, req.body.client_id, "admin"))) {
        respond(res, 403);
        return;
    }

    try {
        await removeUri(req.body.client_id, req.body.redirect_uri);
        respond(res, 200);
    } catch (e) {
        if (typeof e === "number")
            respond(res, e);
        else
            respond(res, 500);
    }
}

async function addUri(client_id, redirect_uri) {
    try {
        let results = await dbInterface.query(`SELECT client_id FROM client WHERE client_id = '${client_id}'`);
        if (results.length === 1)
            await dbInterface.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${client_id}', '${redirect_uri}')`);
        else
            throw 404;
    } catch(e) {
        if (e.code != "ER_DUP_ENTRY") throw e; //Allow adding URIs multiple times
    }
}

async function removeUri(client_id, redirect_uri) {
    await dbInterface.query(`DELETE FROM redirect_uri WHERE client_id = '${client_id}' AND redirect_uri = '${redirect_uri}'`);
}

module.exports = { post, del, addUri, removeUri };