const PermissionMethods = require("../../api/permission/PermissionMethods");
const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();
const { getUserId } = require("../../api/utils");

module.exports.run = async args => {
    switch (args[0]) {
        case "add": {
            args.shift();
            for (const login of args) {
                try {
                    await getUserId(login, async user_id => {
                        await PermissionMethods.addPermission(user_id, "admin");
                        console.log(`${user_id} is now admin`);
                    });
                } catch (e) {
                    console.error(e);
                }
            }
            break;
        }
        case "list": {
            try {
                let result = await dbInterface.query("SELECT permissions.user_id AS user_id, user.email AS email, user.username AS username FROM permissions JOIN user ON permissions.user_id = user.user_id WHERE permission = 'admin'");
                if (result.length === 0) {
                    console.log("There are no admins");
                } else {
                    let admins = "";
                    await result.forEach(admin => {
                        admins += `id: ${admin.user_id} name: ${admin.username} email: ${admin.email}\n`;
                    });
                    console.log(admins.substring(0, admins.length - 1)); //Without last line break
                }
            } catch (e) {
                console.error(e);
            }
        }
        case "remove": {
            args.shift();
            for (const login of args) {
                try {
                    await getUserId(login, async user_id => {
                        await PermissionMethods.removePermission(user_id, "admin");
                        console.log(`${user_id} is no admin anymore`);
                    });
                } catch (e) {
                    console.error(e);
                }
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