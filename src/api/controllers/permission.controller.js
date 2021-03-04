const { addPermission, removePermission, getPermissions, hasPermission } = require("../services/permission.service");
const { respond, handleError } = require("../utils");

exports.get = async (req, res) => {
    try {
        if (req.client.name !== "Dashboard")
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

exports.post = async (req, res) => {
    try {
        if (req.client.name !== "Dashboard" || !req.body.user_id || !req.body.client_id || !req.body.permission)
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

exports.del = async (req, res) => {
    try {
        if (req.client.name !== "Dashboard" || !req.body.permission || !req.body.client_id)
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
