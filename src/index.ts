import { ConfigReader } from './ConfigReader';
ConfigReader.load(__dirname + '/../config');
import { Database } from './db/db';
import express from 'express';
import { router as apiRouter } from './api/router';
import { currentUnixTime, respond } from './api/utils';
import { start as startConsole } from './adminConsole/adminConsole';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getUser } from './middleware/getUser';
import { Logger } from './Logger';
import { getLanguage, getLanguages } from './i18n/translationProvider';
import { getAllUsers } from './api/services/user.service';
import { getClients } from './api/services/client.service';
import { ServerError } from './api/utils';
const app = express();

async function main() {
    Logger.init(ConfigReader.config.logpath);

    //create tables if they don't exist
    if (await Database.init(ConfigReader.config.db, ConfigReader.config.url))
        Logger.info("Tables created");

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
                lang: getLanguage(req.acceptsLanguages(getLanguages()))
            });
        }
    });

    app.use("/register", (req: express.Request, res: express.Response) => res.render("register", {
        lang: getLanguage(req.acceptsLanguages(getLanguages()))
    }));

    app.use("/verification", (req: express.Request, res: express.Response) => res.render("verification", {
        lang: getLanguage(req.acceptsLanguages(getLanguages()))
    }));

    app.use("/reset_password", (req: express.Request, res: express.Response) => res.render("reset_password", {
        lang: getLanguage(req.acceptsLanguages(getLanguages()))
    }));

    app.use("/dashboard", async (req: express.Request, res: express.Response) => {
        if (!req.user)
            res.redirect("/authorize");
        else
            res.render("dashboard/template", {
                lang: getLanguage(req.acceptsLanguages(getLanguages())),
                user: req.user,
                user_info: ConfigReader.config.user_info,
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
                locals: { lang: getLanguage(req.acceptsLanguages(getLanguages())) }
            });
        else
            res.send({ status: 404 });
    });

    // Other errors
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err instanceof ServerError) {
            if (err.status == 500)
                Logger.error(err);
            return res.status(err.status).json({ status: err.status, error: err.message });
        }
        Logger.error(err);
        res.status(500).json({ status: 500, error: 'Internal Server Error' });
    });


    //delete old access tokens, run once every day
    setInterval(() => {
        Logger.info("cleaning db...");
        Database.delete('access_token', `expires < ${currentUnixTime()}`);
        Database.delete('refresh_token', `expires < ${currentUnixTime()}`);
        Database.delete('authorization_code', `expires < ${currentUnixTime()}`);
        Logger.info("cleaning complete");
    }, 86400000);

    app.listen(ConfigReader.config.port, async () => {
        await Logger.info("Server listening on 0.0.0.0:" + ConfigReader.config.port);
        startConsole();
    });
}

main().catch(e => Logger.error(e));
