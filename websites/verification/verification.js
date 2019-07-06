async function verify() {
    let url = new URL(window.location.href);
    let verification_code = url.searchParams.get("verification_code");

    let domain = window.location.href.replace('http://','').replace('https://','').split(/[/?#]/)[0];
    let secure = window.location.href.includes("https://");
    let requestUrl = `${secure ? "https://" : "http://"}${domain}/api/verification`;

    let res = await request(requestUrl, "POST", `verification_code=${verification_code}`);
    console.log("Response " + res);
}

verify();