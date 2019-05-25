const PermissionMethods = require("./PermissionMethods");
var router = require("express").Router();

router.route("/")
    .get(PermissionMethods.get)
    .post(PermissionMethods.post)
    .delete(PermissionMethods.del);

module.exports = router;