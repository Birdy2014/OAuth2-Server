const tokenService = require("../services/token.service");
const { respond, handleError } = require("../utils");
const db = require("../../db");
const { getUserAndClientFromAuthorizationCode, checkPKCE } = require("../services/authorization.service");
const { checkClientCredentials } = require("../services/client.service");

exports.tokenInfo = async (req, res) => {
    try {
        if (!req.client || req.client.origin !== "secret" || !req.user)
            throw { status: 400, error: "Invalid arguments" };

        let tokenInfoResponse = req.user;
        tokenInfoResponse.active = true;
        tokenInfoResponse.origin = undefined;

        respond(res, 200, tokenInfoResponse);
    } catch (e) {
        handleError(res, e);
    }
}

exports.token = async (req, res) => {
    try {
        switch (req.body.grant_type) {
            case "authorization_code": {
                if (!req.body.code || !req.body.client_id || !req.body.code_verifier)
                    throw { status: 400, error: "Invalid arguments" };

                let { user_id, client_id } = await getUserAndClientFromAuthorizationCode(req.body.code);
                let validClient = await checkPKCE(req.body.code, req.body.code_verifier);
                if (req.body.client_secret)
                    validClient = validClient && (await checkClientCredentials(req.body.client_id, req.body.client_secret));

                if (!validClient || client_id !== req.body.client_id)
                    throw { status: 403, error: "Invalid authorization_code" };

                let response = await tokenService.generateRefreshToken(user_id, client_id);
                respond(res, 201, response);
                break;
            }
            case "refresh_token": {
                if (!req.body.refresh_token || !req.body.client_id)
                    throw { status: 400, error: "Invalid arguments" };

                let { user_id, client_id } = await tokenService.getUserAndClientFromRefreshToken(req.body.refresh_token);
                if (client_id !== req.body.client_id)
                    throw { status: 403, error: "Invalid refresh_token" };

                let response = await tokenService.generateAccessToken(user_id, client_id);
                respond(res, 201, response);
                break;
            }
            default:
                throw { status: 400, error: "Invalid arguments" };
        }
    } catch (e) {
        handleError(res, e);
    }
}

exports.revoke = async (req, res) => {
    try {
        if (!req.body.access_token && !req.body.refresh_token)
            throw { status: 400, error: "Invalid arguments" };

        if (req.body.access_token) //revoke access_token
            await db.query(`DELETE FROM access_token WHERE access_token = '${req.body.access_token}'`);

        if (req.body.refresh_token) //revoke refresh_token
            await db.query(`DELETE FROM refresh_token WHERE refresh_token = '${req.body.refresh_token}'`);

        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}
