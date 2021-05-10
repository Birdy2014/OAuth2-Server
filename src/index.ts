import { ConfigReader } from './ConfigReader';
import { Database } from './db/Database';
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
import { Token } from './api/services/Token';
import { Client } from './api/services/Client';
const app = express();

async function main() {
    let args = {
        'config': __dirname + '/../config'
    }

    const argv = process.argv.slice(2);
    for (const arg of argv) {
        if (arg.startsWith('--')) {
            const equalpos = arg.indexOf('=');
            if (equalpos > 0)
                args[arg.substring(2, equalpos)] = arg.substring(equalpos + 1);
        }
    }

    ConfigReader.load(args.config);
    Logger.init(ConfigReader.config.logpath);

    //create tables if they don't exist
    if (await Database.init(ConfigReader.config.url))
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
            let token = await Token.create(req.token.user, await Client.fromIdUri(req.query.client_id as string, req.query.redirect_uri as string))
            let authorization_code = await token.createAuthorizationCode(req.query.code_challenge as string);
            res.redirect(`${req.query.redirect_uri}${(req.query.redirect_uri as string).includes("?") ? "&" : "?"}authorization_code=${authorization_code.token}${req.query.state ? "&state=" + req.query.state : ""}`);
        } else if (req.user) {
            res.redirect("/dashboard");
        } else {
            res.render("misc/authorization", {
                lang: getLanguage(req.acceptsLanguages(getLanguages())),
                email: ConfigReader.config.email.enabled,
                custom: ConfigReader.config.custom,
                enableRegistration: ConfigReader.config.enableRegistration
            });
        }
    });

    app.use("/register", (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!ConfigReader.config.enableRegistration)
            return next();
        res.render("misc/register", {
            lang: getLanguage(req.acceptsLanguages(getLanguages())),
            custom: ConfigReader.config.custom
        });
    });

    app.use("/verification", (req: express.Request, res: express.Response) => res.render("misc/verification", {
        lang: getLanguage(req.acceptsLanguages(getLanguages())),
        custom: ConfigReader.config.custom
    }));

    app.use("/reset_password", (req: express.Request, res: express.Response) => res.render("misc/reset_password", {
        lang: getLanguage(req.acceptsLanguages(getLanguages())),
        custom: ConfigReader.config.custom
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
                all_clients: req.user.admin ? await getClients() : [],
                custom: ConfigReader.config.custom
            });
    });

    //Backend
    app.use("/api", apiRouter);
    app.get("/api/dashboard_id", (req: express.Request, res: express.Response) => {
        respond(res, 200, { client_id: Database.dashboard_id });
    });

    //assets
    app.use("/", express.static(__dirname + "/public"));

    // robots.txt
    app.get("/robots.txt", (req: express.Request, res: express.Response) => {
        res.status(200).type('text/plain').send("User-agent: *\nDisallow: /\n");
    });

    //404
    app.use((req: express.Request, res: express.Response) => {
        throw new ServerError(404, 'Not found');
    });

    // Other errors
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        let error: ServerError;
        if (err instanceof ServerError)
            error = err;
        else
            error = new ServerError(500, 'Internal Server Error');

        if (error.status == 500)
            Logger.error(err); // Log the old error object
        if (req.accepts([ 'json', 'html' ]) === 'json')
            return res.status(error.status).json({ status: error.status, error: error.message });
        else
            return res.status(error.status).render('misc/error', {
                status: error.status,
                message: error.message,
                lang: getLanguage(req.acceptsLanguages(getLanguages())),
                custom: ConfigReader.config.custom
            });
    });


    //delete old access tokens, run once every day
    setInterval(() => {
        Logger.info("cleaning db...");
        Database.query(`DELETE FROM access_token WHERE expires < ${currentUnixTime()}`);
        Database.query(`DELETE FROM refresh_token WHERE expires < ${currentUnixTime()}`);
        Database.query(`DELETE FROM authorization_code WHERE expires < ${currentUnixTime()}`);
        Logger.info("cleaning complete");
    }, 86400000);

    app.listen(ConfigReader.config.port, async () => {
        await Logger.info("Server listening on 0.0.0.0:" + ConfigReader.config.port);
        startConsole();
    });
}

main().catch(e => Logger.error(e));
