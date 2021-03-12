const { getUserId } = require("../util/user");
const { Database } = require("../../db/db");
const clientUtils = require("../util/client");
const { Client } = require("../../api/services/Client");
const { User } = require("../../api/services/User");

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
                    let client = await Client.create(args[0], user_id, args[2]);
                    client.save();
                    console.log(`Created client ${client.client_id} with client_secret ${client.client_secret}`);
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
                    for (const client_name of args) {
                        let client_id = await clientUtils.getClientId(client_name);
                        let client = await Client.fromId(client_id);
                        client.delete();
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
                    let client = await Client.fromId(client_id);
                    try {
                        let user = await User.fromLogin(client.dev_id);
                        console.log(`id: ${client_id} name: ${client.name} client_secret: ${client.client_secret} dev_id: ${client.dev_id} dev_email: ${user.email} dev_username: ${user.username}`);
                    } catch (err) {
                        console.log(`id: ${client_id} name: ${client.name} client_secret: ${client.client_secret} dev_id: ${client.dev_id} ${err.message}`);
                    }
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
