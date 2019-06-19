const TokenMethods = require("./TokenMethods");
var router = require("express").Router();

router.route("/")
    .post(TokenMethods.token)
    .delete(TokenMethods.revoke);

module.exports = router;