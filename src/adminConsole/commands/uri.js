const { getClientId } = require("../util/client");
const { Database } = require("../../db/db");
const { Client } = require("../../api/services/Client");

module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            try {
                let results = await Database.query("SELECT redirect_uri.client_id AS client_id, redirect_uri.redirect_uri AS redirect_uri, client.name AS name FROM redirect_uri JOIN client ON redirect_uri.client_id = client.client_id");
                if (results.length === 0) {
                    console.log("There are no redirect_uris");
                } else {
                    let output = "";
                    await results.forEach(redirect_uri => {
                        output += `client_id: ${redirect_uri.client_id} client_name: ${redirect_uri.name} redirect_uri: ${redirect_uri.redirect_uri}\n`;
                    });
                    console.log(output.substring(0, output.length - 1));
                }
            } catch(e) {
                console.error(e);
            }
            break;
        }
        case "add": {
            args.shift();
            try {
                if (args.length < 2) {
                    console.log("Usage: uri add <client name or ID> <redirect_uri>");
                } else {
                    let client_id = await getClientId(args[0]);
                    let client = await Client.fromId(client_id);
                    client.redirect_uris.push(args[1]);
                    await client.save();
                    console.log("Added redirect_uri " + args[1]);
                }
            } catch(e) {
                console.error(e);
            }
            break;
        }
        case "remove": {
            args.shift();
            try {
                if (args.length < 2) {
                    console.log("Usage: uri remove <client name or ID> <redirect_uri>");
                } else {
                    let client_id = await getClientId(args[0]);
                    let client = await Client.fromId(client_id);
                    client.removeUri(args[1]);
                    await client.save();
                    console.log("Removed redirect_uri " + args[1]);
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
                    console.log("Usage: uri get <client name or ID>");
                } else {
                    let client_id = await getClientId(args[0]);
                    let client = await Client.fromId(client_id);
                    let output = `client_id: ${client_id} client_name: ${client.name} redirect_uris:\n`;
                    for (const uri of client.redirect_uris) {
                        output += `    ${uri}\n`;
                    }
                    console.log(output.substring(0, output.length -1));
                }
            } catch(e) {
                console.error(e);
            }
            break;
        }
        default: {
            console.log(
`Usage: uri <command> [<args>]

Commands:
    list    list all redirect URIs of all clients
    add     add a new redirect URI for a client
    remove  remove a redirect URI
    get     get redirect_uris from a specific client`
            );
        }
    }
}
