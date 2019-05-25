const dbInterface = require("../../DBInterface");
const { validateAccessToken } = require("../token/TokenMethods");
const { requireValues, respond } = require("../utils");
const configReader = require("../../ConfigReader");

async function get(req, res) {
    if (!requireValues(res, req.header("Authorization"), req.body.user_id, req.body.client_id, req.body.client_secret)) return;

    //Dashboard only
    if (!(dbInterface.validateClient(req.body.client_id, req.body.client_secret) && req.body.client_id === configReader.dashboardId())) {
        respond(res, 403);
        return;
    }

    //Only Admin or the user
    let request_user_id = (await validateAccessToken(req.header("Authorization"), req.body.client_id)).user_id;
    if (!request_user_id) {
        respond(res, 403);
        return;
    }

    if (!(request_user_id === user_id || await hasPermission(request_user_id, "admin"))) {
        respond(res, 403);
        return;
    }

    //Get permissions
    try {
        respond(res, 200, await getPermissions(user_id));
    } catch(e) {
        console.log(e);
        respond(res, 500);
    }
}

async function post(req, res) {
    if (!requireValues(res, req.header("Authorization"), req.body.user_id, req.body.permission, req.body.client_id, req.body.client_secret)) return;

    //Dashboard only
    if (!(dbInterface.validateClient(req.body.client_id, req.body.client_secret) && req.body.client_id === configReader.dashboardId())) {
        respond(res, 403);
        return;
    }

    //Only Admin
    let request_user_id = (await validateAccessToken(req.header("Authorization"), req.body.client_id)).user_id;
    if (!request_user_id) {
        respond(res, 403);
        return;
    }

    if (!await hasPermission(request_user_id, "admin")) {
        respond(res, 403);
        return;
    }

    //Add permission
    try {
        await addPermission(user_id, req.body.permission);
    } catch(e) {
        console.log(e);
        respond(res, 500);
    }
}

async function del(req, res) {
    if (!requireValues(res, req.header("Authorization"), req.body.user_id, req.body.permission, req.body.client_id, req.body.client_secret)) return;

    //Dashboard only
    if (!(dbInterface.validateClient(req.body.client_id, req.body.client_secret) && req.body.client_id === configReader.dashboardId())) {
        respond(res, 403);
        return;
    }

    //Only Admin or the user
    let request_user_id = (await validateAccessToken(req.header("Authorization"), req.body.client_id)).user_id;
    if (!request_user_id) {
        respond(res, 403);
        return;
    }

    if (!(request_user_id === user_id || await hasPermission(request_user_id, "admin"))) {
        respond(res, 403);
        return;
    }

    //Delete permission
    try {
        await removePermission(user_id, this.body.permission);
    } catch(e) {
        console.log(e);
        respond(res, 500);
    }
}

/**
 * Get all permissions of the user
 * @param {string} user_id 
 * @returns {Array.string} Permissions
 */
async function getPermissions(user_id) {
    let permissionsRaw = await dbInterface.query(`SELECT permission FROM permissions WHERE user_id = '${user_id}'`);
    let permissions = [];
    for (let i = 0; i < permissionsRaw.length; i++) {
        permissions[i] = permissionsRaw[i].permission;
    }
    return permissions;
}

async function addPermission(user_id, permission) {
    try {
        await dbInterface.query(`INSERT INTO permissions (user_id, permission) VALUES ('${user_id}', '${permission}')`);
    } catch(e) {
        if (e.code != "ER_DUP_ENTRY") throw e; //Allow adding permission multiple times
    }
}

async function removePermission(user_id, permission) {
    await dbInterface.query(`DELETE FROM permissions WHERE user_id = '${user_id}' AND permission = '${permission}'`);
}

async function hasPermission(user_id, permission) {
    let permissions = await dbInterface.query(`SELECT permission FROM permissions WHERE user_id = '${user_id}'`);
    if (permission in permissions)
        return true;
    else
        return false;
}

module.exports = { get, post, del, addPermission, removePermission, getPermissions };