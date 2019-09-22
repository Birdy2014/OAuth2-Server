const { respond, handleError } = require("../utils");
const { createUser, deleteUser, changeUsername, changeEmail, changePassword, getAllUsers, setValues } = require("../services/user.service");
const configReader = new (require("../../ConfigReader"))();

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

        let user_info = {};
        for (const key in req.body) {
            if (configReader.config.user_info.hasOwnProperty(key))
                user_info[key] = req.body[key];
        }
        let user_id = await createUser(req.body.email, req.body.username, req.body.password, user_info);
        respond(res, 201, { user_id });
    } catch (e) {
        handleError(res, e);
    }
}

async function put(req, res) {
    try {
        if (!req.user || req.user.origin !== "access_token" || req.client.name !== "Dashboard" || req.body.length === 0)
            throw { status: 400, error: "Invalid arguments" };

        let user_id;
        if (req.body.user_id && req.body.user_id !== req.user.user_id && !req.user.admin)
            throw { status: 403, error: "Insufficient permissions" }
        else if (req.body.user_id !== req.user.user_id && req.user.admin)
            user_id = req.body.user_id;
        else
            user_id = req.user.user_id;

        let user_info = {};
        for (const key in req.body) {
            if (configReader.config.user_info.hasOwnProperty(key))
                user_info[key] = req.body[key];
        }

        if (req.body.username) await changeUsername(user_id, req.body.username);
        if (req.body.password) await changePassword(user_id, req.body.password);
        if (req.body.email) await changeEmail(user_id, req.body.email);
        if (user_info !== {}) await setValues(user_id, user_info);
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