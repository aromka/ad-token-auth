(function (angular) {
    "use strict";

    angular.module('adTokenAuth', [])
        .provider('$auth', function () {
            var config = {
                apiUrl: '/api',
                signOutUrl: '/auth/logout',
                emailSignInPath: '/auth/login',
                tokenValidationPath: '/auth/validate',
                tokenRefreshPath: '/auth/refresh',
                validateOnPageLoad: true,
                tokenFormat: {
                    'Authorization': 'Bearer {{ token }}'
                }
            };

            // storage obj
            // in case local storage is disabled - use memory
            var storage = {
                _storage: {},
                setItem: function(key, val) {
                    try {
                        window
                            .localStorage
                            .setItem(key, val);
                    } catch (e) {
                        this._storage[key] = val;
                    }
                },
                getItem: function(key) {
                    var val;
                    try {
                        val = window.localStorage.getItem(key)
                    } catch(e) {
                        val = this._storage[key];
                    }
                    return val;
                },
                removeItem: function(key) {
                    try {
                        window.localStorage.removeItem(key);
                    } catch(e) {
                        delete this._storage[key];
                    }
                }
            };

            return {
                // set config
                config: function (params) {
                    config = angular.extend(config, params || {});
                },

                $get: function ($http, $q, $location, $window, $timeout, $rootScope, $interpolate) {
                    return {
                        header: null,
                        d: null,
                        isLoggedIn: false,

                        // login
                        signIn: function (params) {
                            this.dInit();
                            var that = this;
                            $http
                                .post(this.config().apiUrl + this.config().emailSignInPath, params)
                                .then(function (res) {
                                    $rootScope.$broadcast('auth:success', 'login', res.data);
                                    that.handleValidAuth(res.data, true);
                                    that.dResolve();
                                })
                                .catch(function (res) {
                                    $rootScope.$broadcast('auth:error', 'login', res);
                                    that.dReject({
                                        reason: 'unauthorized',
                                        errors: ['Invalid credentials']
                                    });
                                });
                            return this.d.promise;
                        },

                        // check if user is authenticated
                        userIsAuthenticated: function () {
                            return this.retrieveData('auth_headers') && this.isLoggedIn;
                        },

                        // validate user
                        validateUser: function () {
                            if (this.d) {
                                return this.d.promise;
                            }

                            this.dInit();
                            if (this.userIsAuthenticated()) {
                                this.dResolve();
                            } else {
                                if (!this.isEmpty(this.retrieveData('auth_headers'))) {
                                    this.validateToken();
                                } else {
                                    this.dReject({
                                        reason: 'unauthorized',
                                        errors: ['No credentials']
                                    });
                                    $rootScope.$broadcast('auth:invalid');
                                }
                            }
                            return this.d.promise;
                        },

                        // validate token
                        validateToken: function () {
                            var that = this;
                            return $http
                                .post(this.config().apiUrl + this.config().tokenValidationPath, {})
                                .then(function (res) {
                                    $rootScope.$broadcast('auth:success', 'validation', res.data);
                                    that.handleValidAuth(res.data);
                                    that.dResolve();
                                })
                                .catch(function (res) {
                                    $rootScope.$broadcast('auth:error', 'validation', res);
                                    return that.dReject({
                                        reason: 'unauthorized',
                                        errors: res && res.errors
                                    });
                                });
                        },

                        // invalidate all data
                        invalidateTokens: function () {
                            this.isLoggedIn = false;
                            this.deleteData('auth_headers');
                        },

                        // logout
                        signOut: function () {
                            var that = this;
                            return $http
                                .delete(this.config().apiUrl + this.config().signOutUrl)
                                .then(function () {
                                    $rootScope.$broadcast('auth:logout-success');
                                })
                                .catch(function (res) {
                                    $rootScope.$broadcast('auth:logout-error', res);

                                })
                                .finally(function () {
                                    that.invalidateTokens();
                                });
                        },

                        // handle valid auth
                        handleValidAuth: function (data, isSetHeader) {
                            this.isLoggedIn = true;
                            if (isSetHeader) {
                                this.setAuthHeaders(this.buildHeaders({
                                    token: data.token
                                }));
                            }
                        },

                        // build headers
                        buildHeaders: function (ctx) {
                            var key, val,
                                headers = {},
                                _ref = this.config().tokenFormat;

                            for (key in _ref) {
                                val = _ref[key];
                                headers[key] = $interpolate(val)(ctx);
                            }
                            return headers;
                        },

                        // set headers
                        setAuthHeaders: function (headers) {
                            var h = angular.extend(this.retrieveData('auth_headers') || {}, headers);
                            return this.persistData('auth_headers', h);
                        },

                        getAuthHeaders: function () {
                            return this.retrieveData('auth_headers');
                        },

                        // save data to local storage
                        persistData: function (key, val) {
                            return storage.setItem(key, JSON.stringify(val));
                        },

                        // get data from local storage
                        retrieveData: function (key) {
                            var val = storage.getItem(key);
                            if (val) {
                                try {
                                    return JSON.parse(val);
                                } catch(e) {}
                            }
                            return null;
                        },

                        // delete data from local storage
                        deleteData: function (key) {
                            return storage.removeItem(key);
                        },

                        // defer handling
                        dInit: function () {
                            this.d = $q.defer();
                            return this.d;
                        },
                        dResolve: function () {
                            if (this.d != null) {
                                this.d.resolve(this.user);
                                this.dReset();
                            }
                        },
                        dReject: function (reason) {
                            this.invalidateTokens();
                            if (this.d != null) {
                                this.d.reject(reason);
                                this.dReset();
                            }
                        },
                        dReset: function () {
                            var that = this;
                            $timeout(function () {
                                that.d = null;
                            });
                        },

                        // get config
                        config: function () {
                            return config;
                        },

                        // helper function
                        isEmpty: function (obj) {
                            var key, val;
                            if (!obj || obj.length === 0) {
                                return true;
                            } else if (obj.length > 0) {
                                return false;
                            }
                            for (key in obj) {
                                val = obj[key];
                                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                                    return false;
                                }
                            }
                            return true;
                        }
                    };
                }
            };
        })

        // setup interceptors
        .config(function ($httpProvider) {

            $httpProvider
                .interceptors
                .push(['$injector', '$q', function ($injector, $q) {

                    // invalidate and redirect
                    var invalidate = function () {
                        $injector.invoke(['$rootScope', '$auth', function ($rootScope, $auth) {
                            $auth.invalidateTokens();
                            $rootScope.$broadcast('auth:error');
                        }]);
                    };

                    return {
                        request: function (config) {
                            $injector.invoke(['$http', '$auth', function ($http, $auth) {
                                var key, val, _ref, _results;
                                if (config.url.match($auth.config().apiUrl)) {
                                    _ref = $auth.retrieveData('auth_headers');
                                    _results = [];
                                    for (key in _ref) {
                                        val = _ref[key];
                                        _results.push(config.headers[key] = val);
                                    }
                                    return _results;
                                }
                            }]);
                            return config;
                        },

                        responseError: function (reject) {

                            var $auth = $injector.get('$auth');

                            // intercept 401 errors, except 'login' path
                            if (reject.status === 401 &&
                                reject.config.url.indexOf($auth.config().emailSignInPath) === -1
                            ) {

                                // if token expired - refresh and try again
                                if (reject.data &&
                                    reject.data[0] === 'token_expired' &&
                                    reject.config.url.indexOf($auth.config().tokenRefreshPath) === -1
                                ) {

                                    var d = $q.defer();
                                    $injector.invoke(['$http', '$auth', function ($http, $auth) {

                                        // check if we have auth headers set
                                        var headers = $auth.retrieveData('auth_headers'),
                                            urlRefreshToken = $auth.config().apiUrl + $auth.config().tokenRefreshPath;

                                        if ($auth.isEmpty(headers)) {
                                            d.reject(reject);
                                        }

                                        // try to refresh the token
                                        $http
                                            .post(urlRefreshToken)
                                            .then(function (res) {
                                                // persist the new token
                                                $auth.handleValidAuth(res.data, true);

                                                // retry original request with the new token
                                                var $http = $injector.get('$http');
                                                return $http(reject.config);
                                            })

                                            .then(function (res) {
                                                d.resolve(res);
                                            })

                                            // token refresh failed
                                            .catch(function (err) {
                                                d.reject(err);
                                            })

                                    }]);

                                    return d.promise;
                                }

                                // invalidate all
                                invalidate();
                            }

                            return $q.reject(reject);
                        }
                    };
                }
                ]);
        })

        // run
        .run(function ($auth) {
            if ($auth.config().validateOnPageLoad) {
                $auth.validateUser();
            }
        });
})(angular);