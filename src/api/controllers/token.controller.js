const tokenService = require("../services/token.service");
const { respond, handleError } = require("../utils");
const db = require("../../db");
const { getUserAndClientFromAuthorizationCode, checkPKCE } = require("../services/authorization.service");
const { checkClientCredentials, getClientFromSecret } = require("../services/client.service");
const { getUserFromAccessToken } = require("../services/user.service");
const { getPermissions } = require("../services/permission.service");

exports.tokenInfo = async (req, res) => {
    try {
        if (!(req.header("Authorization") || (req.body.client_id && req.body.client_secret)) || !req.body.access_token)
            throw { status: 400, error: "Invalid arguments" };

        let client_id, client_secret;
        if (req.header("Authorization")) {
            let access_token_raw = req.header("Authorization");
            if (access_token_raw.startsWith("Basic "))
                access_token_raw = access_token_raw.substring("Basic ".length);
            [client_id, client_secret] = Buffer.from(access_token_raw, "base64").toString().split(":");
        } else {
            client_id = req.body.client_id;
            client_secret = req.body.client_secret;
        }
        let client = await getClientFromSecret(client_id, client_secret);
        let user = await getUserFromAccessToken(req.body.access_token);
        if (client.client_id !== user.client_id)
            throw { status: 403, error: "Invalid access_token" };
        user.permissions = await getPermissions(user.user_id, client_id);
        user.access_token = undefined;
        user.active = true;
        respond(res, 200, user);
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
