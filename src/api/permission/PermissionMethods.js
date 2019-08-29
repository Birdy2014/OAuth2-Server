const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();
const { respond, handleError } = require("../utils");

async function get(req, res) {
    try {
        if (req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        //Only Admin or the user
        if (!(req.user.admin || await hasPermission(request_user_id, await dbInterface.getDashboardId(), "admin") || await hasPermission(request_user_id, req.query.client_id, "admin")))
            throw { status: 403, error: "Insufficient permissions" };

        //Get permissions
        respond(res, 200, await getPermissions(req.query.user_id || req.user.user_id, req.query.client_id));
    } catch (e) {
        handleError(res, e);
    }

}

async function post(req, res) {
    try {
        if (req.user.origin !== "access_token" || req.client.name !== "Dashboard" || !req.body.user_id || !req.body.client_id || !req.body.permission)
            throw { status: 400, error: "Invalid arguments" };

        //Only Admin
        if (!(req.user.admin || await hasPermission(request_user_id, req.body.client_id, "admin")))
            throw { status: 403, error: "Insufficient permissions" };

        //Add permission
        await addPermission(req.body.user_id, req.body.client_id, req.body.permission);
        respond(res, 201);
    } catch (e) {
        handleError(res, e);
    }
}

async function del(req, res) {
    try {
        if (req.user.origin !== "access_token" || req.client.name !== "Dashboard" || !req.body.permission || !req.body.client_id)
            throw { status: 400, error: "Invalid arguments" };

        //Only Admin or the user
        if (!(!req.body.user_id || req.user.user_id === req.body.user_id || req.user.admin || await hasPermission(request_user_id, req.body.client_id, "admin")))
            throw { status: 403, error: "Insufficient permissions" };

        //Delete permission
        await removePermission(req.body.user_id || req.user.user_id, req.body.client_id, req.body.permission);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
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

module.exports = { get, post, del, addPermission, removePermission, getPermissions, hasPermission };