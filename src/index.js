const configReader = require("./configReader");
configReader.load(__dirname + "/../config");
const db = require("./db");
const express = require("express");
const es6Renderer = require('express-es6-template-engine');
const apiRouter = require("./api/router");
const { currentUnixTime, respond } = require("./api/utils");
const adminConsole = require("./adminConsole/adminConsole");
const cors = require("cors");
const getUser = require("./middleware/getUser");
const logger = require("./logger");
const translationProvider = require("./i18n/translationProvider");
var app = express();

async function main() {
    logger.init(configReader.config.logpath);

    //create tables if they don't exist
    if (await db.init(configReader.config.db, configReader.config.url))
        logger.info("Tables created");

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(getUser);
    app.engine("html", es6Renderer);
    app.set("views", __dirname + "/views");
    app.set("view engine", "html");

    //Frontend
    app.use("/authorize", (req, res) => res.render("authorization", {
        locals: { lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages())) }
    }));
    app.use("/register", (req, res) => res.render("register", {
        locals: { lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages())) }
    }));
    app.use("/verification", (req, res) => res.render("verification", {
        locals: { lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages())) }
    }));
    app.use("/reset_password", (req, res) => res.render("reset_password", {
        locals: { lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages())) }
    }));
    app.use("/dashboard", (req, res) => res.render("dashboard/template", {
        partials: {
            clients: "dashboard/clients",
            settings: "dashboard/settings",
            admin_settings: "dashboard/admin_settings"
        },
        locals: {
            lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
        }
    }));

    //Backend
    app.use("/api", apiRouter);
    app.get("/api/dashboard_id", async (req, res) => {
        let client_id = (await db.query("SELECT client_id FROM client WHERE name = 'Dashboard'"))[0].client_id;
        respond(res, 200, { client_id: client_id });
    });

    //assets
    app.use("/", express.static(__dirname + "/public"));

    //404
    app.use((req, res) => {
        res.status(404);
        if (req.accepts('html'))
            res.render("404", {
                locals: { lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages())) }
            });
        else
            res.send({ status: 404 });
    });

    //delete old access tokens, run once every day
    setInterval(() => {
        logger.info("cleaning db...");
        db.query(`DELETE FROM access_token WHERE expires < ${currentUnixTime()}`);
        db.query(`DELETE FROM refresh_token WHERE expires < ${currentUnixTime()}`);
        db.query(`DELETE FROM authorization_code WHERE expires < ${currentUnixTime()}`);
        logger.info("cleaning complete");
    }, 86400000);

    app.listen(configReader.config.port, async () => {
        await logger.info("Server listening on 0.0.0.0:" + configReader.config.port);
        adminConsole.start();
    });
}

main().catch(e => logger.error(e));