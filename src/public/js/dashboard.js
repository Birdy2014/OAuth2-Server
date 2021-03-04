function navigate(tab) {
    let tabs = document.getElementsByClassName("active");
    for (let tab of tabs) {
        tab.classList.remove("active");
    }
    document.getElementById(tab).classList.add("active");
}

function createInputField(name, text, options) {
    let container = document.createElement("div");
    let input;
    container.innerHTML = text;
    if (options && options.length > 0) {
        input = document.createElement("select");
        for (const option of options) {
            let e = document.createElement("option");
            e.value = option;
            e.innerHTML = option;
            input.append(e);
        }
    } else {
        input = document.createElement("input");
        input.type = "text";
    }
    input.name = name;
    input.className = "inputs_user_info";
    container.append(input);
    return container;
}

async function loadData(access_token) {
    try {
        settings_input_container.innerHTML = "";

        //Get connected clients, user information, permissions
        let admin = false;
        let { user, user_info } = JSON.parse(await request(`${url.protocol}//${url.host}/api/dashboard`, "GET", "", access_token)).data;

        //Load data to DOM
        settings_input_container.append(createInputField("username", "Username: "));
        settings_input_container.append(createInputField("email", "Email Adresse: "));
        for (const key in user_info) {
            let field = createInputField(key, `${key}: `, user_info[key]);
            settings_input_container.append(field);
        }

        inputs_user_info = Array.from(document.getElementsByClassName("inputs_user_info"));

        for (const key in user) {
            switch(key) {
                case "user_id":
                    break;
                case "permissions":
                    break;
                case "admin":
                    admin = user[key];
                    break;
                case "verified":
                    if (!user[key]) alert("Please verify your email address");
                    break;
                default:
                    let e = inputs_user_info.filter(value => value.name === key)[0];
                    if (e && e.tagName.toLowerCase() === "input") {
                        e.placeholder = user[key];
                    } else if (e && e.tagName.toLowerCase() === "select") {
                        for (const option of Array.from(e.childNodes)) {
                            if (option.value === user[key]) {
                                option.setAttribute("selected", "");
                                break;
                            }
                        }
                    }
            }
        }

        //admin settings
        if (admin) {
            raw_user_list = {};
            user_list.innerHTML = "";
            client_list.innerHTML = "";
            document.getElementById("menu_item_admin_settings").style.display = "inline";
            let users = JSON.parse(await request(`${url.protocol}//${url.host}/api/user`, "GET", "", access_token)).data;
            users.forEach(user => {
                raw_user_list[user.user_id] = user;
                let user_element = document.createElement("li");
                user_element.innerHTML = `
                    user_id: ${user.user_id},
                    username: <input type="text" placeholder="${user.username}" id="input_username_${user.user_id}"/>,
                    email: <input type="email" placeholder="${user.email}" id="input_email_${user.user_id}"/>,
                    Password: <input type="password" id="input_password_${user.user_id}"/>,
                    verified: <input type="checkbox" ${user.verified ? "checked" : ""} id="input_verified_${user.user_id}" />,
                    admin: <input type="checkbox" ${user.admin ? "checked" : ""} id="input_admin_${user.user_id}" />
                    <a href="javascript:void(0)" onclick="adminChangeUser('${user.user_id}');">Submit</a>`;
                user_list.appendChild(user_element);
            });
            let clients = JSON.parse(await request(`${url.protocol}//${url.host}/api/client`, "GET", "", access_token)).data;
            clients.forEach(client => {
                let client_element = document.createElement("li");
                client_element.innerHTML = `client_id: ${client.client_id}, name: ${client.name}, dev_id: ${client.dev_id}`;
                client_list.appendChild(client_element);
            });
        }
    } catch (e) {
        console.error(e);
        if (JSON.parse(e).status === 403) {
            global_access_token = await refreshToken(window.localStorage.getItem("refresh_token"));
            await loadData(global_access_token);
        } else {
            console.error(e);
        }
    }
}

