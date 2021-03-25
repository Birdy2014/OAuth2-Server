import { Permissions } from '../../api/services/Permissions';
import { getUserId, getClientId } from '../utils';

export async function run(args: string[]) {
    switch (args[0]) {
        case "list": {
            args.shift();
            if (args.length === 0) {
                console.log("Usage: permissions list <email, username or user ID>");
            } else {
                let user_id = await getUserId(args[0]);
                let permissions = await Permissions.fromUserId(user_id);
                if (Object.keys(permissions.values).length === 0) {
                    console.log(`User ${user_id} has no permissions`);
                } else {
                    let output = "";
                    for (const client_id in permissions.values) {
                        output += `client_id: ${client_id}\n`;
                        for (const permission of permissions.values[client_id]) {
                            output += `    ${permission}\n`;
                        }
                    }
                    console.log(output);
                }
            }
            break;
        }
        case "add": {
            args.shift();
            if (args.length < 3) {
                console.log("Usage: permissions add <email, username or user ID> <client name or id> <permission>");
            } else {
                let login = args[0];
                let client_login = args[1];
                args.splice(0, 2);
                let user_id = await getUserId(login);
                let client_id = await getClientId(client_login);
                let permissions = await Permissions.fromUserId(user_id);
                for (const permission of args) {
                    permissions.add(client_id, permission);
                    console.log(`User ${user_id} has now the Permission ${permission} on client ${client_id}`);
                }
                await permissions.save();
            }
            break;
        }
        case "remove": {
            args.shift();
            if (args.length < 3) {
                console.log("Usage: permissions remove <email, username or ID> <client name or id> <permission>");
            } else {
                let login = args[0];
                let client_login = args[1];
                args.splice(0, 2);
                let user_id = await getUserId(login);
                let client_id = await getClientId(client_login);
                let permissions = await Permissions.fromUserId(user_id);
                for (const permission of args) {
                    permissions.del(client_id, permission);
                    console.log(`Removed Permission ${permission} from user ${user_id} on client ${client_id}`);
                }
                await permissions.save();
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
