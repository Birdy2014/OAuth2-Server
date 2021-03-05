const db = require("../../db");
const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;

/**
 * Get the client_id from the name
 * @param {string} identifier - name or client_id
 * @returns {Promise<string>} client_id
 * @throws {string}
 */
exports.getClientId = async (identifier) => {
    let query;
    if (uuidRegEx.test(identifier))
        query = `SELECT client_id FROM client WHERE client_id = '${identifier}'`;
    else
        query = `SELECT client_id FROM client WHERE name = '${identifier}'`;

    let result = await db.query(query);
    if (result.length === 1) {
        return result[0].client_id;
    } else if (result.length === 0) {
        throw `Can't find client ${identifier}`;
    } else {
        throw `Found ${result.length} clients with name ${identifier}`;
    }
}
