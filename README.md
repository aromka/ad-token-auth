# adTokenAuth

Angular token auth, was made to work with [jwt-auth plugin for Laravel](https://github.com/tymondesigns/jwt-auth) that handles JWT auth token + refresh mechanism.

Originally inspired by [ng-token-auth](https://github.com/lynndylanhurley/ng-token-auth).

### Installation

	bower install ad-token-auth --save-dev
	
Include `bower_components/ad-token-auth/src/ad-token-auth.min.js`
	

### Example Usage
	
	angular.module('myApp', ['adTokenAuth'])
	.config(function($authProvider) {
	
		// Available settings
		$authProvider
			.config({
				apiUrl: 'http://api.example.com',
	            signOutUrl: '/auth/logout',
	            emailSignInPath: '/auth/login',
	            tokenValidationPath: '/auth/validate',
	            tokenRefreshPath: '/auth/refresh',
	            validateOnPageLoad: true, // if 'true' - will try to validate user on page load
	            tokenFormat: {
	                'Authorization': 'Bearer {{ token }}'
	            }
			});
	})
	.run(function($rootScope, $location, Session) {
	
		// Session is an example service that would store 
		// logged in user and login state
	
		// handle successful auth
		var authSuccess = function(data) {
			Auth.setIsLoggedIn(true);
			Auth.setUser(data.user);
		};
	
		// handle failed auth
		var authFail = function(shouldRedirect) {
			Auth.reset();
			if (shouldRedirect) {
				$location.url('/login');
			}
		};
		
		// Available event listeners
	
		// handle auth events
		// `type` can be: 'login' or 'validation'
		$rootScope.$on('auth:success', function(e, type, data) {
			authSuccess(data);
		});
	
		// handle failed auth
		// `type` can be: 'login' or 'validation'
		$rootScope.$on('auth:error', function(e, type, err) {
			authFail(type !== 'login');
		});
		
		// handle successful logout
		$rootScope.$on('auth:logout-success', function() {
			$location.url('/');
		});
		
		// handle failed logout
		$rootScope.$on('auth:logout-error', function(e, err) {
			console.error('Logout failed', err);
		});
		
	})
	.controller('AuthController', function($scope, $auth) {
	
		// login function
		$scope.login = function() {
			var params = {
				email: 'user@example.com',
				password: 'password'
			};
		
			$auth.signIn(params)
				 .then(function(data) {
				    console.log('got success response', data);
				 })
				 .catch(function(err) {
				    console.log('failed login', err);
				 });
		};
	
		// logout function
		$scope.logout = function() {
			$auth.signOut();
		};
	
	});
	
	
### Available methods

**signIn(params)**

Tries to sign user in. Accepts object that is passed in POST request.

Returns a promise.


**signOut()**

Tries to sign user out and clears the data from localStorage.

Returns a promise.

**userIsAuthenticated()**

Checks if token is set in localStorage and also if user is set as already logged in.

**validateUser()**

Checks if user is already logged in, if not, checks for token in localStorage and tries to validate it if exists.
 
Returns a promise.
 
**validateToken()**
 
Validates a token.

Returns a promise.

**invalidateTokens()**

Clears token from localStorage and sets user as logged out.
