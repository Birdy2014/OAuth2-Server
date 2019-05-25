const ClientMethods = require("./ClientMethods");
var router = require("express").Router();

router.route("/")
    .post(ClientMethods.post)
    .delete(ClientMethods.del);

router.route("/uri"); //TODO

module.exports = router;