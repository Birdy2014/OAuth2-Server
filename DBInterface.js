const mysql = require("mysql");
const util = require("util");
const configReader = require("./ConfigReader");

class DBInterface {
    constructor(mysqlConfig) {
        if (DBInterface.instance) return DBInterface.instance;

        this.mysqlConfig = mysqlConfig;
        this.connectDB();

        DBInterface.instance = this;
    }

    connectDB() {
        this.connection = mysql.createConnection(this.mysqlConfig);
        this.connection.connect();
        this.query = util.promisify(this.connection.query).bind(this.connection);

        //Reconnect if the connection is closed
        this.connection.on("error", (err) => {
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                this.connectDB();
            } else {
                throw err;
            }
        })
    }

    //check if all necessary tables and columns exist and create them otherwise
    async checkDatabase() {
        //TODO
    }

    /**
     * Creates all the necessary tables of the database
     */
    async initDatabase() {
        //create client table
        await this.query(`
            CREATE TABLE IF NOT EXISTS client(
                client_id TEXT NOT NULL,
                client_secret TEXT NOT NULL,
                name TEXT NOT NULL,
                dev_id TEXT NOT NULL,
                PRIMARY KEY (client_id(100)),
                UNIQUE KEY (name(100))
            ) ENGINE=INNODB
        `);

        //create user table
        await this.query(`
            CREATE TABLE IF NOT EXISTS user(
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                PRIMARY KEY (user_id(100)),
                UNIQUE KEY (email(100))
            ) ENGINE=INNODB
        `);

        //create authorization_code table
        await this.query(`
            CREATE TABLE IF NOT EXISTS authorization_code(
                authorization_code TEXT NOT NULL,
                user_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                PRIMARY KEY (authorization_code(100))
            )
        `);

        //create access_token table
        await this.query(`
            CREATE TABLE IF NOT EXISTS access_token(
                access_token TEXT NOT NULL,
                user_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                expires INT,
                PRIMARY KEY (access_token(100))
            )
        `);

        //create refresh_token table
        await this.query(`
            CREATE TABLE IF NOT EXISTS refresh_token(
                refresh_token TEXT NOT NULL,
                user_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                PRIMARY KEY (refresh_token(100))
            )
        `);

        //create permissions table
        await this.query(`
            CREATE TABLE IF NOT EXISTS permissions(
                user_id TEXT NOT NULL,
                permission TEXT NOT NULL,
                PRIMARY KEY (user_id(100), permission(100))
            )
        `);

        //create redirect_uri table
        await this.query(`
            CREATE TABLE IF NOT EXISTS redirect_uri(
                client_id TEXT NOT NULL,
                redirect_uri TEXT NOT NULL,
                PRIMARY KEY (client_id(100), redirect_uri(100))
            )
        `);
    }

    //check if client exists and is valid
    async validateClient(client_id, client_secret, redirect_uri) {
        //Dashboard
        if (client_id === configReader.dashboardId && (client_secret === configReader.dashboardSecret || redirect_uri === configReader.dashboardUri)) return true;

        //Normal Client
        if (redirect_uri) {
            let results = await this.query(`SELECT * FROM redirect_uri WHERE client_id = '${client_id}'`);
            for (const item of results) {
                if (redirect_uri.startsWith(item.redirect_uri)) {
                    return true;
                }
            }
            return false;
        } else if (client_secret) {
            return (await this.query(`SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}'`)).length === 1;
        }
    }
}

module.exports = new DBInterface(require("./ConfigReader").mysqlConfig());