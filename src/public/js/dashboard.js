function navigate(tab) {
    let tabs = document.getElementsByClassName("active");
    for (let tab of tabs) {
        tab.classList.remove("active");
    }
    document.getElementById(tab).classList.add("active");
}

/**
 * Logs in and saves the refresh_token to the localStorage
 * @returns {string} access_token
 */
async function login() {
    if (window.localStorage.getItem("refresh_token")) {
        try {
            return await refreshToken(window.localStorage.getItem("refresh_token"));
        } catch (e) {
            window.localStorage.removeItem("refresh_token");
            window.localStorage.removeItem("client_id");
            return await login();
        }
    }
    let client_id = await getDashboardId();
    let authorization_code = url.searchParams.get("authorization_code");
    let state = url.searchParams.get("state");
    if (authorization_code && state === window.sessionStorage.getItem("state")) {
        //Get tokens
        let tokens = JSON.parse(await request(`${url.protocol}//${url.host}/api/token`, "POST", `grant_type=authorization_code&client_id=${client_id}&authorization_code=${authorization_code}`));
        window.localStorage.setItem("refresh_token", tokens.data.refresh_token);
        window.localStorage.setItem("client_id", client_id);
        window.history.replaceState({}, document.title, "/dashboard");
        return tokens.data.access_token;
    } else {
        //Redirect to Login
        state = Math.random().toString(36).substring(7);
        window.sessionStorage.setItem("state", state);
        window.location.href = `${url.protocol}//${url.host}/authorize?client_id=${client_id}&redirect_uri=${url}&state=${state}`;
    }
}

async function refreshToken(refresh_token) {
    let tokens = JSON.parse(await request(`${url.protocol}//${url.host}/api/token`, "POST", `grant_type=refresh_token&client_id=${window.localStorage.getItem("client_id")}&refresh_token=${refresh_token}`));
    return tokens.data.access_token;
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
            document.getElementById("menu_item_admin_settings").style.display = "inline";
            let users = JSON.parse(await request(`${url.protocol}//${url.host}/api/user`, "GET", "", access_token)).data;
            users.forEach(user => {
                let user_element = document.createElement("li");
                user_element.innerHTML = `user_id: ${user.user_id}, username: <input type="text" placeholder="${user.username}" id="input_username_${user.user_id}"/>, email: <input type="email" placeholder="${user.email}" id="input_email_${user.user_id}"/>, Password: <input type="password" id="input_password_${user.user_id}"/>, verified: ${user.verified}, admin: ${user.admin} <a href="javascript:void(0)" onclick="changeSettings(global_access_token, '${user.user_id}', { username: document.getElementById('input_username_${user.user_id}').value, email: document.getElementById('input_email_${user.user_id}').value, password: document.getElementById('input_password_${user.user_id}' }).value)">Submit</a>`;
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

async function changeSettings(access_token, user_id, settings) {
    try {
        let data = "";
        if (user_id) data += `user_id=${user_id}&`;
        for (const setting in settings) {
            if (settings[setting])
                data += setting + "=" + settings[setting] + "&";
        }
        if (data === "") throw { status: 400, error: "Input missing" };
        data = data.substring(0, data.length - 1);

        let result = JSON.parse(await request(`${url.protocol}//${url.host}/api/user`, "PUT", data, access_token));
        return result;
    } catch (e) {
        console.error(e);
        e = JSON.parse(e);
        if (e.status === 403) {
            await changeSettings(await refreshToken(window.localStorage.getItem("refresh_token")), user_id, new_username, new_email, new_password);
        } else {
            console.error(e);
            return e;
        }
    }
}

async function logout() {
    try {
        await request(`${url.protocol}//${url.host}/api/token`, "DELETE", `access_token=${global_access_token}&refresh_token=${window.localStorage.getItem("refresh_token")}`, global_access_token);
        window.localStorage.removeItem("refresh_token");
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

const url = new URL(window.location);
var global_access_token = "";
var input_password;
var input_confirm_password;
var inputs_user_info = [];
var settings_input_container;
var user_list;
var client_list;
window.onload = () => {
    input_password = document.getElementById("input_password");
    input_confirm_password = document.getElementById("input_confirm_password");
    settings_input_container = document.getElementById("settings_input_container");
    user_list = document.getElementById("user_list");
    client_list = document.getElementById("client_list");

    login().then(access_token => { global_access_token = access_token; loadData(access_token) });

    document.getElementById("button_submit").onclick = () => {
        if (input_password.value !== input_confirm_password.value) {
            alert("Passwords don't match");
        } else {
            let settings = {};
            for (const input of inputs_user_info) {
                if (input)
                    settings[input.name] = input.value;
            }
            changeSettings(global_access_token, undefined, settings).then(result => {
                if (result.status === 200) {
                    input_password.value = "";
                    input_confirm_password.value = "";
                    loadData(global_access_token);
                } else {
                    alert(result.error);
                }
            });
        }
    }
}