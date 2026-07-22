/**
 * Scenario switcher runtime for UXD prototypes.
 * Active scenario: ?scenario=<id> (default when absent: "default").
 *
 * window.UxdScenario.get() / .set(id) / .subscribe(cb)
 */
(function (global) {
  'use strict';

  var PARAM = 'scenario';
  var DEFAULT_ID = 'default';
  var listeners = [];

  function readId() {
    try {
      var params = new URLSearchParams(global.location.search || '');
      var id = params.get(PARAM);
      if (id == null || id === '') return DEFAULT_ID;
      return id;
    } catch (e) {
      return DEFAULT_ID;
    }
  }

  function notify(id) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](id);
      } catch (e) {
        /* ignore listener errors */
      }
    }
  }

  function setId(id) {
    var next = id == null || id === '' ? DEFAULT_ID : String(id);
    var url;
    try {
      url = new URL(global.location.href);
    } catch (e) {
      return;
    }
    if (next === DEFAULT_ID) {
      url.searchParams.delete(PARAM);
    } else {
      url.searchParams.set(PARAM, next);
    }
    notify(next);
    // Full reload so page mocks re-read cleanly
    global.location.assign(url.toString());
  }

  function subscribe(cb) {
    if (typeof cb !== 'function') return function () {};
    listeners.push(cb);
    return function unsubscribe() {
      listeners = listeners.filter(function (fn) {
        return fn !== cb;
      });
    };
  }

  var api = {
    PARAM: PARAM,
    DEFAULT_ID: DEFAULT_ID,
    get: readId,
    set: setId,
    subscribe: subscribe,
  };

  global.UxdScenario = api;

  try {
    document.documentElement.setAttribute('data-uxd-scenario', readId());
  } catch (e) {
    /* SSR / early */
  }
})(typeof window !== 'undefined' ? window : globalThis);
