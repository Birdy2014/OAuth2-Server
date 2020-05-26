const { respond, handleError } = require("../utils");
const { createAuthorizationCode } = require("../services/authorization.service");

exports.post = async (req, res) => {
    try {
        if (!req.client || req.client.origin !== "redirect_uri" || req.user.origin !== "basic" || !req.body.code_challenge)
            throw { status: 400, error: "Invalid arguments" };

        if (!(req.user.verified || req.client.name === "Dashboard"))
            throw { status: 400, error: "Email not verified" };

        let authorization_code = await createAuthorizationCode(req.body.client_id, req.user.user_id, req.body.code_challenge);
        respond(res, 201, { authorization_code: authorization_code });
    } catch (e) {
        handleError(res, e);
    }
}
