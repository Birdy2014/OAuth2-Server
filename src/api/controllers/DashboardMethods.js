const { respond, handleError } = require("../utils");
const configReader = require("../../configReader");

function get(req, res) {
    try {
        if (req.client.name !== "Dashboard" || req.client.origin !== "access_token")
            throw { status: 400, error: "Invalid arguments" };

        let response = {};
        response.user = req.user;
        delete response.user.origin;
        response.user_info = configReader.config.user_info;
        respond(res, 200, response);
    } catch (e) {
        handleError(res, e);
    }
}

module.exports = { get };