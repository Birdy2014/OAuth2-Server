const logger = require("../../logger");

module.exports.run = async args => {
    await logger.info("Stopping server");
    process.exit(0);
}