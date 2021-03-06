// Load modules

var Boom = require('boom');
var Code = require('code');
var Hapi = require('hapi');
var Lab = require('lab');

// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


it('sets session value then gets it back (store mode)', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                var returnValue = request.session.set('some', { value: '2' });
                expect(returnValue.value).to.equal('2');
                returnValue = request.session.set('one', 'xyz');
                expect(returnValue).to.equal('xyz');
                request.session.clear('one');
                return reply(Object.keys(request.session._store).length);
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                var some = request.session.get('some');
                some.raw = 'access';
                request.session.touch();
                return reply(some.value);
            }
        },
        {
            method: 'GET', path: '/3', handler: function (request, reply) {

                var raw = request.session.get('some').raw;
                request.session.reset();
                return reply(raw);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal(1);
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.not.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.result).to.equal('2');
                    var header2 = res2.headers['set-cookie'];
                    var cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } }, function (res3) {

                        expect(res3.result).to.equal('access');
                        done();
                    });
                });
            });
        });
    });
});

it('sets session value and wait till cache expires then fail to get it back', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        },
        cache: {
            expiresIn: 1
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '2' });
                request.session.set('one', 'xyz');
                request.session.clear('one');
                return reply(Object.keys(request.session._store).length);
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                var some = request.session.get('some');
                return reply(some);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal(1);
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.not.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                setTimeout(function () {

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                        expect(res2.result).to.equal(null);
                        done();
                    });
                }, 10);
            });
        });
    });
});

it('sets session value then gets it back (cookie mode)', function (done) {

    var options = {
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '2' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session.get('some').value);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.result).to.equal('2');
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (hybrid mode)', function (done) {

    var options = {
        maxCookieSize: 10,
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '12345678901234567890' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session.get('some').value);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.result).to.equal('12345678901234567890');
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (lazy mode)', function (done) {

    var options = {
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.lazy(true);
                request.session.some = { value: '2' };
                request.session._test = { value: '3' };
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session.some.value);
            }
        },
        {
            method: 'GET', path: '/3', handler: function (request, reply) {

                return reply(request.session._test);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.result).to.equal('2');
                    var header2 = res2.headers['set-cookie'];
                    var cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } }, function (res3) {

                        expect(res3.result).to.be.null();
                    });
                    done();
                });
            });
        });
    });
});

it('no keys when in session (lazy mode)', function (done) {

    var options = {
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.lazy(true);
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session._store);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.result).to.be.empty();
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (clear)', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                var returnValue = request.session.set({
                    some: '2',
                    and: 'thensome'
                });
                expect(returnValue.some).to.equal('2');
                expect(returnValue.and).to.equal('thensome');
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                var some = request.session.get('some', true);
                return reply(some);
            }
        },
        {
            method: 'GET', path: '/3', handler: function (request, reply) {

                var some = request.session.get('some');
                return reply(some || '3');
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('1');
                var header = res.headers['set-cookie'];
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.result).to.equal('2');
                    var header2 = res2.headers['set-cookie'];
                    var cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } }, function (res3) {

                        expect(res3.result).to.equal('3');
                        done();
                    });
                });
            });
        });
    });
});

it('returns 500 when storing cookie in invalid cache by default', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password'
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set('some', { value: '2' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                return reply(request.session.get('some'));
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                var header = res.headers['set-cookie'];
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server._caches._default.client.stop();
                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });
});

it('fails setting session key/value because of bad key/value arguments', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server({ debug: false });
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                request.session.set({ 'some': '2' }, '2');
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                request.session.set(45.68, '2');
                return reply('1');
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.statusCode).to.equal(500);
                server.inject({ method: 'GET', url: '/2' }, function (res2) {

                    expect(res2.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });
});

it('fails setting session key/value because of failed cache set', { parallel: false }, function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var cache = require('./test-cache.js');
    var setRestore = cache.prototype.set;
    cache.prototype.set = function (key, value, ttl, callback) {

        return callback(new Error('Error setting cache'));
    };
    var hapiOptions = {
        cache: {
            engine: require('./test-cache.js')
        },
        debug: false
    };
    var server = new Hapi.Server(hapiOptions);
    server.connection();


    var handler = function (request, reply) {

        request.session.set('some', 'value');
        return reply();
    };

    server.route({ method: 'GET', path: '/', handler: handler });

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(500);
                cache.prototype.set = setRestore;
                done();
            });
        });
    });
});

