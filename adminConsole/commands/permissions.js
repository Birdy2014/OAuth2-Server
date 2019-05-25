const PermissionMethods = require("../../api/permission/PermissionMethods");
const dbInterface = require("../../DBInterface");
const { getUserId } = require("../../api/utils");

module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            args.shift();
            try {
                if (args.length === 0) {
                    console.log("Usage: permissions list <email, username or user ID>");
                } else {
                    await getUserId(args[0], async user_id => {
                        let permissions = await PermissionMethods.getPermissions(user_id);
                        if (permissions.length === 0) {
                            console.log(`User ${user_id} has no permissions`);
                        } else {
                            let output = "";
                            for (const permission of permissions) {
                                output += `${permission}\n`;
                            }
                            console.log(output.substring(0, output.length - 1));
                        }
                    });
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        case "add": {
            args.shift();
            try {
                if (args.length <= 1) {
                    console.log("Usage: permissions add <email, username or user ID> <permission>");
                } else {
                    let login = args[0];
                    args.shift();
                    for (const permission of args) {
                        await getUserId(login, async user_id => {
                            await PermissionMethods.addPermission(user_id, permission);
                            console.log(`User ${user_id} has now the Permission ${permission}`);
                        });
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
                if (args.length <= 1) {
                    console.log("Usage: permissions remove <email, username or ID> <permission>");
                } else {
                    let login = args[0];
                    args.shift();
                    for (const permission of args) {
                        await getUserId(login, async user_id => {
                            await PermissionMethods.removePermission(user_id, permission);
                            console.log(`Removed Permission ${permission} from user ${user_id}`);
                        });
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