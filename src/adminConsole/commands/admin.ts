import { Permissions } from '../../api/services/Permissions';
import { Database } from '../../db/Database';
import { getUserId } from '../utils';

export async function run(args: string[]) {
    switch (args[0]) {
        case "add": {
            args.shift();
            for (const login of args) {
                let user_id = await getUserId(login);
                let permissions = await Permissions.fromUserId(user_id);
                permissions.add(Database.dashboard_id, "admin");
                await permissions.save();
                console.log(`${user_id} is now admin`);
            }
            break;
        }
        case "list": {
            let result = await Database.query("SELECT permissions.user_id AS user_id, user.email AS email, user.username AS username FROM permissions JOIN user ON permissions.user_id = user.user_id WHERE permission = 'admin'");
            if (result.length === 0) {
                console.log("There are no admins");
            } else {
                let admins = "";
                await result.forEach(admin => {
                    admins += `id: ${admin.user_id} name: ${admin.username} email: ${admin.email}\n`;
                });
                console.log(admins.substring(0, admins.length - 1)); //Without last line break
            }
            break;
        }
        case "remove": {
            args.shift();
            for (const login of args) {
                let user_id = await getUserId(login);
                let permissions = await Permissions.fromUserId(user_id);
                permissions.del(Database.dashboard_id, "admin");
                permissions.save();
                console.log(`${user_id} is no admin anymore`);
            }
            break;
        }
        default: {
            console.log(
`Usage: admin <command> [<args>]

Commands:
    list    list all admins
    add     add admin permissions to users
    remove  remove admin permissions from users`
            );
        }
    }
}
