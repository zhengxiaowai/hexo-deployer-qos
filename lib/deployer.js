"use strict";

const Qiniu = require("qiniu");
const pathFn = require("path");
const fs = require("hexo-fs");

module.exports = function(args, callback) {
    if (!args.access_key || !args.secret_key) {
        let warn = [
            "You should argsure deployment qiniu settings in _config.yml first!",
            "",
            "deploy:",
            "   type: qiniu",
            "   bucket: yourBucketName",
            "   access_key: yourAccessKey",
            "   secret_key: yourSecretKey",
            "",
            "For more help, can visit https://hexo.io/docs/deployment.html",
            "",
            "For hexo-deployer-qiniu problems, can visit https://github.com/zhengxiaowai/hexo-deployer-qiniu",
            ""
        ];

        console.log(warn.join("\n"));
        log.error("hexo-deployer-qiniu error");
        return;
    }

    const CONFIG = new Qiniu.conf.Config();
    const UPLOADER = new Qiniu.form_up.FormUploader(CONFIG);
    const MAC = new Qiniu.auth.digest.Mac(args.access_key, args.secret_key);
    const BUCKET = args.bucket;

    let publicDir = this.public_dir;
    let log = this.log;
    let uploadFileList = [];

    traverseFiles(publicDir, function(file) {
        uploadFileList.push({
            uploadPath: getUploadPath(file, pathFn.basename(publicDir)),
            file: file
        });
    });

    uploadFileList.forEach(function(file) {
        let key = file.uploadPath;
        let localFile = file.file;
        let token = uptoken(BUCKET, key, MAC);
        let extra = new Qiniu.form_up.PutExtra();

        UPLOADER.putFile(token, key, localFile, extra, function(
            err,
            ret,
            info
        ) {
            if (err) {
                throw err;
            }

            if (info.statusCode == 200) {
                log.info(localFile + " was successfully uploaded to " + key);
            } else {
                log.error(localFile + "was upload failed ");
            }
        });
    });
};

function traverseFiles(dir, handle) {
    let files = fs.listDirSync(dir);
    files.forEach(function(filePath) {
        let absPath = pathFn.join(dir, filePath);
        let stat = fs.statSync(absPath);
        if (stat.isDirectory()) {
            traverseFiles(absPath, handle);
        } else {
            handle(absPath);
        }
    });
}

function uptoken(bucket, key, mac) {
    let putPolicy = new Qiniu.rs.PutPolicy({
        scope: bucket + ":" + key
    });

    return putPolicy.uploadToken(mac);
}

function getUploadPath(absPath, root) {
    let pathArr = absPath.split(pathFn.sep);
    let rootIndex = pathArr.indexOf(root);

    pathArr = pathArr.slice(rootIndex + 1);
    return pathArr.join("/");
}
