const authorization = require("./controllers/authorization.controller");
const client = require("./controllers/client.controller");
const uri = require("./controllers/uri.controller");
const permission = require("./controllers/permission.controller");
const token = require("./controllers/token.controller");
const user = require("./controllers/user.controller");
const verification = require("./controllers/verification.controller");
const isLoggedIn = require("../middleware/isLoggedIn");
const router = require("express").Router();
const { wrapRoute } = require("./utils");

router.route("/authorize")
    .post(wrapRoute(authorization.post));

router.route("/client")
    .get(isLoggedIn, wrapRoute(client.get))
    .post(isLoggedIn, wrapRoute(client.post))
    .delete(isLoggedIn, wrapRoute(client.del));

router.route("/client/uri")
    .post(isLoggedIn, wrapRoute(uri.post))
    .delete(isLoggedIn, wrapRoute(uri.del));

router.route("/permissions")
    .get(isLoggedIn, wrapRoute(permission.get))
    .post(isLoggedIn, wrapRoute(permission.post))
    .delete(isLoggedIn, wrapRoute(permission.del));

router.route("/token")
    .post(wrapRoute(token.token))
    .delete(wrapRoute(token.revoke));

router.route("/token_info")
    .post(wrapRoute(token.tokenInfo));

router.route("/user")
    .get(isLoggedIn, wrapRoute(user.get))
    .post(wrapRoute(user.post))
    .put(wrapRoute(user.put))
    .delete(wrapRoute(user.del));

router.route("/verification")
    .post(wrapRoute(verification.post))
    .put(wrapRoute(verification.put));

module.exports = router;
