async function getAuthorizationCode(login, password, client_id, redirect_uri, state) {
    let domain = window.location.href.replace('http://','').replace('https://','').split(/[/?#]/)[0];
    let secure = window.location.href.includes("https://");
    let url = `${secure ? "https://" : "http://"}${domain}/api/authorize`;

    try {
        let body = await request(url, "POST", `login=${login}&password=${password}&client_id=${client_id}&redirect_uri=${redirect_uri}`);
        let jsonObj = JSON.parse(body);
        window.location.href = `${redirect_uri}${redirect_uri.includes("?") ? "&" : "?"}authorization_code=${jsonObj.data.authorization_code}${state === null ? "" : "&state=" + state}`;
    } catch(e) {
        let body = JSON.parse(e);
        console.log(e);
        if (body.status === 403 && body.error === "Invalid User credentials")
            alert("Invalid username or password");
        else if (body.status === 403 && body.error === "Invalid Client credentials")
            alert("Invalid client_id or redirect_uri");
        else if (body.status === 403 && body.error === "Email Address not verified")
            alert("Email Address not verified");
        else
            alert("Unknown error: " + body.status + " " + body.error);
    }
}

function submitAuthorization() {
    let login = document.getElementById("usernameInput").value;
    let password = document.getElementById("passwordInput").value;
    let url = new URL(window.location.href);
    let client_id = url.searchParams.get("client_id");
    let state = url.searchParams.get("state");
    let redirect_uri = url.searchParams.get("redirect_uri");
    if (login && password && client_id && redirect_uri)
        getAuthorizationCode(login, password, client_id, redirect_uri, state);
    else
        alert("missing data");
}

function request(url, method, body, authorization) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject(xhr.response);
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        if (body) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        if (authorization) xhr.setRequestHeader("Authorization", authorization);
        xhr.send(body);
    });
}