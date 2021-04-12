import { Database } from '../../db/Database';
import { User } from '../../api/services/User';

export async function run(args: string[]) {
    switch (args[0]) {
        case "list": {
            let results = await Database.selectAll('user');
            if (results.length === 0) {
                console.log("There are no users");
            } else {
                let output = "";
                await results.forEach(user => {
                    output += `id: ${user.user_id} name: ${user.username} email: ${user.email} verified: ${user.verified}\n`;
                });
                console.log(output.substring(0, output.length - 1));
            }
            break;
        }
        case "add": {
            args.shift();
            if (args.length === 3) {
                let user = await User.create(args[1], args[0], args[2], {});
                await user.save();
                console.log(`Created user with email: ${args[0]}, username: ${args[1]}, user_id: ${user.user_id}`);
            } else {
                console.log("Usage: user add <email> <username> <password>");
            }
            break;
        }
        case "remove": {
            args.shift();
            for (const login of args) {
                try {
                    let user = await User.fromLogin(login);
                    await user.delete();
                    console.log(`Deleted user ${user.user_id}`);
                } catch (e) {
                    console.log(e);
                }
            }
            break;
        }
        case "get": {
            args.shift();
            if (args.length === 0) {
                console.log("Usage: user get <email, username or user ID>");
            } else {
                let user = await User.fromLogin(args[0]);
                let output = `user_id: ${user.user_id} username: ${user.username} email: ${user.email} verified: ${user.verified} admin: ${user.admin}`;
                if (Object.entries(user.user_info).length > 0) {
                    output += "\n  user_info:\n"
                    for (const key in user.user_info) {
                        output += `    ${key}: ${user.user_info[key]}\n`;
                    }
                }
                if (Object.entries(user.permissions.values).length > 0) {
                    output += "\n  permissions:\n"
                    for (const client_id in user.permissions.values) {
                        output += `    client_id: ${client_id}:\n`
                        for (const permission of user.permissions.values[client_id]) {
                            output += `      ${permission}\n`;
                        }
                    }
                }
                console.log(output);
            }
            break;
        }
        case "edit": {
            args.shift();
            if (args.length < 3 || !(args[1] === "username" || args[1] === "password" || args[1] === "email" || args[1] === "verified")) {
                console.log("Usage: user edit <email, username or user ID> username/password/email/verified <new value>");
            } else {
                let user = await User.fromLogin(args[0]);
                switch (args[1]) {
                    case "username":
                        user.username = args[2];
                        break;
                    case "password":
                        user.password = args[2];
                        break;
                    case "email":
                        user.email = args[2];
                        break;
                    case "verified":
                        if (["0", "1", "false", "true"].includes(args[2]))
                            user.verified = args[2] === "true" || args[2] === "1";
                        else
                            console.log("Invalid value: " + args[2]);
                }
                await user.save();
            }
            break;
        }
        default: {
            console.log(
                `Usage: user <command> [<args>]

Commands:
    list    list all users
    add     add user
    remove  remove user
    get     get information of a specific user
    edit    edit username, email or password`
            );
        }
    }
}
