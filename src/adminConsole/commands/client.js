const { getUserId } = require("../util/user");
const { Database } = require("../../db/db");
const clientService = require("../../api/services/client.service");
const clientUtils = require("../util/client");

module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            try {
                let results = await Database.query("SELECT client_id, name, dev_id FROM client");
                if (results.length === 0) {
                    console.log("There are no clients");
                } else {
                    let output = "";
                    for (const client of results) {
                        output += `id: ${client.client_id} name: ${client.name} dev_id: ${client.dev_id}\n`;
                    }
                    console.log(output.substring(0, output.length -1));
                }
            } catch(e) {
                console.error(e);
            }
            break;
        }
        case "add": {
            args.shift();
            try {
                if (args.length < 3) {
                    console.log("Usage: client add <name> <developer id, username or email> <redirect uri>");
                } else {
                    let user_id = await getUserId(args[1]);
                    let { client_id, client_secret } = await clientService.createClient(args[0], user_id, args[2]);
                    console.log(`Created client ${client_id} with client_secret ${client_secret}`);
                }
            } catch(e) {
                console.error(e);
            }
            break;
        }
        case "remove": {
            args.shift();
            try {
                if (args.length === 0) {
                    console.log("Usage: client remove <client id or name>");
                } else {
                    for (const client of args) {
                        let client_id = await clientUtils.getClientId(client);
                        await clientService.deleteClient(client_id);
                        console.log(`Deleted client ${client_id}`);
                    }
                }
            } catch(e) {
                console.error(e);
            }
            break;
        }
        case "get": {
            args.shift();
            try {
                if (args.length === 0) {
                    console.log("Usage: client get <client id or name>");
                } else {
                    let client_id = await clientUtils.getClientId(args[0]);
                    let results = await Database.query(`SELECT client.name AS name, client.dev_id AS dev_id, client.client_secret AS client_secret, user.username AS username, user.email AS email FROM client LEFT JOIN user ON user.user_id = client.dev_id WHERE client.client_id = '${client_id}'`);
                    console.log(`id: ${client_id} name: ${results[0].name} client_secret: ${results[0].client_secret} dev_id: ${results[0].dev_id} dev_email: ${results[0].email} dev_username: ${results[0].username}`);
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        case "edit": {
            //TODO
            break;
        }
        default: {
            console.log(
`Usage: client <command> [<args>]

Commands:
    list    list all clients
    add     create new client
    remove  remove client
    get     get information about a specific client
    edit    edit name`
            );
        }
    }
}
