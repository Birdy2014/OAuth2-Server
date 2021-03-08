const mysql = require("mysql");
const sqlite3 = require("sqlite3");
const util = require("util");
const { generateToken } = require("../api/utils");
const uuid = require("uuid").v4;
const logger = require("../logger");
import { TableRow } from './schemas';

export enum DBErrorType {
    DUPLICATE,
    UNKNOWN
}

export class DBError extends Error {
    public type: DBErrorType;

    constructor(type: DBErrorType, message?: string) {
        if (!message) {
            switch (type) {
                case DBErrorType.DUPLICATE:
                    message = 'Duplicate Entry';
                    break;
                case DBErrorType.UNKNOWN:
                    message = 'Unknown Error';
                    break;
            }
        }
        super(message);
        this.type = type;
        this.name = 'DBError';
    }
}

export class Database {
    static query: any;
    static dashboard_id: string = '';
    static instance: Database;
    static connection: any;

    static async init(config, dashboard_uri) {
        await this.connect(config);
        if (!(await this.checkDatabase(config))) {
            await this.initDatabase(config, dashboard_uri);
            return true;
        } else {
            return false;
        }
    }

    static connect(config) {
        return new Promise((resolve, reject) => {
            logger.info("Connecting to db");
            if (config.dbms === "mysql") {
                this.connection = mysql.createPool(config);
                this.query = util.promisify(this.connection.query).bind(this.connection);
                this.getDashboardId().then(id => this.dashboard_id = id);
                resolve(undefined);
            } else if (config.dbms === "sqlite") {
                this.connection = new sqlite3.Database(config.path);
                this.query = util.promisify(this.connection.all).bind(this.connection);
                this.getDashboardId().then(id => this.dashboard_id = id);
                resolve(undefined);
            } else {
                reject("Invalid dbms");
            }
        });
    }

    /**
     * check if all necessary tables and columns exist
     * @returns {boolean}
    */
    static async checkDatabase(config) {
        try {
            await this.query("SELECT * FROM access_token");
            await this.query("SELECT * FROM authorization_code");
            await this.query("SELECT * FROM client");
            await this.query("SELECT * FROM permissions");
            await this.query("SELECT * FROM redirect_uri");
            await this.query("SELECT * FROM refresh_token");
            await this.query("SELECT * FROM user");
            await this.query("SELECT * FROM verification_code");
            await this.query("SELECT * FROM user_info");
            return true;
        } catch (e) {
            if (config.dbms === "sqlite") return false; //temporary workaround for sqlite
            if (e.code === "ER_NO_SUCH_TABLE")
                return false;
            else
                throw e;
        }
    }

    static async createTable(config, name, columns) {
        let mysql = config.dbms == "mysql";
        let q = `CREATE TABLE IF NOT EXISTS ${name}(`;
        let primary = "";
        let unique = "";
        for (const column of columns) {
            if (column.primary) {
                if (mysql && column.type === "TEXT")
                    primary += `${column.name}(100), `;
                else
                    primary += `${column.name}, `;
            } else if (column.unique) {
                if (mysql && column.type === "TEXT")
                    unique += `${column.name}(100), `;
                else
                    unique += `${column.name}, `;
            }
            q += `${column.name} ${column.type} ${column.options}, `;
        }
        if (primary)
            q += "PRIMARY KEY (" + primary.substring(0, primary.length - 2) + ")" + (unique ? ", " : " ");
        if (unique)
            q += (mysql ? "UNIQUE KEY (" : "UNIQUE (") + unique.substring(0, unique.length - 2) + ") ";
        q += ")";

        await this.query(q);
    }

