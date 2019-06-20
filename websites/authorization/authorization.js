function getAuthorizationCode(login, password, client_id, redirect_uri, state) {
    let domain = window.location.href.replace('http://','').replace('https://','').split(/[/?#]/)[0];
    let secure = window.location.href.includes("https://");
    let url = `${secure ? "https://" : "http://"}${domain}/api/authorize`;

    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = () => {
        if (xhttp.readyState === 4 && xhttp.status === 201) {
            let jsonObj = JSON.parse(xhttp.responseText);
            window.location.href = `${redirect_uri}${redirect_uri.includes("?") ? "&" : "?"}authorization_code=${jsonObj.data.authorization_code}${state === undefined ? "" : state}`;
        } else if (xhttp.readyState === 4 && xhttp.status === 403) {
            alert("Invalid username or password");
        } else if (xhttp.readyState === 4) {
            alert("Unknown error: " + xhttp.status);
        }
    };
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(`login=${login}&password=${password}&client_id=${client_id}&redirect_uri=${redirect_uri}`);
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