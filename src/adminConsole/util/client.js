const db = require("../../db");
const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;

/**
 * Get the client_id from the name
 * @param {string} identifier - name or client_id
 * @param {function(string)} callback - async callback with client_id as param
 */
exports.getClientId = (identifier, callback) => {
    let query;
    if (uuidRegEx.test(identifier))
        query = `SELECT client_id FROM client WHERE client_id = '${identifier}'`;
    else
        query = `SELECT client_id FROM client WHERE name = '${identifier}'`;

    db.query(query).then((result) => {
        if (result.length === 1) {
            let client_id = result[0].client_id;
            callback(client_id);
        } else if (result.length === 0) {
            console.log(`Can't find client ${identifier}`);
        } else {
            console.log(`Found ${result.length} clients with name ${identifier}`);
        }
    });
}