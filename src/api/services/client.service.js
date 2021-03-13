const { Database } = require("../../db/db");

exports.getClients = async () => {
    let results = await Database.query("SELECT client_id, name, dev_id FROM client");
    let clients = [];
    results.forEach(client => {
        clients.push({
            client_id: client.client_id,
            name: client.name,
            dev_id: client.dev_id
        });
    });
    return clients;
}
