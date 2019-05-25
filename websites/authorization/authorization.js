function getAuthorizationCode(username, password, client_id, redirect_uri, state) {
    let domain = window.location.href.replace('http://','').replace('https://','').split(/[/?#]/)[0];
    let secure = window.location.href.includes("https://");
    let url = `${secure ? "https://" : "http://"}${domain}/api/authorize`;

    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = () => {
        if (xhttp.readyState === 4 && xhttp.status === 201) {
            let jsonObj = xhttp.responseText;
            window.location.href = `${redirect_uri}${redirect_uri.includes("?") ? "&" : "?"}authorization_code=${jsonObj.data.authorization_code}${state === undefined ? "" : state}`;
        } else if (xhttp.readyState === 4) {
            //error
            alert("error");
        }
    };
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(`username=${username}&password=${password}&client_id=${client_id}&redirect_uri=${redirect_uri}`);
}

function submit() {
    let username = document.getElementById("usernameInput").value;
    let password = document.getElementById("passwordInput").value;
    let url = new URL(window.location.href);
    let client_id = url.searchParams.get("client_id");
    let state = url.searchParams.get("state");
    let redirect_uri = url.searchParams.get("redirect_uri")
    getAuthorizationCode(username, password, client_id, redirect_uri, state);
}