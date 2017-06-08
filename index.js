'use strict';

let restify = require('restify');
let fs = require('fs');
let filetype = require('file-type');
let bunyan = require('bunyan');

const AppName = 'PrasoCam';
const UserName = process.env.PRASO_USER;
const Password = process.env.PRASO_PASS;
const Path = '/prasocam.jpg';
const port = process.env.PORT || 5000;
const Prasocam = './images/prasocam.jpg';
const Prasocam_Def = './images/prasocam_default.jpg';

let logger = bunyan.createLogger({
    name : AppName,
    streams : [
        {
            type : 'stream',
            stream : process.stdout,
            level : 'debug'
        }
    ]
});

function _validatePutRequest(req) {
    if (!req.headers) {
        return new restify.BadRequestError('Missing Headers');
    }

    if (!req.headers['x-forwarded-proto'] || req.headers['x-forwarded-proto'] !== 'https') {
        return new restify.NotAuthorizedError('https required');
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
    let validationError = _validatePutRequest(req);
    if (validationError) {
        req.log.debug('Request validation error.', validationError.message);
        return res.send(validationError);
    }

    let ftype = filetype(req.body);

    if (null === ftype || ftype.ext !== 'jpg') {
        req.log.warn('Missing Body or body Not JPG');
        return res.send(new restify.InvalidContentError('Missing Body or body Not JPG'));
    }

    req.log.info('Received new image. Trying to write');
    fs.writeFile('./images/prasocam.jpg', req.body, 'binary', function writeCallback(err) {
        if(err) {
            req.log.error('Unable to write image', ftype, ( req.body ? req.body.length : 0), err.message);
            return res.send(new restify.InternalServerError(err));
        }
        req.log.info('File written');
        return res.send(201, "File written");
    });
}

function _incomingLogger(req, res, next) {
    req.log.debug('Recevied new Request.', req.method);
    return next();
}

function Main() {
    //let logger = require('bunyan').createLogger();
    let server = restify.createServer({
        name : AppName,
        log : logger
    });

    server.use(restify.requestLogger());
    server.use(_incomingLogger);

    server.use(restify.authorizationParser());
    server.use(restify.bodyParser({ maxBodySize : 512*1024 }));
    server.use(restify.gzipResponse());

    server.get(Path, restify.serveStatic({
        directory: './images',
        file : 'prasocam.jpg',
        maxAge: 12000
    }));

    if(UserName !== undefined && Password !== undefined) {
        logger.info('UserName and Password configured. Enabling PUT');
        server.put(Path, put);
    } else {
        logger.warn('UserName and Password not configured, only allowing GET operation');
    }

    server.listen(port);
    logger.info('Server listening on port ', port);
}

/* istanbul ignore next */
if (require.main === module) {
    Main();
}