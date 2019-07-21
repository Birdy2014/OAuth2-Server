const { respond } = require("../api/utils");

//call next only if the user is logged in using the access_token
function isLoggedIn(req, res, next) {
    if (req.user !== undefined)
        next();
    else 
        respond(res, 403, undefined, "Unauthorized");
}

module.exports = isLoggedIn;