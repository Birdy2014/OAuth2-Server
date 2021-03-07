const fs = require("fs");
const configReader = require("../src/configReader");
configReader.load(__dirname + "/config");
const logger = require("../src/logger");
const db = require("../src/db/db");

exports.setup = (done) => {
    (async () => {
        logger.init(configReader.config.logpath);
        await db.init(configReader.config.db, configReader.config.url);
        let dashboard_id = await db.getDashboardId();
        return { dashboard_id };
    })().then((value) => done(value));
}

exports.cleanup = () => {
    db.connection.close();
    fs.unlinkSync(configReader.config.db.path);
}
