const { respond, handleError } = require("../utils");
const { createAuthorizationCode } = require("../services/authorization.service");
const { getUserFromLoginPassword } = require("../services/user.service");
const { getClientFromRedirectUri } = require("../services/client.service");

exports.post = async (req, res) => {
    try {
        if (!req.body.client_id || !req.body.redirect_uri || !req.body.login || !req.body.password || !req.body.code_challenge)
            throw { status: 400, error: "Invalid arguments" };

        let user = await getUserFromLoginPassword(req.body.login, req.body.password);
        let client = await getClientFromRedirectUri(req.body.client_id, req.body.redirect_uri);

        if (!(user.verified || client.name === "Dashboard"))
            throw { status: 400, error: "Email not verified" };

        let authorization_code = await createAuthorizationCode(client.client_id, user.user_id, req.body.code_challenge);
        respond(res, 201, { authorization_code: authorization_code });
    } catch (e) {
        handleError(res, e);
    }
}
