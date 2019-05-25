const ClientMethods = require("./ClientMethods");
const UriMethods = require("./UriMethods");
var router = require("express").Router();

router.route("/")
    .post(ClientMethods.post)
    .delete(ClientMethods.del);

router.route("/uri")
    .post(UriMethods.post)
    .delete(UriMethods.del);

module.exports = router;