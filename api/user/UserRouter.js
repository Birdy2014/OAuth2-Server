const UserMethods = require("./UserMethods");
var router = require("express").Router();

router.route("/")
    .post(UserMethods.post)
    .put(UserMethods.put)
    .delete(UserMethods.del);

module.exports = router;