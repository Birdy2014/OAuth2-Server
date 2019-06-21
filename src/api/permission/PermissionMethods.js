const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();
const { validateAccessToken } = require("../token/TokenMethods");
const { requireValues, respond } = require("../utils");

async function get(req, res) {
    if (!requireValues(res, req.header("Authorization"))) return;

    //Only using the Dashboard
    let request_user_id = (await validateAccessToken(req.header("Authorization"), await dbInterface.getDashboardId())).user_id;
    if (!request_user_id) {
        respond(res, 403);
        return;
    }

    //Only Admin or the user
    if (!(request_user_id === req.query.user_id || req.query.user_id === undefined || await hasPermission(request_user_id, await dbInterface.getDashboardId(), "admin") || await hasPermission(request_user_id, req.query.client_id, "admin"))) {
        respond(res, 403);
        return;
    }

    //Get permissions
    try {
        respond(res, 200, await getPermissions(req.query.user_id || request_user_id, req.query.client_id));
    } catch (e) {
        if (typeof e === "number")
            respond(res, e);
        else
            respond(res, 500);
    }

}

async function post(req, res) {
    if (!requireValues(res, req.header("Authorization"), req.body.user_id, req.body.permission, req.body.client_id)) return;

    //Only Admin using the Dashboard
    let request_user_id = (await validateAccessToken(req.header("Authorization"), await dbInterface.getDashboardId())).user_id;
    if (!request_user_id) {
        respond(res, 403);
        return;
    }

    if (!(await hasPermission(request_user_id, await dbInterface.getDashboardId(), "admin") || await hasPermission(request_user_id, req.body.client_id, "admin"))) {
        respond(res, 403);
        return;
    }

    //Add permission
    try {
        await addPermission(req.body.user_id, req.body.client_id, req.body.permission);
        respond(res, 201);
    } catch (e) {
        if (typeof e === "number")
            respond(res, e);
        else
            respond(res, 500);
    }
}

async function del(req, res) {
    if (!requireValues(res, req.header("Authorization"), req.body.permission, req.body.client_id)) return;

    //Only Admin or the user using the Dashboard
    let request_user_id = (await validateAccessToken(req.header("Authorization"), await dbInterface.getDashboardId())).user_id;
    if (!request_user_id) {
        respond(res, 403);
        return;
    }

    if (!(request_user_id === req.body.user_id || await hasPermission(request_user_id, await dbInterface.getDashboardId(), "admin") || await hasPermission(request_user_id, req.body.client_id, "admin"))) {
        respond(res, 403);
        return;
    }

    //Delete permission
    try {
        await removePermission(req.body.user_id || request_user_id, req.body.client_id, req.body.permission);
        respond(res, 200);
    } catch (e) {
        if (typeof e === "number")
            respond(res, e);
        else
            respond(res, 500);
    }
}

/**
 * Get all permissions of the user
 * @param {string} user_id 
 * @param {string} [client_id]
 * @returns {Array.string} Permissions
 */
async function getPermissions(user_id, client_id) {
    let query;
    if (client_id)
        query = `SELECT client_id, permission FROM permissions WHERE user_id = '${user_id}' AND client_id = '${client_id}'`;
    else
        query = `SELECT client_id, permission FROM permissions WHERE user_id = '${user_id}'`;
    let permissionsRaw = await dbInterface.query(query);
    let permissions = [];
    for (let i = 0; i < permissionsRaw.length; i++) {
        permissions[i] = {
            client_id: permissionsRaw[i].client_id,
            permission: permissionsRaw[i].permission
        };
    }
    return permissions;
}

async function addPermission(user_id, client_id, permission) {
    try {
        await dbInterface.query(`INSERT INTO permissions (user_id, client_id, permission) VALUES ('${user_id}', '${client_id}', '${permission}')`);
    } catch (e) {
        if (e.code != "ER_DUP_ENTRY") throw e; //Allow adding permission multiple times
    }
}

async function removePermission(user_id, client_id, permission) {
    await dbInterface.query(`DELETE FROM permissions WHERE user_id = '${user_id}' AND permission = '${permission}' AND client_id = '${client_id}'`);
}

async function hasPermission(user_id, client_id, permission) {
    let permissions = await dbInterface.query(`SELECT permission FROM permissions WHERE user_id = '${user_id}' AND client_id = '${client_id}'`);
    for (const permissionObj of permissions) {
        if (permissionObj.permission === permission)
            return true;
    }
    return false;
}

module.exports = { get, post, del, addPermission, removePermission, getPermissions };