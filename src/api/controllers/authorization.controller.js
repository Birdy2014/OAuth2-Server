const { respond, handleError } = require("../utils");
const { createAuthorizationCode } = require("../services/authorization.service");
const { getUserFromLoginPassword } = require("../services/user.service");
const { getClientFromRedirectUri } = require("../services/client.service");
const { generateRefreshToken } = require("../services/token.service");
const { getDashboardId } = require("../../db/db");

exports.post = async (req, res) => {
    try {
        if (!req.body.login || !req.body.password)
            throw { status: 400, error: "Invalid arguments" };

        let user = await getUserFromLoginPassword(req.body.login, req.body.password);

        let dashboardId = await getDashboardId();
        let dashboardTokens = await generateRefreshToken(user.user_id, dashboardId);
        res.cookie("access_token", dashboardTokens.access_token);
        res.cookie("refresh_token", dashboardTokens.refresh_token);

        if (!req.body.client_id || !req.body.redirect_uri || !req.body.code_challenge)
            return respond(res, 200, { redirect: "/dashboard" });

        let client = await getClientFromRedirectUri(req.body.client_id, req.body.redirect_uri);

        if (!(user.verified || client.name === "Dashboard"))
            throw { status: 400, error: "Email not verified" };

        let authorization_code = await createAuthorizationCode(client.client_id, user.user_id, req.body.code_challenge);
        respond(res, 201, { authorization_code, redirect: `${req.body.redirect_uri}${req.body.redirect_uri.includes("?") ? "&" : "?"}authorization_code=${authorization_code}${req.body.state === null ? "" : "&state=" + req.body.state}` });
    } catch (e) {
        handleError(res, e);
    }
}
