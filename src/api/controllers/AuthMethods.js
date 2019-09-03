const { respond, handleError } = require("../utils");
const { createAuthorizationCode } = require("../services/authorization.service");

async function post(req, res) {
    try {
        if (!req.client || req.client.origin !== "redirect_uri" || req.user.origin !== "basic")
            throw { status: 400, error: "Invalid arguments" };

        let authorization_code = await createAuthorizationCode(req.body.client_id, req.user.user_id);
        respond(res, 201, { authorization_code: authorization_code });
    } catch (e) {
        handleError(res, e);
    }
}

module.exports = { post: post };