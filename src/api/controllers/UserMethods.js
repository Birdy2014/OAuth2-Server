const { respond, handleError } = require("../utils");
const { createUser, deleteUser, changeUsername, changeEmail, changePassword } = require("../services/user.service");

async function get(req, res) {

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

        if (req.body.username) await changeUsername(req.user.user_id, req.body.username);
        if (req.body.password) await changePassword(req.user.user_id, req.body.password);
        if (req.body.email) await changeEmail(req.user.user_id, req.body.email);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

async function del(req, res) {
    try {
        if (!req.user || req.user.origin !== "access_token" || req.client.name !== "Dashboard")
            throw { status: 400, error: "Invalid arguments" };

        await deleteUser(req.user.user_id);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

module.exports = { post, put, del };