'use strict';

let restify = require('restify');
let fs = require('fs');
let filetype = require('file-type');

const UserName = process.env.PRASO_USER;
const Password = process.env.PRASO_PASS;
const Path = '/prasocam.jpg';
const port = process.env.PORT || 5000;
const Prasocam = './images/prasocam.jpg';
const Prasocam_Def = './images/prasocam_default.jpg';

function validatePutRequest(req) {
    if (!req.headers) {
        return new restify.BadRequestError('Missing Headers');
    }

    if (!req.headers.authorization) {
        return new restify.BadRequestError('Missing Authorization Header');
    }

    let auth = req.authorization;

    if(!auth.scheme || auth.scheme !== 'Basic') {
        return new restify.NotAuthorizedError('Wrong scheme');
    }

    if(!auth.basic) {
        return new restify.InvalidCredentialsError('Credentials not provided');
    }

    if(!auth.basic.username || auth.basic.username !== UserName) {
        return new restify.InvalidCredentialsError('Wrong username');
    }

    if(!auth.basic.password || auth.basic.password !== Password) {
        return new restify.InvalidCredentialsError('Wrong password');
    }

    if (!req.is('jpg')) {
        return new restify.InvalidContentError('Not jpeg');
    }

}

function put(req, res, next) {
    let validationError = validatePutRequest(req);
    if (validationError) {
        return res.send(validationError);
    }

    let ftype = filetype(req.body);

    if (null === ftype || ftype.ext !== 'jpg') {
        return res.send(new restify.InvalidContentError('Missing Body or body Not JPG'));
    }

    try {
        fs.writeFile('./images/prasocam.jpg', req.body, 'binary', function writeCallback(err) {
            if(err) {
                return res.send(new restify.InternalServerError(err));
            }
            return res.send(201, "File written");
        });
    } catch (err) {
        return res.send(new restify.InternalServerError(err));
    }
}

function Main() {
    //let logger = require('bunyan').createLogger();
    let server = restify.createServer({ name : 'PrasoCam' });

    server.use(restify.authorizationParser());
    server.use(restify.bodyParser({ maxBodySize : 512*1024 }));

    server.get(Path, restify.serveStatic({
        directory: './images',
        file : 'prasocam.jpg',
        maxAge: 12000
    }));

    if(UserName !== undefined && Password !== undefined) {
        server.put(Path, put);
    }
    server.listen(port);
}

/* istanbul ignore next */
if (require.main === module) {
    Main();
}