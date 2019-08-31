const { respond, handleError } = require("../utils");

function get(req, res) {
    try {
        if (req.client.name !== "Dashboard" || req.client.origin !== "access_token")
            throw { status: 400, error: "Invalid arguments" };

        respond(res, 200, {
            user_id: req.user.user_id,
            username: req.user.username,
            email: req.user.email,
            permissions: req.user.permissions,
            admin: req.user.admin
        });
    } catch (e) {
        handleError(res, e);
    }
}

module.exports = { get };