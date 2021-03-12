const configReader = require("./configReader");
configReader.load(__dirname + "/../config");
const { Database } = require("./db/db");
import express from 'express';
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
import { ServerError } from './api/utils';
var app = express();

async function main() {
    logger.init(configReader.config.logpath);

    //create tables if they don't exist
    if (await Database.init(configReader.config.db, configReader.config.url))
        logger.info("Tables created");

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(getUser);
    app.set("views", __dirname + "/views");
    app.set("view engine", "pug");

    //Frontend
    app.use("/authorize", async (req: express.Request, res: express.Response) => {
        if (req.token && req.query.redirect_uri && req.query.client_id && req.query.code_challenge) {
            let authorization_code = await req.token.createAuthorizationCode(req.query.code_challenge as string);
            res.redirect(`${req.query.redirect_uri}${(req.query.redirect_uri as string).includes("?") ? "&" : "?"}authorization_code=${authorization_code}${req.query.state ? "&state=" + req.query.state : ""}`);
        } else if (req.user) {
            res.redirect("/dashboard");
        } else {
            res.render("authorization", {
                lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
            });
        }
    });
    app.use("/register", (req: express.Request, res: express.Response) => res.render("register", {
        lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
    }));
    app.use("/verification", (req: express.Request, res: express.Response) => res.render("verification", {
        lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
    }));
    app.use("/reset_password", (req: express.Request, res: express.Response) => res.render("reset_password", {
        lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages()))
    }));
    app.use("/dashboard", async (req: express.Request, res: express.Response) => {
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
    app.get("/api/dashboard_id", (req: express.Request, res: express.Response) => {
        respond(res, 200, { client_id: Database.dashboard_id });
    });

    //assets
    app.use("/", express.static(__dirname + "/public"));

    //404
    app.use((req: express.Request, res: express.Response) => {
        res.status(404);
        if (req.accepts('html'))
            res.render("404", {
                locals: { lang: translationProvider.getLanguage(req.acceptsLanguages(translationProvider.getLanguages())) }
            });
        else
            res.send({ status: 404 });
    });

    // Other errors
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err instanceof ServerError)
            return res.status(err.status).json({ status: err.status, error: err.message });
        res.status(500).json({ status: 500, error: 'Internal Server Error' });
    });


    //delete old access tokens, run once every day
    setInterval(() => {
        logger.info("cleaning db...");
        Database.delete('access_token', `expires < ${currentUnixTime()}`);
        Database.delete('refresh_token', `expires < ${currentUnixTime()}`);
        Database.delete('authorization_code', `expires < ${currentUnixTime()}`);
        logger.info("cleaning complete");
    }, 86400000);

    app.listen(configReader.config.port, async () => {
        await logger.info("Server listening on 0.0.0.0:" + configReader.config.port);
        adminConsole.start();
    });
}

main().catch(e => logger.error(e));
