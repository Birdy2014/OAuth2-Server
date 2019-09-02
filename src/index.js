const ConfigReader = require("./ConfigReader");
const DBInterface = require("./DBInterface");
const configReader = new ConfigReader(__dirname + "/../config");
const dbInterface = new DBInterface(configReader.mysqlConfig());
const express = require("express");
const es6Renderer = require('express-es6-template-engine');
const apiRouter = require("./api/router");
const { currentUnixTime, respond } = require("./api/utils");
const adminConsole = require("./adminConsole/adminConsole");
const path = require("path");
const cors = require("cors");
const getUser = require("./middleware/getUser");
const isLoggedIn = require("./middleware/isLoggedIn");
var app = express();

async function main() {
    //create tables if they don't exist
    if (!(await dbInterface.checkDatabase())) {
        await dbInterface.initDatabase(configReader.url());
        console.log("Tables created");
    }

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(getUser);
    app.engine("html", es6Renderer);
    app.set("views", __dirname + "/views");
    app.set("view engine", "html");

    //Frontend
    app.use("/authorize", (req, res) => res.render("authorization"));
    app.use("/register", (req, res) => res.render("register"));
    app.use("/verification", (req, res) => res.render("verification"));
    app.use("/reset_password", (req, res) => res.render("reset_password"));
    app.use("/dashboard", (req, res) => res.render("dashboard/template", {
        partials: {
            clients: "dashboard/clients",
            settings: "dashboard/settings"
        }
    }));

    //Backend
    app.use("/api", apiRouter);
    app.get("/api/dashboard_id", async (req, res) => {
        let client_id = (await dbInterface.query("SELECT client_id FROM client WHERE name = 'Dashboard'"))[0].client_id;
        respond(res, 200, { client_id: client_id });
    });

    //assets
    app.use("/", express.static(__dirname + "/public"));

    //404
    app.use((req, res) => {
        res.status(404);
        if (req.accepts('html'))
            res.render("404");
        else
            res.send({ status: 404 });
    });

    //delete old access tokens, run once every day
    setInterval(() => {
        dbInterface.query(`DELETE FROM access_token WHERE expires < ${currentUnixTime()}`);
    }, 86400000);

    app.listen(configReader.port());

    //start console
    adminConsole.start();
}

main().catch(e => console.error(e));