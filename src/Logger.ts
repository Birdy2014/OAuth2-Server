import fs from 'fs';
import { promisify } from 'util';
import { ServerError } from './api/utils';

const appendFile = promisify(fs.appendFile);

export class Logger {
    public static init(path: string) {
        if (path.charAt(path.length - 1) !== "/")
            path += "/";
        if (!fs.existsSync(path))
            fs.mkdirSync(path, { recursive: true });
        let date = (new Date).toDateString();
        date = date.replace(/ /g, "_");
        exports.path = path + date;
        let nr = 0;
        for(; fs.existsSync(exports.path + "_" + nr); nr++) {}
        exports.path += "_" + nr;
    }

    public static async error(err: string|Error) {
        let date = new Date().toISOString().
            replace(/T/, ' ').
            replace(/\..+/, '');

        let message: string;
        if (err instanceof ServerError)
            message = `ServerError: ${err.status} - ${err.message}\n${err.stack}\n----------\n`;
        else if (err instanceof Error)
            message = `${err.name}: ${err.message}\n${err.stack}\n----------\n`
        else
            message = `${err}\n`;

        try {
            await appendFile(exports.path, `[${date}] ERROR: ${message}\n`);
        } catch (e) {
            console.log("Cannot write to " + exports.path);
        }
        console.error(message);
    }

    public static async warn(message: string) {
        let date = new Date().toISOString().
            replace(/T/, ' ').
            replace(/\..+/, '');

        try {
            await appendFile(exports.path, `[${date}] ERROR: ${message}\n`);
        } catch (e) {
            console.error("Cannot write to " + exports.path);
        }
        console.log(message);
    }

    public static async info(message: string) {
        let date = new Date().toISOString().
            replace(/T/, ' ').
            replace(/\..+/, '')

        try {
            await appendFile(exports.path, `[${date}] INFO: ${message}\n`);
        } catch (e) {
            console.error("Cannot write to " + exports.path);
        }
        console.log(message);
    }
}
