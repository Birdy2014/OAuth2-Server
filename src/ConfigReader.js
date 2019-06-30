const readlineSync = require('readline-sync');
const { promisify } = require('util');
const fs = require("fs");
const { resolve } = require("path");

class ConfigReader {
    static instance;

    constructor(path = __dirname + "/../config") {
        path = resolve(path);
        if (ConfigReader.instance) return ConfigReader.instance;

        if (fs.existsSync(path + ".json"))
            this.config = require(path + ".json");
        else
            this.generateConfig(path + ".json");

        ConfigReader.instance = this;
    }

    mysqlConfig() {
        return this.config.mysql;
    }

    port() {
        return this.config.port;
    }

    accessTokenLength() {
        return this.config.accessTokenLength;
    }

    refreshTokenLength() {
        return this.config.refreshTokenLength;
    }

    emailWhitelist() {
        return this.config.emailWhitelist;
    }

    /**
     * Get the time it takes until an access token expires in seconds
     */
    accessTokenExpirationTime() {
        return this.config.accessTokenExpirationTime;
    }

    generateConfig(path) {
        let config = {mysql: {}, emailWhitelist: []};

        console.log("Mysql config");
        config.mysql.host = readlineSync.question("host: ");
        config.mysql.user = readlineSync.question("username: ");
        config.mysql.password = readlineSync.question("password: ");
        config.mysql.database = readlineSync.question("database name: ");
        console.log("\nServer config");
        config.port = readlineSync.question("port [3000]: ") || 3000;
        config.accessTokenExpirationTime = readlineSync.question("Time until the access tokens expire in seconds [3600]: ") || 3600;
        config.accessTokenLength = readlineSync.question("Length of the access tokens [40]: ") || 40;
        config.refreshTokenLength = readlineSync.question("Length of the refresh tokens [40]: ") || 40;
        let emails = readlineSync.question("email address domains on whitelist separated by commas [empty]: ") || "";
        config.emailWhitelist = emails.split(",");
        console.log("\nDashboard config");
        this.dashboardDomain = readlineSync.question("Domain of the Dashboard: ");

        let ok = readlineSync.question(JSON.stringify(config, null, 4) + "\nShould this config be saved? [y/n]");

        if (ok.toLowerCase() === "y") {
            fs.writeFileSync(path, JSON.stringify(config, null, 4));
            this.config = config;
        } else {
            this.generateConfig(path);
        }
    }
}

module.exports = ConfigReader;