it('does not try to store session when cache not ready if errorOnCacheNotReady set to false', { parallel: false }, function (done) {

    var options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var cache = require('./test-cache');
    var getRestore = cache.prototype.get;
    var isReadyRestore = cache.prototype.isReady;

    cache.prototype.get = function (callback){

        callback(new Error('Error getting cache'));
    };

    cache.prototype.isReady = function (){

        return false;
    };

    var hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    var server = new Hapi.Server(hapiOptions);
    server.connection();

    var preHandler = function (request, reply) {

        request.session.set('some', 'value');
        return reply();
    };

    var handler = function (request, reply) {

        var some = request.session.get('some');
        return reply(some);
    };

    server.route({
        method: 'GET',
        path: '/',
        config: {
            pre: [
                { method: preHandler }
            ],
            handler: handler
        }
    });

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('value');
                cache.prototype.get = getRestore;
                cache.prototype.isReady = isReadyRestore;
                done();
            });
        });
    });
});

it('fails loading session from invalid cache and returns 500', { parallel: false }, function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var cache = require('./test-cache.js');

    var hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    var server = new Hapi.Server(hapiOptions);
    server.connection();


    server.route([
        {
            method: 'GET', path: '/', handler: function (request, reply) {

                request.session.set('some', 'value');
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                handlerSpy();
                request.session.set(45.68, '2');
                return reply('1');
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/' }, function (res) {

                var header = res.headers['set-cookie'];
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('1');

                var getRestore = cache.prototype.get;
                var isReadyRestore = cache.prototype.isReady;

                cache.prototype.get = function (callback){

                    callback(new Error('Error getting cache'));
                };

                cache.prototype.isReady = function (){

                    return false;
                };

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.statusCode).to.equal(500);
                    cache.prototype.get = getRestore;
                    cache.prototype.isReady = isReadyRestore;
                    done();
                });
            });
        });
    });
});

it('does not load from cache if cache is not ready and errorOnCacheNotReady set to false', { parallel: false }, function (done) {

    var options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var cache = require('./test-cache');

    var hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    var server = new Hapi.Server(hapiOptions);
    server.connection();


    server.route([{
        method: 'GET', path: '/', handler: function (request, reply) {

            request.session.set('some', 'value');
            return reply();
        }
    },
    {
        method: 'GET', path: '/2', handler: function (request, reply) {

            var value = request.session.get('some');
            return reply(value || '2');
        }
    }]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/' }, function (res) {

                var header = res.headers['set-cookie'];
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);
                var isReadyRestore = cache.prototype.isReady;

                cache.prototype.isReady = function (){

                    return false;
                };

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('2');
                    cache.prototype.isReady = isReadyRestore;
                    done();
                });
            });
        });
    });
});

it('still loads from cache when errorOnCacheNotReady option set to false but cache is ready', { parallel: false }, function (done) {

    var options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var cache = require('./test-cache');

    var hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    var server = new Hapi.Server(hapiOptions);
    server.connection();


    server.route([{
        method: 'GET', path: '/', handler: function (request, reply) {

            request.session.set('some', 'value');
            return reply();
        }
    },
    {
        method: 'GET', path: '/2', handler: function (request, reply) {

            var value = request.session.get('some');
            return reply(value || '2');
        }
    }]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/' }, function (res) {

                var header = res.headers['set-cookie'];
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('2');
                    done();
                });
            });
        });
    });
});

it('still saves session as cookie when cache is not ready if maxCookieSize is set and big enough', { parallel: false }, function (done) {

    var options = {
        maxCookieSize: 500,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var cache = require('./test-cache');

    var hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };

    var server = new Hapi.Server(hapiOptions);
    server.connection();
    server.route([{
        method: 'GET', path: '/', handler: function (request, reply) {

            request.session.set('some', 'value');
            return reply();
        }
    },
    {
        method: 'GET', path: '/2', handler: function (request, reply) {

            var value = request.session.get('some');
            return reply(value || '2');
        }
    }]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/' }, function (res) {

                var header = res.headers['set-cookie'];
                var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);
                var isReadyRestore = cache.prototype.isReady;

                cache.prototype.isReady = function (){

                    return false;
                };

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('value');
                    cache.prototype.isReady = isReadyRestore;
                    done();
                });
            });
        });
    });
});

it('fails generating session cookie header value (missing password)', function (done) {

    var server = new Hapi.Server({ debug: false });
    server.connection();

    server.route({
        method: 'GET', path: '/1', handler: function (request, reply) {

            request.session.set('some', { value: '2' });
            return reply('1');
        }
    });

    server.register(require('../'), function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });
});

it('sends back a 400 if not ignoring errors on bad session cookie', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false,
            ignoreErrors: false
        }
    };

    var headers = {
        Cookie: 'session=Fe26.2**deadcafe' // bad session value
    };

    var server = new Hapi.Server({ debug: false });
    server.connection();

    server.route({
        method: 'GET', path: '/1', handler: function (request, reply) {

            request.session.set('some', { value: '2' });
            return reply('1');
        }
    });

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1', headers: headers }, function (res) {

                expect(res.statusCode).to.equal(400);
                done();
            });
        });
    });
});

