const AuthMethods = require("./AuthMethods");
var router = require("express").Router();

router.route("/")
    .post(AuthMethods.post);

module.exports = router;