/* global caches, Request, self, toolbox, importScripts */
/* jshint browser:true */
'use strict';


importScripts('/scripts/sw-toolbox.js');

const RESOURCES_CACHE_NAME = 'my-cache-v1';

function isLocal(url) {
	return (new URL(new Request(url).url).host === location.host);
}

var resources = [
	'/favicon.ico',
	'/images/pattern.svg',
	'/styles/main.css',
	'/scripts/main.js',
	'https://fonts.googleapis.com/css?family=Open+Sans:300italic,400,300,600,800',
	'https://s.gravatar.com/avatar/e137ba0321f12ecb5340680815b42c26?s=400',
	'/'
];
toolbox.precache(resources);

// Send a signal to all connected windows.
function reply(event) {
	return event.currentTarget.clients.matchAll({type: 'window'})
		.then(function (windows) {
			windows.forEach(function (w) {
				w.postMessage(event.data);
			});
		});
}

// Recieve messages from the client and reply back onthe same port
self.addEventListener('message', function(event) {
		Promise.resolve()
		.then(function () {

			if (event.data.action === 'STORE_ALL') {
				return caches.open(RESOURCES_CACHE_NAME)
					.then(function(cache) {
						return JSON.parse(event.data.urls).map(function (url) {
							console.log('Caching: ' + url);
							return cache.add(new Request(url, isLocal(url) ? {mode: 'no-cors'} : {}));
						});
					})
					.then(function (urlPromises) {
						return Promise.all(urlPromises);
					});
			}

			throw Error('Invalid Action');
		})
		.then(function () {
			event.data.success = true;
		}, function (err) {
			console.log(err);
			event.data.success = false;
			if (err) {
				event.data.message = err.message ? err.message : err;
			}
		})
		.then(function () {
			event.ports[0].postMessage(event.data);
		});
});

toolbox.options.networkTimeoutSeconds = 5;
toolbox.options.cache.name = RESOURCES_CACHE_NAME;
toolbox.router.get(/./, function (request, values, options) {

	if (
		request.url.match(/(\.mp4|\.webm|\.avi|\.wmv)$/i) ||
		request.url.match(/data:/i)
	) {
		return toolbox.networkOnly(request, values, options);
	}

	if (request.mode === 'navigate') {
		options.networkTimeoutSeconds = 2;
		return toolbox.networkFirst(request, values, options);
	}

	options = options || {};

	const defaultRoute = (location.protocol === 'http:' || location.hostname === 'localhost') ? toolbox.networkFirst : toolbox.fastest;
	return defaultRoute(request, values, options);
});
