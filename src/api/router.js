const AuthMethods = require("./controllers/AuthMethods");
const ClientMethods = require("./controllers/ClientMethods");
const UriMethods = require("./controllers/UriMethods");
const PermissionMethods = require("./controllers/PermissionMethods");
const TokenMethods = require("./controllers/TokenMethods");
const UserMethods = require("./controllers/UserMethods");
const VerificationMethods = require("./controllers/VerificationMethods");
const DashboardMethods = require("./controllers/DashboardMethods");
const isLoggedIn = require("../middleware/isLoggedIn");
const router = require("express").Router();

router.route("/authorize")
    .post(isLoggedIn, AuthMethods.post);

router.route("/client")
    .get(isLoggedIn, ClientMethods.get)
    .post(isLoggedIn, ClientMethods.post)
    .delete(isLoggedIn, ClientMethods.del);

router.route("/client/uri")
    .post(isLoggedIn, UriMethods.post)
    .delete(isLoggedIn, UriMethods.del);

router.route("/permissions")
    .get(isLoggedIn, PermissionMethods.get)
    .post(isLoggedIn, PermissionMethods.post)
    .delete(isLoggedIn, PermissionMethods.del);

router.route("/token")
    .post(isLoggedIn, TokenMethods.token)
    .delete(isLoggedIn, TokenMethods.revoke);

router.route("/token_info")
    .post(TokenMethods.tokenInfo);

router.route("/user")
    .get(isLoggedIn, UserMethods.get)
    .post(UserMethods.post)
    .put(UserMethods.put)
    .delete(UserMethods.del);

router.route("/verification")
    .post(VerificationMethods.post)
    .put(VerificationMethods.put);

router.route("/dashboard")
    .get(isLoggedIn, DashboardMethods.get);

module.exports = router;