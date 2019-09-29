const readlineSync = require('readline-sync');
const fs = require("fs");
const { resolve } = require("path");
const nodemailer = require("nodemailer");

exports.load = (path = __dirname + "/../config") => {
    path = resolve(path);

    if (fs.existsSync(path + ".json"))
        exports.config = require(path + ".json");
    else
        generateConfig(path + ".json");

    exports.transporter = nodemailer.createTransport({
        host: exports.config.email.host,
        port: exports.config.email.port,
        secure: exports.config.email.secure, //only for SSL
        auth: {
            user: exports.config.email.username,
            pass: exports.config.email.password
        }
    });
}

function generateConfig(path) {
    let config = { db: {}, emailWhitelist: [], email: {}, user_info: {} };

    console.log("db config");
    let dbconf = () => {
        config.db.dbms = readlineSync.question("Which Database do you want to use? [mysql/sqlite]");
        if (config.db.dbms === "mysql") {
            config.db.host = readlineSync.question("host: ");
            config.db.user = readlineSync.question("username: ");
            config.db.password = readlineSync.question("password: ");
            config.db.database = readlineSync.question("database name: ");
            return true;
        } else if (config.db.dbms === "sqlite") {
            config.db.path = readlineSync.question("path: ");
            return true;
        } else {
            return false;
        }
    }
    while (!dbconf()) { }
    console.log("\nServer config");
    config.port = readlineSync.question("port [3000]: ") || 3000;
    config.accessTokenExpirationTime = readlineSync.question("Time until the access tokens expire in seconds [3600]: ") || 3600;
    config.refreshTokenExpirationTime = readlineSync.question("Time until the refresh tokens expire in seconds [2592000]: ") || 2592000;
    config.authorizationCodeExpirationTime = readlineSync.question("Time until the authorization codes expire in seconds [86400]: ") || 86400;
    config.accessTokenLength = readlineSync.question("Length of the access tokens [40]: ") || 40;
    config.refreshTokenLength = readlineSync.question("Length of the refresh tokens [40]: ") || 40;
    let emails = readlineSync.question("email address domains on whitelist separated by commas [empty]: ") || "";
    config.emailWhitelist = emails.split(",");
    config.url = readlineSync.question("url of the Server (e.g. https://example.com/oauth): ");
    console.log("\nEmail config");
    let emailEnabled = readlineSync.question("Do you want to send email address verification emails? [y/n] ");
    if (emailEnabled.toLowerCase() === "y") {
        config.email.enabled = true;
        config.email.from = readlineSync.question("from which email address do you want to send the emails? ");
        config.email.host = readlineSync.question("SMTP Server address: ");
        config.email.port = readlineSync.question("SMTP Server port: ");
        config.email.ssl = readlineSync.question("Does the server use SSL (Not STARTTLS)? [y/n] ").toLocaleLowerCase() == "y";
        config.email.username = readlineSync.question("SMTP username: ");
        config.email.password = readlineSync.question("password: ");
        config.email.name = readlineSync.question("Display name: ");
    } else {
        config.email.enabled = false;
    }

    let ok = readlineSync.question(JSON.stringify(config, null, 4) + "\nShould this config be saved? [y/n] ");

    if (ok.toLowerCase() === "y") {
        fs.writeFileSync(path, JSON.stringify(config, null, 4));
        exports.config = config;
    } else {
        generateConfig(path);
    }
}