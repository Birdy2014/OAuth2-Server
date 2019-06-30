const mysql = require("mysql");
const util = require("util");
const { generateToken } = require("./api/utils");

class DBInterface {
    static instance;

    constructor(mysqlConfig) {
        if (DBInterface.instance) return DBInterface.instance;

        this.mysqlConfig = mysqlConfig;
        this.connectDB();

        DBInterface.instance = this;
    }

    connectDB() {
        this.connection = mysql.createConnection(this.mysqlConfig);
        this.connection.connect(err => {
            if (err) {
                console.log("Can't connect to the Database");
                process.exit(0);
            }
        });
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

    /**
     * check if all necessary tables and columns exist
     * @returns {boolean}
    */
    async checkDatabase() {
        try {
            await this.query("SELECT * FROM access_token");
            await this.query("SELECT * FROM authorization_code");
            await this.query("SELECT * FROM client");
            await this.query("SELECT * FROM permissions");
            await this.query("SELECT * FROM redirect_uri");
            await this.query("SELECT * FROM refresh_token");
            await this.query("SELECT * FROM user");
            return true;
        } catch (e) {
            if (e.code === "ER_NO_SUCH_TABLE")
                return false;
            else
                throw e;
        }
    }

    /**
     * Creates all the necessary tables of the database
     */
    async initDatabase(dashboard_uri) {
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
                client_id TEXT NOT NULL,
                permission TEXT NOT NULL,
                PRIMARY KEY (user_id(100), client_id(100), permission(100))
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

        //add Dashboard client
        const dashboard_secret = generateToken(12);
        this.query(`INSERT INTO client (client_id, client_secret, name, dev_id) VALUES (UUID(), '${dashboard_secret}', 'Dashboard', '')`);
        if (dashboard_uri) {
            const dashboard_id = await this.getDashboardId();
            this.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${dashboard_id}', '${dashboard_uri}')`);
        }
    }

    async getDashboardId() {
        return (await this.query("SELECT client_id FROM client WHERE name = 'Dashboard'"))[0].client_id;
    }

    //check if client exists and is valid
    async validateClient(client_id, client_secret, redirect_uri) {
        //Normal Client
        if (redirect_uri) {
            let results = await this.query(`SELECT redirect_uri, name FROM redirect_uri JOIN client ON redirect_uri.client_id = client.client_id WHERE redirect_uri.client_id = '${client_id}'`);
            for (const item of results) {
                if (redirect_uri.startsWith(item.redirect_uri)) {
                    return item.name;
                }
            }
            return false;
        } else if (client_secret) {
            let results = await this.query(`SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}'`);
            return results.length === 1 ? results[0].name : false;
        }
    }
}

module.exports = DBInterface;