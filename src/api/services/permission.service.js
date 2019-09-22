const dbInterface = new (require("../../DBInterface"))();

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

module.exports = { addPermission, removePermission, getPermissions, hasPermission };