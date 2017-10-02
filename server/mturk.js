// First step: get services connected.

const AWS = require('aws-sdk');
const http = require('http');
const uuid = require('node-uuid');

// Create an S3 client
var s3 = new AWS.S3();

// Create a bucket and upload something into it
const bucketName = 'mturk-test-' + uuid.v4();
var keyName = 'hello_world.txt';

s3.createBucket({ Bucket: bucketName }, function () {
    var params = { Bucket: bucketName, Key: keyName, Body: 'Hello World!' };
    s3.putObject(params, function (err, data) {
        if (err)
            console.log(err)
        else
            console.log("Successfully uploaded data to " + bucketName + "/" + keyName);
    });
});