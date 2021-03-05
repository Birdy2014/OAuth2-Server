const { getPermissions, addPermission, removePermission } = require("../../api/services/permission.service");
const { getUserId } = require("../util/user");
const { getClientId } = require("../util/client");

module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            args.shift();
            try {
                if (args.length === 0) {
                    console.log("Usage: permissions list <email, username or user ID>");
                } else {
                    let user_id = await getUserId(args[0]);
                    let permissions = await getPermissions(user_id);
                    if (permissions.length === 0) {
                        console.log(`User ${user_id} has no permissions`);
                    } else {
                        let output = "";
                        for (const permission of permissions) {
                            output += `client_id: ${permission.client_id} permission: ${permission.permission}\n`;
                        }
                        console.log(output.substring(0, output.length - 1));
                    }
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        case "add": {
            args.shift();
            try {
                if (args.length < 3) {
                    console.log("Usage: permissions add <email, username or user ID> <client name or id> <permission>");
                } else {
                    let login = args[0];
                    let client_login = args[1];
                    args.splice(0, 2);
                    let user_id = await getUserId(login);
                    let client_id = await getClientId(client_login);
                    for (const permission of args) {
                        await addPermission(user_id, client_id, permission);
                        console.log(`User ${user_id} has now the Permission ${permission} on client ${client_id}`);
                    }
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        case "remove": {
            args.shift();
            try {
                if (args.length < 3) {
                    console.log("Usage: permissions remove <email, username or ID> <client name or id> <permission>");
                } else {
                    let login = args[0];
                    let client_login = args[1];
                    args.splice(0, 2);
                    let user_id = await getUserId(login);
                    let client_id = await getClientId(client_login);
                    for (const permission of args) {
                        await removePermission(user_id, client_id, permission);
                        console.log(`Removed Permission ${permission} from user ${user_id} on client ${client_id}`);
                    }
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        default: {
            console.log(
                `Usage: permissions <command> [<args>]

Commands:
    list    list permissions of user
    add     add permissions to user
    remove  remove permissions of user`
            );
        }
    }
}
