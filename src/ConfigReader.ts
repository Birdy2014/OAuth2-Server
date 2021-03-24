import readlineSync from 'readline-sync';
import fs from 'fs';
import { resolve } from 'path';
import nodemailer from 'nodemailer';

export interface Config {
    url: string,
    port: number,
    language: string,
    logpath: string,
    accessTokenExpirationTime: number,
    refreshTokenExpirationTime: number,
    authorizationCodeExpirationTime: number,
    accessTokenLength: number,
    refreshTokenLength: number,
    db: {
        dbms: string,
        path: string,
        host: string,
        user: string,
        password: string,
        database: string,
    },
    email: {
        enabled: boolean,
        from: string,
        host: string,
        port: number,
        ssl: boolean,
        username: string,
        password: string,
        name: string
    },
    emailWhitelist: string[],
    user_info: any
}

export class ConfigReader {
    public static config: Config;
    public static transporter: any;

    public static load(path: string = __dirname + "/../config") {
        path = resolve(path);

        if (fs.existsSync(path + ".json"))
            ConfigReader.config = require(path + ".json");
        else
            ConfigReader.generateConfig(path + ".json");

        ConfigReader.transporter = nodemailer.createTransport({
            host: ConfigReader.config.email.host,
            port: ConfigReader.config.email.port,
            secure: ConfigReader.config.email.ssl, //only for SSL
            auth: {
                user: ConfigReader.config.email.username,
                pass: ConfigReader.config.email.password
            }
        });
    }

    public static generateConfig(path: string) {
        let config: Config = {
            url: "",
            port: 3000,
            language: "en",
            logpath: "./logs",
            accessTokenExpirationTime: 604800,
            refreshTokenExpirationTime: 2592000,
            authorizationCodeExpirationTime: 600,
            accessTokenLength: 50,
            refreshTokenLength: 50,
            db: {
                dbms: "sqlite",
                path: "",
                host: "",
                user: "",
                password: "",
                database: ""
            },
            email: {
                enabled: false,
                from: "",
                host: "",
                port: 587,
                ssl: false,
                username: "",
                password: "",
                name: ""
            },
            emailWhitelist: [],
            user_info: {}
        };

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
        let emails = readlineSync.question("email address domains on whitelist separated by commas [empty]: ") || "";
        config.emailWhitelist = emails.split(",");
        config.url = readlineSync.question("url of the Server (e.g. https://example.com/oauth): ");
        config.language = readlineSync.question("default website language [en]: ") || "en";
        console.log("\nEmail config");
        let emailEnabled = readlineSync.question("Do you want to send email address verification emails? [y/n] ");
        if (emailEnabled.toLowerCase() === "y") {
            config.email.enabled = true;
            config.email.from = readlineSync.question("from which email address do you want to send the emails? ");
            config.email.host = readlineSync.question("SMTP Server address: ");
            config.email.port = readlineSync.question("SMTP Server port: ");
            config.email.ssl = readlineSync.question("Does the server use SSL/TLS (Not STARTTLS)? [y/n] ").toLocaleLowerCase() == "y";
            config.email.username = readlineSync.question("SMTP username: ");
            config.email.password = readlineSync.question("password: ");
            config.email.name = readlineSync.question("Display name: ");
        } else {
            config.email.enabled = false;
        }

        let ok = readlineSync.question(JSON.stringify(config, null, 4) + "\nShould this config be saved? [y/n] ");

        if (ok.toLowerCase() === "y") {
            fs.writeFileSync(path, JSON.stringify(config, null, 4));
            ConfigReader.config = config;
        } else {
            ConfigReader.generateConfig(path);
        }
    }
}
