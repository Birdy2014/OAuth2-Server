const fs = require("fs");
const { promisify } = require("util");

const appendFile = promisify(fs.appendFile);

exports.init = (path) => {
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

exports.error = async (message) => {
    let date = new Date().toISOString().
        replace(/T/, ' ').
        replace(/\..+/, '');
        
    try {
        await appendFile(exports.path, `[${date}] ERROR: ${message}\n`);
    } catch (e) {
        console.log("Cannot write to " + exports.path);
    }
    console.error(message);
}

exports.warn = async (message) => {
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

exports.info = async (message) => {
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