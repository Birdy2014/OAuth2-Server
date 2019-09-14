const { respond, handleError } = require("../utils");
const { createUser, deleteUser, changeUsername, changeEmail, changePassword, getAllUsers } = require("../services/user.service");

async function get(req, res) {
    try {
        if (!req.user.admin || req.client.name !== "Dashboard")
            throw { status: 403, error: "Insufficient permissions" };

        let users = await getAllUsers();
        respond(res, 200, users);
    } catch (e) {
        handleError(res, e);
    }
}

async function post(req, res) {
    try {
        if (!req.body.email || !req.body.username || !req.body.password)
            throw { status: 400, error: "Invalid arguments" };

        let user_id = await createUser(req.body.email, req.body.username, req.body.password);
        respond(res, 201, { user_id });
    } catch (e) {
        handleError(res, e);
    }
}

async function put(req, res) {
    try {
        if (!req.user || req.user.origin !== "access_token" || req.client.name !== "Dashboard" || !(req.body.username || req.body.password || req.body.email))
            throw { status: 400, error: "Invalid arguments" };

        let user_id;
        if (req.body.user_id !== req.user.user_id && !req.user.admin)
            throw { status: 403, error: "Insufficient permissions" }
        else if (req.body.user_id !== req.user.user_id && req.user.admin)
            user_id = req.body.user_id;
        else
            user_id = req.user.user_id;

        if (req.body.username) await changeUsername(user_id, req.body.username);
        if (req.body.password) await changePassword(user_id, req.body.password);
        if (req.body.email) await changeEmail(user_id, req.body.email);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

async function del(req, res) {
    try {
        if (!req.user || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        let user_id;
        if (req.body.user_id !== undefined && req.body.user_id !== req.user.user_id && !req.user.admin)
            throw { status: 403, error: "Insufficient permissions" }
        else if (req.body.user_id !== req.user.user_id && req.user.admin)
            user_id = req.body.user_id;
        else
            user_id = req.user.user_id;

        await deleteUser(user_id);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

module.exports = { get, post, put, del };