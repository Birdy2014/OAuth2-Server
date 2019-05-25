const { getClientId } = require("../../api/utils");
const dbInterface = require("../../DBInterface");
const UriMethods = require("../../api/client/UriMethods");

module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            try {
                let results = await dbInterface.query("SELECT redirect_uri.client_id AS client_id, redirect_uri.redirect_uri AS redirect_uri, client.name AS name FROM redirect_uri JOIN client ON redirect_uri.client_id = client.client_id");
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
            //TODO
            break;
        }
        case "get": {
            //TODO
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