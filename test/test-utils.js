const fs = require("fs");
const configReader = require("../src/configReader");
configReader.load(__dirname + "/config");
const db = require("../src/db");

exports.setup = (done) => {
    (async () => {
        await db.init(configReader.config.db, configReader.config.url);
        let dashboard_id = await db.getDashboardId();
        return { dashboard_id };
    })().then((value) => done(value));
}

exports.cleanup = () => {
    db.connection.close();
    fs.unlinkSync(configReader.config.db.path);
}
