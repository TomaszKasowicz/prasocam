'use strict';

const restify = require('restify');
const fs = require('fs');
const UserName = process.env.PRASO_USERNAME;
const Password = process.env.PRASO_PASSWD;

let port = process.env.PORT || 5000;

function validatePutRequest(req) {
    if (!req.headers.authorization) {
        return new restify.NotAuthorizedError('Missing Authorization Header');
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
        return new restify.InvalidContentError('Not jpg');
    }

}
function put(req, res, next) {
    let validationError = validatePutRequest(req);
    if (validationError) {
        return res.send(validationError);
    }

    let body=req.body;

    fs.writeFile('./images/prasocam.jpg', body, 'binary', function writeCallback(err) {
       if(err) {
           return res.send(new restify.InternalServerError(err));
       }
       return res.send(201, "File written");
    });
}

let server = restify.createServer({
    name : 'PrasoCam'
});

server.use(restify.queryParser());
server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.bodyParser({ maxBodySize : 1000000 }));

server.get('/prasocam.jpg', restify.serveStatic({
    directory: './images',
    file : 'prasocam.jpg',
    default : 'prasocam_default.jpg',
    maxAge: 12000
}));

if(UserName !== undefined && Password !== undefined) {
    server.put('/prasocam.jpg', put);
}

server.listen(port);