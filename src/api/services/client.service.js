const { Database } = require("../../db/Database");

exports.getClients = async () => {
    let results = await Database.selectAll('client');
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
