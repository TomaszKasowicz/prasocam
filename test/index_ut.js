/**
 * Created by mqp634 on 6/8/2017.
 */
'use strict';

let sinon = require('sinon');
let rewire = require('rewire');
let expect = require('chai').expect;

describe('Index JS Unit Tests', function() {
    let restify=require('restify');

    describe('HTTP Request validation', function () {
        let validatePutRequest;

        before(function (done) {
            process.env.PRASO_USER = 'test';
            process.env.PRASO_PASS = 'test';
            validatePutRequest = rewire('./../index.js').__get__('validatePutRequest');
            done();
        });

        after(function (done) {
            delete process.env.PRASO_USER;
            delete process.env.PRASO_PASS;
            done();
        });

        it('Should Return Error when Headers are missing', function (done) {
            let req = {};
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.BadRequestError('Missing Headers'));
            done();
        });

        it('Should Return Error when Authorization Header is missing', function (done) {
            let req = { headers : {} };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.BadRequestError('Missing Authorization Header'));
            done();
        });

        it('Should return Error when authorization scheme is missing', function (done) {
            let req = {
                headers: {
                    authorization : 'Auth Header'
                },
                authorization: {}
            };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.NotAuthorizedError('Wrong scheme'));
            done();
        });

        it('Should return Error when authorization scheme is not Basic', function (done) {
            let req = {
                headers: {
                    authorization : 'Auth Header'
                },
                authorization: { scheme : 'Signature'}
            };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.NotAuthorizedError('Wrong scheme'));
            done();
        });

        it('Should return Error when authorization.basic is missing', function (done) {
            let req = {
                headers: {
                    authorization : 'Auth Header'
                },
                authorization: {
                    scheme : 'Basic',
                }
            };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.InvalidCredentialsError('Credentials not provided'));
            done();
        });

        it('Should return Error when authorization.basic.username is missing', function (done) {
            let req = {
                headers: {
                    authorization : 'Auth Header'
                },
                authorization: {
                    scheme : 'Basic',
                    basic : {}
                }
            };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.InvalidCredentialsError('Wrong username'));
            done();
        });

        it('Should return Error when authorization.basic.username is wrong', function (done) {
            let req = {
                headers: {
                    authorization : 'Auth Header'
                },
                authorization: {
                    scheme : 'Basic',
                    basic : {
                        username : 'not test'
                    }
                }
            };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.InvalidCredentialsError('Wrong username'));
            done();
        });

        it('Should return Error when authorization.basic.password is missing', function (done) {
            let req = {
                headers: {
                    authorization : 'Auth Header'
                },
                authorization: {
                    scheme : 'Basic',
                    basic : {
                        username : 'test'
                    }
                }
            };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.InvalidCredentialsError('Wrong password'));
            done();
        });

        it('Should return Error when authorization.basic.password is wrong', function (done) {
            let req = {
                headers: {
                    authorization : 'Auth Header'
                },
                authorization: {
                    scheme : 'Basic',
                    basic : {
                        username : 'test',
                        password : 'not test'
                    }
                }
            };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.InvalidCredentialsError('Wrong password'));
            done();
        });

        it('Should return error when Content-Type is not jpeg', function (done) {
            let req = {
                headers: {
                    authorization: 'Auth Header'
                },
                authorization: {
                    scheme: 'Basic',
                    basic: {
                        username: 'test',
                        password: 'test'
                    }
                },
                is: sinon.stub().returns(false)
            };
            let err = validatePutRequest(req);
            expect(err).to.be.eql(new restify.InvalidContentError('Not jpeg'));
            done();
        });

        it('Should pass validation when credentials and Content-Type is OK', function (done) {
            let req = {
                headers: {
                    authorization: 'Auth Header'
                },
                authorization: {
                    scheme: 'Basic',
                    basic: {
                        username: 'test',
                        password: 'test'
                    }
                },
                is: sinon.stub().returns(true)
            };
            let err = validatePutRequest(req);
            expect(err).to.be.undefined;
            done();
        });
    });

    describe('Put handler', function () {
       let index;
       let putHandler;
       let validateRequestStub = sinon.stub();
       let validateRequestRestore;

       let fsMock = {
           writeFile : sinon.stub()
       };
       let fsMockRestore;
       let resMock = {
           send : sinon.spy()
       };
       before(function (done) {
           index = rewire('./../index.js');
           putHandler = index.__get__('put');
           fsMockRestore = index.__set__('fs', fsMock);
           validateRequestRestore = index.__set__('validatePutRequest', validateRequestStub);
           done();
       });

       beforeEach(function (done) {
           validateRequestStub.returns(undefined);
           fsMock.writeFile.reset();
           resMock.send.reset();
           done();
       });

       after(function (done) {
           fsMockRestore();
           done();
       });

       it('Should immediately send error response when req validation fails', function (done) {
           validateRequestStub.returns(new restify.BadRequestError('test error'));
           putHandler({}, resMock, sinon.spy());
           sinon.assert.calledOnce(resMock.send);
           sinon.assert.calledWith(resMock.send, sinon.match.instanceOf(restify.BadRequestError));
           done();
       });

        it('Should send error when body is missing', function (done) {
            putHandler({}, resMock, sinon.spy());
            sinon.assert.calledOnce(resMock.send);
            sinon.assert.calledWith(resMock.send, sinon.match.instanceOf(restify.InvalidContentError));
            done();
        });

        it('Should send error when body is not jpeg', function (done) {
            let req = {
                body : new Buffer(12)
            };
            putHandler(req, resMock, sinon.spy());
            sinon.assert.calledOnce(resMock.send);
            sinon.assert.calledWith(resMock.send, sinon.match.instanceOf(restify.InvalidContentError));
            done();
        });

        it('Should send error when body is not jpeg but different file', function (done) {
            let req = {};
            let ftypeRestore = index.__set__('filetype', sinon.stub().returns({ ext : 'png'}));
            putHandler(req, resMock, sinon.spy());
            sinon.assert.calledOnce(resMock.send);
            sinon.assert.calledWith(resMock.send, sinon.match.instanceOf(restify.InvalidContentError));
            ftypeRestore();
            done();
        });

        it('Should send error when unable to write file', function (done) {
            let req = {
                body : 'test'
            };
            fsMock.writeFile.callsArgWith(3, { msg : 'someErrorMsg'});
            let ftypeRestore = index.__set__('filetype', sinon.stub().returns({ ext : 'jpg'}));

            putHandler(req, resMock, sinon.spy());
            sinon.assert.calledOnce(fsMock.writeFile);
            sinon.assert.calledWith(fsMock.writeFile, './images/prasocam.jpg', 'test', 'binary', sinon.match.func);
            sinon.assert.calledOnce(resMock.send);
            sinon.assert.calledWith(resMock.send, sinon.match.instanceOf(restify.InternalServerError));
            ftypeRestore();
            done();
        });

        it('Should send Created when File Writtend', function (done) {
            let req = {
                body : 'test'
            };
            fsMock.writeFile.callsArg(3);
            let ftypeRestore = index.__set__('filetype', sinon.stub().returns({ ext : 'jpg'}));

            putHandler(req, resMock, sinon.spy());
            sinon.assert.calledOnce(fsMock.writeFile);
            sinon.assert.calledWith(fsMock.writeFile, './images/prasocam.jpg', 'test', 'binary', sinon.match.func);
            sinon.assert.calledOnce(resMock.send);
            sinon.assert.calledWith(resMock.send, 201, 'File written');
            ftypeRestore();
            done();
        });
    });

    describe('Main Function', function () {

        let serverMock = {
            use : sinon.spy(),
            put : sinon.spy(),
            get : sinon.spy(),
            listen : sinon.spy()
        };
        let createServerStub = sinon.stub(restify, 'createServer');
        createServerStub.returns(serverMock);

        before(function (done) {
            done();
        });

        beforeEach(function (done) {
            process.env.PRASO_PASS = 'test';
            process.env.PRASO_USER = 'test';
            createServerStub.resetHistory();
            serverMock.use.reset();
            serverMock.put.reset();
            serverMock.get.reset();
            serverMock.listen.reset();
            done();
        });

        after(function (done) {
            delete process.env.PRASO_USER;
            delete process.env.PRASO_PASS;
            restify.createServer.restore();
            done();
        });

        it('Should not add PUT handler when both username and password are not defined', function (done) {
            delete process.env.PRASO_USER;
            delete process.env.PRASO_PASS;
            let index = rewire('./../index.js');
            let main = index.__get__('Main');
            main();
            sinon.assert.calledTwice(serverMock.use);
            sinon.assert.calledOnce(serverMock.get);
            sinon.assert.notCalled(serverMock.put);
            done();
        });

        it('Should not add Static GET Handler', function (done) {
            let serveStaticSpy = sinon.spy(restify, 'serveStatic');
            let index = rewire('./../index.js');
            let main = index.__get__('Main');
            main();
            sinon.assert.calledTwice(serverMock.use);
            sinon.assert.calledOnce(serverMock.get);
            sinon.assert.calledOnce(serveStaticSpy);
            sinon.assert.calledWith(serveStaticSpy, {
                directory: './images',
                file : 'prasocam.jpg',
                maxAge: 12000
            });
            sinon.assert.calledOnce(serverMock.put);
            done();
        });
    });
});