    /**
     * Creates all the necessary tables of the database
     */
    static async initDatabase(config, dashboard_uri) {
        //create client table
        await this.createTable(config, "client", [
            {
                name: "client_id",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "client_secret",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "name",
                type: "TEXT",
                options: "NOT NULL",
                unique: true
            },
            {
                name: "dev_id",
                type: "TEXT",
                options: "NOT NULL"
            }
        ]);

        //create user table
        await this.createTable(config, "user", [
            {
                name: "user_id",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "username",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "email",
                type: "TEXT",
                options: "NOT NULL",
                unique: true
            },
            {
                name: "password_hash",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "verified",
                type: "BOOLEAN",
                options: "NOT NULL DEFAULT FALSE"
            }
        ]);

        //create authorization_code table
        await this.createTable(config, "authorization_code", [
            {
                name: "authorization_code",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "user_id",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "client_id",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "expires",
                type: "INTEGER",
                options: "NOT NULL"
            },
            {
                name: "challenge",
                type: "TEXT",
                options: "NOT NULL"
            }
        ]);

        //create access_token table
        await this.createTable(config, "access_token", [
            {
                name: "access_token",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "user_id",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "client_id",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "expires",
                type: "INTEGER",
                options: ""
            }
        ]);

        //create refresh_token table
        await this.createTable(config, "refresh_token", [
            {
                name: "refresh_token",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "user_id",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "client_id",
                type: "TEXT",
                options: "NOT NULL"
            },
            {
                name: "expires",
                type: "INTEGER",
                options: "NOT NULL"
            }
        ]);

        //create permissions table
        await this.createTable(config, "permissions", [
            {
                name: "user_id",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "client_id",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "permission",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            }
        ]);

        //create redirect_uri table
        await this.createTable(config, "redirect_uri", [
            {
                name: "client_id",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "redirect_uri",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            }
        ]);

        //create verification_code table for email verification, "email" for new email or empty for for registration
        await this.createTable(config, "verification_code", [
            {
                name: "verification_code",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "user_id",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "email",
                type: "TEXT",
                options: ""
            },
            {
                name: "change_password",
                type: "BOOLEAN",
                options: "NOT NULL DEFAULT FALSE"
            }
        ]);

        //create user_info table for extra user information
        await this.createTable(config, "user_info", [
            {
                name: "user_id",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "name",
                type: "TEXT",
                options: "NOT NULL",
                primary: true
            },
            {
                name: "value",
                type: "TEXT",
                options: "NOT NULL"
            }
        ]);

        //add Dashboard client
        const dashboard_secret = generateToken(12);
        await this.query(`INSERT INTO client (client_id, client_secret, name, dev_id) VALUES ('${uuid()}', '${dashboard_secret}', 'Dashboard', '')`);
        if (dashboard_uri) {
            const dashboard_id = await this.getDashboardId();
            await this.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${dashboard_id}', '${dashboard_uri}')`);
        }
    }

    static async getDashboardId() {
        return (await this.query("SELECT client_id FROM client WHERE name = 'Dashboard'"))[0].client_id;
    }

    static async select<T extends TableRow>(table: string, condition?: string): Promise<T|undefined> {
        let queryStr: string;
        if (condition) queryStr = `SELECT * FROM ${table} WHERE ${condition} LIMIT 1`;
        else queryStr = `SELECT * FROM ${table} LIMIT 1`;
        let row: T[] = await this.query(queryStr);
        if (row.length === 0)
            return undefined;
        return row[0];
    }

    static async selectAll<T extends TableRow>(table: string, condition?: string): Promise<T[]> {
        let queryStr: string;
        if (condition) queryStr = `SELECT * FROM ${table} WHERE ${condition}`;
        else queryStr = `SELECT * FROM ${table}`;
        return await this.query(queryStr);
    }

    /**
     * Inserts a row into a table
     * @param {string} table - Name of the table
     * @param {Object} row - fields to be inserted
     */
    static async insert(table: string, row: TableRow) {
        let keys: string[] = [];
        let values: string[] = [];
        for (let field in row) {
            keys.push(field);
            values.push("\"" + row[field] + "\"");
        }
        try {
            await this.query(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${values.join(", ")})`);
        } catch(err) {
            if (err.code === "ER_DUP_ENTRY" || err.code === "SQLITE_CONSTRAINT")
                throw new DBError(DBErrorType.DUPLICATE);
            throw new DBError(DBErrorType.UNKNOWN);
        }
    }

    static async update(table: string, condition: string, data: TableRow) {
        let datastring = "";
        for (let key in data) {
            datastring += key + " = " + data[key] + ", ";
        }
        datastring = datastring.slice(0, -2);
        await this.query(`UPDATE ${table} SET ${datastring} WHERE ${condition}`);
    }

    static async delete(table: string, condition: string) {
        await this.query(`DELETE FROM ${table} WHERE ${condition}`);
    }

    static async clearTable(table: string) {
        await this.query(`DELETE FROM '${table}'`);
    }
}
