const db = require("../db");
const configReader = require("../configReader");
const { getUserInfo } = require("../api/services/user.service");
const { respond, currentUnixTime, handleError } = require("../api/utils");
const { getPermissions } = require("../api/services/permission.service");
const { getUserAndClientFromRefreshToken, generateAccessToken } = require("../api/services/token.service");

//get information about the current user and client from the access_token, refresh_token, authorization_code or username/password and attach it (including wether the access_token, refresh_token etc was send) to req
async function getUser(req, res, next) {
    try {
        //user and client
        if ((req.header("Authorization") && !req.header("Authorization").startsWith("Basic")) || req.body.access_token || req.cookies.access_token) {
            let access_token = req.body.access_token || req.header("Authorization") || req.cookies.access_token;
            if (access_token.startsWith("Bearer ")) access_token = access_token.substring("Bearer ".length);
            let results = await db.query(`SELECT access_token.user_id AS user_id, access_token.expires AS expires, access_token.client_id AS client_id, client.name AS client_name FROM access_token JOIN client ON access_token.client_id = client.client_id WHERE access_token.access_token = '${access_token}'`);
            if (results.length > 0 && results[0].expires > currentUnixTime()) {
                req.client = { client_id: results[0].client_id, name: results[0].client_name, origin: "access_token" }
                req.user = await getUserInfo(results[0].user_id);
                req.user.permissions = await getPermissions(results[0].user_id, results[0].client_id);
            } else if (!req.cookies.refresh_token) {
                throw { status: 403, error: "Invalid access_token" };
            }
        }

        if (req.cookies.refresh_token) {
            let refresh_token = req.cookies.refresh_token;
            let { user_id, client_id } = await getUserAndClientFromRefreshToken(refresh_token);
            if (!user_id || !client_id)
                throw { status: 403, error: "Invalid refresh_token" };

            let { access_token, expires } = await generateAccessToken(user_id, client_id);
            res.cookie("access_token", access_token);
            req.user = await getUserInfo(user_id);
        }

        next();
    } catch (e) {
        handleError(res, e);
    }
}

module.exports = getUser;
