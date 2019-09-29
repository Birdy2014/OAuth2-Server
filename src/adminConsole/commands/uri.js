const { getClientId } = require("../../api/controllers/ClientMethods");
const db = require("../../db");
const UriMethods = require("../../api/controllers/UriMethods");

module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            try {
                let results = await db.query("SELECT redirect_uri.client_id AS client_id, redirect_uri.redirect_uri AS redirect_uri, client.name AS name FROM redirect_uri JOIN client ON redirect_uri.client_id = client.client_id");
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
                    await getClientId(args[0], async client_id => {
                        await UriMethods.addUri(client_id, args[1]);
                        console.log("Added redirect_uri");
                    });
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
                    await getClientId(args[0], async client_uri => {
                        await UriMethods.removeUri(client_uri, args[1]);
                        console.log("Removed redirect_uri");
                    });                  
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
                    await getClientId(args[0], async client_id => {
                        let results = await db.query(`SELECT redirect_uri.redirect_uri AS redirect_uri, client.name AS name, user.email AS email, user.username AS username FROM redirect_uri JOIN client ON redirect_uri.client_id = client.client_id JOIN user ON client.dev_id = user.user_id WHERE redirect_uri.client_id = '${client_id}'`);
                        let output = "";
                        for (const result of results) {
                            output += `client_id: ${client_id} client_name: ${result.name} redirect_uri: ${result.redirect_uri} dev_email: ${result.email} dev_name: ${result.username}\n`;
                        }
                        console.log(output.substring(0, output.length -1));
                    });
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