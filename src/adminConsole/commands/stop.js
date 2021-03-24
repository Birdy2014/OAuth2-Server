const { Logger } = require("../../Logger");

module.exports.run = async args => {
    await Logger.info("Stopping server");
    process.exit(0);
}
