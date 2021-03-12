import mysql from 'mysql';
import sqlite3 from 'sqlite3';
import util from 'util';
import { generateToken } from '../api/utils';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger';
import { TableRow, tables, TableDataTypes, TableSchema } from './schemas';

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

    static async createTable(config, name: string, columns: TableSchema) {
        let mysql = config.dbms == "mysql";
        let q = `CREATE TABLE IF NOT EXISTS ${name}(`;
        let primary = "";
        let unique = "";
        for (const name in columns) {
            const column = columns[name];
            if (column.primary) {
                if (mysql && column.type === TableDataTypes.TEXT)
                    primary += `${name}(100), `;
                else
                    primary += `${name}, `;
            } else if (column.unique) {
                if (mysql && column.type === TableDataTypes.TEXT)
                    unique += `${name}(100), `;
                else
                    unique += `${name}, `;
            }

            let type: string = "";
            switch (column.type) {
                case TableDataTypes.TEXT:    type = "TEXT";    break;
                case TableDataTypes.INTEGER: type = "INTEGER"; break;
                case TableDataTypes.BOOLEAN: type = "BOOLEAN"; break;
            }
            q += `${name} ${type} ${column.options}, `;
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
        for (let name in tables) {
            await this.createTable(config, name, tables[name]);
        }

        //add Dashboard client
        const dashboard_secret = generateToken(12);
        await this.query(`INSERT INTO client (client_id, client_secret, name, dev_id) VALUES ('${uuidv4()}', '${dashboard_secret}', 'Dashboard', '')`);
        if (dashboard_uri) {
            const dashboard_id = await this.getDashboardId();
            await this.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${dashboard_id}', '${dashboard_uri}')`);
        }
    }

    static async getDashboardId() {
        return (await this.query("SELECT client_id FROM client WHERE name = 'Dashboard'"))[0].client_id;
    }

    private static convertRowTypes<T extends TableRow>(table: string, row: TableRow): T {
        let output: Object = {};
        for (let key in row) {
            switch (tables[table][key].type) {
                case TableDataTypes.BOOLEAN:
                    output[key] = row[key] === true || row[key] === "true" || row[key] === 1;
                    break;
                case TableDataTypes.INTEGER:
                    output[key] = parseInt(row[key]);
                    break;
                default:
                    output[key] = row[key];
            }
        }
        return output as T;
    }

    static async select<T extends TableRow>(table: string, condition?: string): Promise<T|undefined> {
        let queryStr: string;
        if (condition) queryStr = `SELECT * FROM ${table} WHERE ${condition} LIMIT 1`;
        else queryStr = `SELECT * FROM ${table} LIMIT 1`;
        let rows: TableRow[] = await this.query(queryStr);
        if (rows.length === 0)
            return undefined;
        return Database.convertRowTypes<T>(table, rows[0]);
    }

    static async selectAll<T extends TableRow>(table: string, condition?: string): Promise<T[]> {
        let queryStr: string;
        if (condition) queryStr = `SELECT * FROM ${table} WHERE ${condition}`;
        else queryStr = `SELECT * FROM ${table}`;
        let rows: TableRow[] = await this.query(queryStr);
        return rows.map(value => Database.convertRowTypes<T>(table, value));
    }

    /**
     * Inserts a row into a table
     * @param {string} table - Name of the table
     * @param {Object} row - fields to be inserted
     */
    static async insert(table: string, row: TableRow) {
        if (Object.entries(row).length === 0)
            return;
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
        if (Object.entries(data).length === 0)
            return;
        let datastring = "";
        for (let key in data) {
            datastring += key + " = '" + data[key] + "', ";
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
