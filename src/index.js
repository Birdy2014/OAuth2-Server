const configReader = require("./configReader");
configReader.load(__dirname + "/../config");
const db = require("./db");
const express = require("express");
const apiRouter = require("./api/router");
const { currentUnixTime, respond } = require("./api/utils");
const adminConsole = require("./adminConsole/adminConsole");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const getUser = require("./middleware/getUser");
const logger = require("./logger");
const translationProvider = require("./i18n/translationProvider");
const { createAuthorizationCode } = require("./api/services/authorization.service");
const { getAllUsers } = require("./api/services/user.service");
const { getClients } = require("./api/services/client.service");
var app = express();

async function main() {
    logger.init(configReader.config.logpath);

    //create tables if they don't exist
    if (await db.init(configReader.config.db, configReader.config.url))
        logger.info("Tables created");

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(getUser);
    app.set("views", __dirname + "/views");
    app.set("view engine", "pug");

    //Frontend
    app.use("/authorize", async (req, res) => {
        if (req.user && req.body.redirect_uri && req.body.client_id && req.body.code_challenge) {
            let authorization_code = await createAuthorizationCode(req.body.client_id, req.user.user_id, req.body.code_challenge);
            res.redirect(`${req.body.redirect_uri}${req.body.redirect_uri.includes("?") ? "&" : "?"}authorization_code=${authorization_code}${req.body.state ? "&state=" + req.body.state : ""}`);
        } else if (req.user) {
            res.redirect("/dashboard");
        } else {
            res.render("authorization", {
                lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
            });
        }
    });
    app.use("/register", (req, res) => res.render("register", {
        lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
    }));
    app.use("/verification", (req, res) => res.render("verification", {
        lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
    }));
    app.use("/reset_password", (req, res) => res.render("reset_password", {
        lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
    }));
    app.use("/dashboard", async (req, res) => {
        if (!req.user)
            res.redirect("/authorize");
        else
            res.render("dashboard/template", {
                lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages())),
                user: req.user,
                user_info: configReader.config.user_info,
                all_users: req.user.admin ? await getAllUsers() : [],
                all_clients: req.user.admin ? await getClients() : []
            });
    });

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
