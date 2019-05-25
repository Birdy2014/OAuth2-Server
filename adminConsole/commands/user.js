const UserMethods = require("../../api/user/UserMethods");
const dbInterface = require("../../DBInterface");
const { getUserId } = require("../../api/utils");

module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            try {
                let results = await dbInterface.query("SELECT user_id, username, email FROM user");
                if (results.length === 0) {
                    console.log("There are no users");
                } else {
                    let output = "";
                    await results.forEach(user => {
                        output += `id: ${user.user_id} name: ${user.username} email: ${user.email}\n`;
                    });
                    console.log(output.substring(0, output.length - 1));
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        case "add": {
            args.shift();
            try {
                if (args.length === 3) {
                    let user_id = await UserMethods.createUser(args[0], args[1], args[2]);
                    console.log(`Created user with email: ${args[0]}, username: ${args[1]}, user_id: ${user_id}`);
                } else {
                    console.log("Usage: user add <email> <username> <password>");
                }
            } catch (e) {
                if (e === 400)
                    console.log("Invalid email address");
                else
                    console.error(e);
            }
            break;
        }
        case "remove": {
            args.shift();
            for (const login of args) {
                try {
                    await getUserId(login, async user_id => {
                        await UserMethods.deleteUser(user_id);
                        console.log(`Deleted user ${user_id}`);
                    });
                } catch (e) {
                    console.log(e);
                }
            }
            break;
        }
        case "get": {
            args.shift();
            try {
                if (args.length === 0) {
                    console.log("Usage: user get <email, username or user ID>");
                } else {
                    await getUserId(args[0], async user_id => {
                        let results = await dbInterface.query(`SELECT username, email FROM user WHERE user_id = '${user_id}'`);
                        console.log(`id: ${user_id} name: ${results[0].username} email: ${results[0].email}`);
                    });
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