function navigate(tab) {
    let tabs = document.getElementsByClassName("active");
    for (let tab of tabs) {
        tab.classList.remove("active");
    }
    document.getElementById(tab).classList.add("active");
}

async function changeSettings(user_id, settings) {
    let data = "";
    if (user_id) data += `user_id=${user_id}&`;
    for (const setting in settings) {
        data += setting + "=" + settings[setting] + "&";
    }
    if (data === "") throw { status: 400, error: "Input missing" };
    data = data.substring(0, data.length - 1);

    let result = JSON.parse(await request(`${url.protocol}//${url.host}/api/user`, "PUT", data));
    return result;
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
    await request(`${url.protocol}//${url.host}/api/token`, "DELETE");
    location.reload();
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
