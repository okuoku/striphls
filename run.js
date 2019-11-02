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
    let name = url.pathname;
    const basename = path.basename(url.pathname);
    const reListMimeType = RegExp("application.x-mpegurl", "i");
    if(e.response.content.text){
        if(e.response.content.encoding == "base64"){
            entry = new Buffer.from(e.response.content.text, "base64");
        }else{
            entry = e.response.content.text;
        }
        // Override filename for .m3u8
        if(reListMimeType.exec(e.response.content.mimeType)){
            console.log("MIME", e.response.content.mimeType);
            name += ".m3u8";
            console.log("NAME", name);
        }
    }
    files.push({name: name, ext: path.extname(name), 
               basename: basename,
               blob: entry,
               url: url.pathname
    });
    urls[url] = entry;
});

// Extract key, modified .m3u8
files.forEach(e => {
    const reKeyUrl = RegExp('#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"',"g");
    if(e.ext == ".m3u8"){
        if(e.blob instanceof Buffer){
            e.blob = e.blob.toString("utf8");
        }
        const keyUrlArr = [...e.blob.matchAll(reKeyUrl)];
        console.log("KEYURLS", keyUrlArr.map(e => e[1]));

        if(keyUrlArr.length > 0){
            const keyUrl = keyUrlArr[keyUrlArr.length - 1][1];
            if(urls[keyUrl]){
                console.log(keyUrl);
                console.log(urls[keyUrl]);
                const out = 
                    e.blob.replace(reKeyUrl, "#EXT-X-KEY:METHOD=AES-128,URI=zzzKEY");
                fs.writeFileSync("out.m3u8", out);
                fs.writeFileSync("zzzKey", urls[keyUrl]);
                console.log("LIST", e.url);
                console.log("KEY", keyUrl);
            }else{
                console.log("Not found, skip:", keyUrl);
            }
        }else{
            console.log("IGNORED", e.blob);
        }
    }
});

// Extract *.ts
const done = [];
files.forEach(e => {
    if(e.ext == ".ts"){
        fs.writeFileSync(e.basename, e.blob);
        if(done[e.basename]){
            console.log("OVERWRITE", done[e.basename], e.url);
        }else{
            done[e.basename] = e.url;
        }
    }
});
