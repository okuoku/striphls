// Extract .ts and key from .har
// Concat with: ffmpeg.exe -allowed_extensions ALL -i out.m3u8 -c copy out.ts

const path = require("path");
const fs = require("fs");
const har = JSON.parse(fs.readFileSync(path.resolve(__dirname, "in.har")).toString("utf8"));

const entries = har.log.entries;

const urls = {};
const files = [];

entries.forEach(e => {
    let entry = false;
    const url = new URL(e.request.url);
    const name = url.pathname;
    const basename = path.basename(url.pathname);
    if(e.response.content.text){
        if(e.response.content.encoding == "base64"){
            entry = new Buffer.from(e.response.content.text, "base64");
        }else{
            entry = e.response.content.text;
        }
    }
    files.push({name: name, ext: path.extname(name), 
               basename: basename,
               blob: entry});
    urls[url] = entry;
});

// Extract key, modified .m3u8
files.forEach(e => {
    const reKeyUrl = RegExp('#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"');
    if(e.ext == ".m3u8"){
        if(e.blob instanceof Buffer){
            e.blob = e.blob.toString("utf8");
        }
        const keyUrlArr = reKeyUrl.exec(e.blob);
        if(reKeyUrl.exec(e.blob)){
            const keyUrl = keyUrlArr[1];
            if(urls[keyUrl]){
                console.log(keyUrl);
                console.log(urls[keyUrl]);
                const out = 
                    e.blob.replace(reKeyUrl, "#EXT-X-KEY:METHOD=AES-128,URI=zzzKEY");
                fs.writeFileSync("out.m3u8", out);
                fs.writeFileSync("zzzKey", urls[keyUrl]);
            }else{
                console.log("Not found, skip:", keyUrl);
            }
        }
    }
});

// Extract *.ts
files.forEach(e => {
    if(e.ext == ".ts"){
        fs.writeFileSync(e.basename, e.blob);
    }
});
