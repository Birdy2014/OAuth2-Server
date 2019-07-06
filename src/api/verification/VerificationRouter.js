const VerificationMethods = require("./VerificationMethods");
var router = require("express").Router();

router.route("/")
    .post(VerificationMethods.post)

module.exports = router;