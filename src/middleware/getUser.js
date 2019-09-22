const DBInterface = require("../DBInterface");
const dbInterface = new DBInterface();
const { validateUser } = require("../api/services/user.service");
const { respond, currentUnixTime } = require("../api/utils");
const { getPermissions, hasPermission } = require("../api/services/permission.service");

//get information about the current user and client from the access_token, refresh_token, authorization_code or username/password and attach it (including wether the access_token, refresh_token etc was send) to req
async function getUser(req, res, next) {
    //user and client
    if ((req.header("Authorization") && !req.header("Authorization").startsWith("Basic")) || req.body.access_token) {
        let access_token = req.body.access_token || req.header("Authorization");
        if (access_token.startsWith("Bearer ")) access_token = access_token.substring("Bearer ".length);
        let results = await dbInterface.query(`SELECT access_token.user_id AS user_id, access_token.expires AS expires, user.username AS username, user.email AS email, access_token.client_id AS client_id, client.name AS client_name FROM access_token JOIN user ON access_token.user_id = user.user_id JOIN client ON access_token.client_id = client.client_id WHERE access_token.access_token = '${access_token}'`);
        let active = results.length === 1 && results[0].expires > currentUnixTime();
        if (active) {
            req.client = { client_id: results[0].client_id, name: results[0].client_name, origin: "access_token" }
            req.user = { user_id: results[0].user_id, username: results[0].username, email: results[0].email, permissions: await getPermissions(results[0].user_id, results[0].client_id), admin: await hasPermission(results[0].user_id, await dbInterface.getDashboardId(), "admin"), origin: "access_token" };
        } else {
            respond(res, 403, undefined, "Invalid access_token");
            return;
        }

    } else if (req.body.refresh_token) {
        let refresh_token = req.body.refresh_token;
        let results = await dbInterface.query(`SELECT refresh_token.user_id AS user_id, user.username AS username, user.email AS email, refresh_token.client_id AS client_id, client.name AS client_name FROM refresh_token JOIN user ON refresh_token.user_id = user.user_id JOIN client ON refresh_token.client_id = client.client_id WHERE refresh_token = '${refresh_token}'`);
        if (results.length === 1) {
            req.client = { client_id: results[0].client_id, name: results[0].client_name, origin: "refresh_token" }
            req.user = { user_id: results[0].user_id, username: results[0].username, email: results[0].email, permissions: await getPermissions(results[0].user_id, results[0].client_id), admin: await hasPermission(results[0].user_id, await dbInterface.getDashboardId(), "admin"), origin: "refresh_token" };
        } else {
            respond(res, 403, undefined, "Invalid refresh_token");
            return;
        }

    } else if (req.body.authorization_code) {
        let authorization_code = req.body.authorization_code;
        let results = await dbInterface.query(`SELECT authorization_code.user_id AS user_id, user.username AS username, user.email AS email, authorization_code.client_id AS client_id, client.name AS client_name FROM authorization_code JOIN user ON authorization_code.user_id = user.user_id JOIN client ON authorization_code.client_id = client.client_id WHERE authorization_code = '${authorization_code}'`);
        if (results.length === 1) {
            req.client = { client_id: results[0].client_id, name: results[0].client_name, origin: "authorization_code" }
            req.user = { user_id: results[0].user_id, username: results[0].username, email: results[0].email, permissions: await getPermissions(results[0].user_id, results[0].client_id), admin: await hasPermission(results[0].user_id, await dbInterface.getDashboardId(), "admin"), origin: "authorization_code" };
        } else {
            respond(res, 403, undefined, "Invalid authorization_code");
            return;
        }

    } else if (req.body.login && req.body.password) {
        let user_id = await validateUser(req.body.login, req.body.password);
        if (user_id) {
            let results = await dbInterface.query(`SELECT username, email, verified FROM user WHERE user_id = '${user_id}'`);
            if (results.length === 1)
                req.user = { user_id: user_id, username: results[0].username, email: results[0].email, admin: await hasPermission(results[0].user_id, await dbInterface.getDashboardId(), "admin"), verified: results[0].verified, origin: "basic" }
        } else {
            respond(res, 403, undefined, "Invalid user credentials");
            return;
        }
    }

    //client
    if (req.header("Authorization") && req.header("Authorization").startsWith("Basic")) { //client id and secret
        let [client_id, client_secret] = Buffer.from(req.header("Authorization").substring("Basic ".length), "base64").toString().split(":");
        let name = await dbInterface.validateClient(client_id, client_secret);
        if (name) {
            req.client = { client_id: client_id, name: name, origin: "secret" };
        } else {
            respond(res, 403, undefined, "Invalid client credentials");
            return;
        }
    } else if (req.body.client_id && req.body.redirect_uri) {
        let name = await dbInterface.validateClient(req.body.client_id, undefined, req.body.redirect_uri);
        if (name) {
            req.client = { client_id: req.body.client_id, name: name, origin: "redirect_uri" };
        } else {
            respond(res, 403, undefined, "Invalid client credentials");
            return;
        }
    }

    next();
}

module.exports = getUser;