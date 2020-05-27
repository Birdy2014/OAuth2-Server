const authorization = require("./controllers/authorization.controller");
const client = require("./controllers/client.controller");
const uri = require("./controllers/uri.controller");
const permission = require("./controllers/permission.controller");
const token = require("./controllers/token.controller");
const user = require("./controllers/user.controller");
const verification = require("./controllers/verification.controller");
const dashboard = require("./controllers/dashboard.controller");
const isLoggedIn = require("../middleware/isLoggedIn");
const router = require("express").Router();

router.route("/authorize")
    .post(authorization.post);

router.route("/client")
    .get(isLoggedIn, client.get)
    .post(isLoggedIn, client.post)
    .delete(isLoggedIn, client.del);

router.route("/client/uri")
    .post(isLoggedIn, uri.post)
    .delete(isLoggedIn, uri.del);

router.route("/permissions")
    .get(isLoggedIn, permission.get)
    .post(isLoggedIn, permission.post)
    .delete(isLoggedIn, permission.del);

router.route("/token")
    .post(token.token)
    .delete(token.revoke);

router.route("/token_info")
    .post(token.tokenInfo);

router.route("/user")
    .get(isLoggedIn, user.get)
    .post(user.post)
    .put(user.put)
    .delete(user.del);

router.route("/verification")
    .post(verification.post)
    .put(verification.put);

router.route("/dashboard")
    .get(isLoggedIn, dashboard.get);

module.exports = router;