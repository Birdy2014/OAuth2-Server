const { respond, handleError } = require("../utils");
const { createUser, deleteUser, changeUsername, changeEmail, changePassword, getAllUsers, setValues, setVerified } = require("../services/user.service");
const { generateRefreshToken } = require("../services/token.service");
const db = require("../../db/db");
const configReader = require("../../configReader");
const { User } = require("../services/User");

exports.get = async (req, res) => {
    try {
        if (!req.user.admin || req.client.name !== "Dashboard")
            throw { status: 403, error: "Insufficient permissions" };

        let users = await getAllUsers();
        respond(res, 200, users);
    } catch (e) {
        handleError(res, e);
    }
}

exports.post = async (req, res) => {
    try {
        if (!req.body.email || !req.body.username || !req.body.password)
            throw { status: 400, error: "Invalid arguments" };

        let user_info = {};
        for (const key in req.body) {
            if (configReader.config.user_info.hasOwnProperty(key))
                user_info[key] = req.body[key];
        }
        let user = await User.create(req.body.username, req.body.email, req.body.password, user_info);
        await user.save();
        let { access_token, refresh_token, expires } = await generateRefreshToken(user.user_id, await db.getDashboardId());
        respond(res, 201, { user_id: user.user_id, access_token, refresh_token, expires });
    } catch (e) {
        handleError(res, e);
    }
}

exports.put = async (req, res) => {
    try {
        if (!req.user || req.client.name !== "Dashboard" || req.body.length === 0)
            throw { status: 400, error: "Invalid arguments" };

        let user_id;
        if (req.body.user_id && req.body.user_id !== req.user.user_id && !req.user.admin)
            throw { status: 403, error: "Insufficient permissions" }
        else if (req.body.user_id && req.body.user_id !== req.user.user_id && req.user.admin)
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
        if (req.body.verified && req.user.admin) await setVerified(user_id, req.body.verified == "true");
        if (user_info !== {}) await setValues(user_id, user_info);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}

exports.del = async (req, res) => {
    try {
        if (!req.user || req.client.name !== "Dashboard")
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