it('fails to store session because of state error', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var headers = {
        Cookie: 'session=Fe26.2**deadcafe' // bad session value
    };

    var server = new Hapi.Server({ debug: false });
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                return reply(Object.keys(request.session._store).length);
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject({ method: 'GET', url: '/1', headers: headers }, function (res) {

                expect(res.result).to.equal(0);
                done();
            });
        });
    });
});

it('ignores requests when session is not set (error)', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server();
    server.connection();
    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

            reply('ok');
        }
    });

    server.ext('onRequest', function (request, reply) {

        reply(Boom.badRequest('handler error'));
    });

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(400);
                expect(res.result.message).to.equal('handler error');
                done();
            });
        });
    });
});

describe('flash()', function () {

    it('should get all flash messages when given no arguments', function (done) {

        var options = {
            cookieOptions: {
                password: 'password'
            }
        };
        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'GET',
            path: '/1',
            config: {
                handler: function (request, reply) {

                    request.session.flash('error', 'test error 1');
                    request.session.flash('error', 'test error 2');
                    request.session.flash('test', 'test 1', true);
                    request.session.flash('test', 'test 2', true);
                    reply(request.session._store);
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/2',
            config: {
                handler: function (request, reply) {

                    var flashes = request.session.flash();
                    reply({
                        session: request.session._store,
                        flashes: flashes
                    });
                }
            }
        });

        server.register({ register: require('../'), options: options }, function (err) {

            expect(err).to.not.exist();
            server.start(function (err) {

                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    expect(res.result._flash.error).to.deep.equal(['test error 1', 'test error 2']);
                    expect(res.result._flash.test).to.deep.equal('test 2');

                    var header = res.headers['set-cookie'];
                    expect(header.length).to.equal(1);
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                        expect(res2.result.session._flash.error).to.not.exist();
                        expect(res2.result.flashes).to.exist();
                        done();
                    });
                });
            });
        });
    });

    it('should delete on read', function (done) {

        var options = {
            cookieOptions: {
                password: 'password'
            }
        };
        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'GET',
            path: '/1',
            config: {
                handler: function (request, reply) {

                    request.session.flash('error', 'test error');
                    reply(request.session._store);
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/2',
            config: {
                handler: function (request, reply) {

                    var errors = request.session.flash('error');
                    var nomsg = request.session.flash('nomsg');
                    reply({
                        session: request.session._store,
                        errors: errors,
                        nomsg: nomsg
                    });
                }
            }
        });

        server.register({ register: require('../'), options: options }, function (err) {

            expect(err).to.not.exist();
            server.start(function (err) {

                server.inject({ method: 'GET', url: '/1' }, function (res) {

                    expect(res.result._flash.error).to.exist();
                    expect(res.result._flash.error.length).to.be.above(0);

                    var header = res.headers['set-cookie'];
                    expect(header.length).to.equal(1);
                    var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, function (res2) {

                        expect(res2.result.session._flash.error).to.not.exist();
                        expect(res2.result.errors).to.exist();
                        expect(res2.result.nomsg).to.exist();
                        done();
                    });
                });
            });
        });
    });
});

it('stores blank sessions when storeBlank is not given', function (done) {

    var options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                return reply('heyo!');
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            var stores = 0;
            var fn = server._caches._default.client.set;
            server._caches._default.client.set = function () {

                stores++;
                fn.apply(this, arguments);
            };

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(stores).to.equal(1);
                expect(res.headers['set-cookie'].length).to.equal(1);
                done();
            });
        });
    });
});

it('does not store blank sessions when storeBlank is false', function (done) {

    var options = {
        storeBlank: false,
        maxCookieSize: 0,
        cookieOptions: {
            password: 'password',
            isSecure: false
        }
    };

    var server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: function (request, reply) {

                return reply('heyo!');
            }
        },
        {
            method: 'GET', path: '/2', handler: function (request, reply) {

                request.session.set('hello', 'world');
                return reply('should be set now');
            }
        }
    ]);

    server.register({ register: require('../'), options: options }, function (err) {

        expect(err).to.not.exist();
        server.start(function () {

            var stores = 0;
            var fn = server._caches._default.client.set;
            server._caches._default.client.set = function () {

                stores++;
                fn.apply(this, arguments);
            };

            server.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(stores).to.equal(0);
                expect(res.headers['set-cookie']).to.be.undefined();

                server.inject({ method: 'GET', url: '/2' }, function (res2) {

                    expect(stores).to.equal(1);
                    expect(res2.headers['set-cookie'].length).to.equal(1);
                    done();
                });
            });
        });
    });
});