async function changeSettings(user_id, settings) {
    try {
        let data = "";
        if (user_id) data += `user_id=${user_id}&`;
        for (const setting in settings) {
            data += setting + "=" + settings[setting] + "&";
        }
        if (data === "") throw { status: 400, error: "Input missing" };
        data = data.substring(0, data.length - 1);

        let result = JSON.parse(await request(`${url.protocol}//${url.host}/api/user`, "PUT", data));
        return result;
    } catch (e) {
        console.error(e);
        return e;
    }
}

async function changePermissions(user_id, permission, add) {
    let data = `client_id=${window.localStorage.getItem("client_id")}&permission=${permission}&user_id=${user_id}`;
    await request(`${url.protocol}//${url.host}/api/permissions`, add ? "POST" : "DELETE", data);
}

async function adminChangeUser(user_id) {
    let username = document.getElementById(`input_username_${user_id}`).value;
    let email = document.getElementById(`input_email_${user_id}`).value;
    let password = document.getElementById(`input_password_${user_id}`).value;
    let verified = document.getElementById(`input_verified_${user_id}`).checked;
    let admin = document.getElementById(`input_admin_${user_id}`).checked;

    let settings = {};
    if (username)
        settings.username = username;
    if (email)
        settings.email = email;
    if (password)
        settings.password = password;
    settings.verified = verified;

    if (Object.keys(settings).length > 0)
        await changeSettings(user_id, settings);

    if (settings.username) {
        document.getElementById(`input_username_${user_id}`).value = "";
        document.getElementById(`input_username_${user_id}`).placeholder = settings.username;
    }

    if (settings.email) {
        document.getElementById(`input_email_${user_id}`).value = "";
        document.getElementById(`input_email_${user_id}`).placeholder = settings.email;
    }

    await changePermissions(user_id, "admin", admin);
}

async function logout() {
    try {
        await request(`${url.protocol}//${url.host}/api/token`, "DELETE", `access_token=${global_access_token}&refresh_token=${window.localStorage.getItem("refresh_token")}`, global_access_token);
        window.localStorage.removeItem("refresh_token");
        window.localStorage.removeItem("access_token");
        location.reload();
    } catch (e) {
        console.error(e);
        e = JSON.parse(e);
        if (e.status === 403) {
            global_access_token = await refreshToken(window.localStorage.getItem("refresh_token"));
            await logout();
        } else {
            console.error(e);
            return e;
        }
    }
}

let raw_user_list = {};
const url = new URL(window.location);
var input_password;
var input_confirm_password;
var inputs_user_info = {};
var settings_input_container;
var user_list;
var client_list;
window.onload = () => {
    input_password = document.getElementById("input_password");
    input_confirm_password = document.getElementById("input_confirm_password");
    settings_input_container = document.getElementById("settings_input_container");
    user_list = document.getElementById("user_list");
    client_list = document.getElementById("client_list");

    for (let element of Array.from(document.getElementsByClassName("inputs_user_info"))) {
        inputs_user_info[element.name] = element;
    }

    document.getElementById("button_submit").onclick = () => {
        if (input_password.value !== input_confirm_password.value) {
            alert("Passwords don't match");
        } else {
            let settings = {};
            for (const name in inputs_user_info) {
                let input = inputs_user_info[name]
                if (input && input.value !== "")
                    settings[input.name] = input.value;
            }
            changeSettings(undefined, settings).then(result => {
                if (result.status === 200) {
                    input_password.value = "";
                    input_confirm_password.value = "";
                    for (let [setting, value] of Object.entries(settings)) {
                        if (setting === "password")
                            continue;
                        let element = inputs_user_info[setting];
                        if (element.tagName === "SELECT") {
                            element.value = value;
                        } else {
                            element.value = "";
                            element.placeholder = value;
                        }
                    }
                } else {
                    alert(result.error);
                }
            });
        }
    }
}
