const TokenMethods = require("./TokenMethods");
var router = require("express").Router();

router.route("/")
    .post(TokenMethods.tokenInfo);

module.exports = router;