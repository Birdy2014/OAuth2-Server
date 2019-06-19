const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();

async function post(req, res) {
    //TODO
}

async function del(req, res) {
    //TODO
}

async function addUri(client_id, redirect_uri) {
    try {
        let results = await dbInterface.query(`SELECT client_id FROM client WHERE client_id = '${client_id}'`);
        if (results.length === 1)
            await dbInterface.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${client_id}', '${redirect_uri}')`);
        else
            throw 404;
    } catch(e) {
        if (e.code != "ER_DUP_ENTRY") throw e; //Allow adding URIs multiple times
    }
}

async function removeUri(client_id, redirect_uri) {
    await dbInterface.query(`DELETE FROM redirect_uri WHERE client_id = '${client_id}' AND redirect_uri = '${redirect_uri}'`);
}

module.exports = { post, del, addUri, removeUri };