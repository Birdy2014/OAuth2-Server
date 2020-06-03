const db = require("../../db");

/**
 * Get all permissions of the user
 * @param {string} user_id 
 * @param {string} [client_id]
 * @returns {Array.string|Array.Object} Permissions
 */
exports.getPermissions = async (user_id, client_id) => {
    let query;
    if (client_id)
        query = `SELECT client_id, permission FROM permissions WHERE user_id = '${user_id}' AND client_id = '${client_id}'`;
    else
        query = `SELECT client_id, permission FROM permissions WHERE user_id = '${user_id}'`;
    let permissionsRaw = await db.query(query);
    let permissions = [];
    for (let i = 0; i < permissionsRaw.length; i++) {
        if (client_id)
            permissions[i] = permissionsRaw[i].permission;
        else
            permissions[i] = {
                client_id: permissionsRaw[i].client_id,
                permission: permissionsRaw[i].permission
            };
    }
    return permissions;
}

exports.addPermission = async (user_id, client_id, permission) => {
    try {
        await db.insert("permissions", { user_id, client_id, permission });
    } catch (e) {
        if (e.code != "ER_DUP_ENTRY") throw e; //Allow adding permission multiple times
    }
}

exports.removePermission = async (user_id, client_id, permission) => {
    await db.query(`DELETE FROM permissions WHERE user_id = '${user_id}' AND permission = '${permission}' AND client_id = '${client_id}'`);
}

exports.hasPermission = async (user_id, client_id, permission) => {
    let permissions = await db.query(`SELECT permission FROM permissions WHERE user_id = '${user_id}' AND client_id = '${client_id}'`);
    for (const permissionObj of permissions) {
        if (permissionObj.permission === permission)
            return true;
    }
    return false;
}
