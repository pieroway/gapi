/**
 * =================================================================
 * Polyfills for older/buggy mobile browser support
 * =================================================================
 */

(function () {
  "use strict";

  /**
   * Polyfill for URLSearchParams.keys()
   * Some mobile browsers might have an incomplete implementation of URLSearchParams,
   * causing an error like "undefined is not an object (evaluating 'b.keys')".
   * This ensures the .keys() method is a reliable iterator.
   */
  if (window.URLSearchParams && !URLSearchParams.prototype.keys) {
    URLSearchParams.prototype.keys = function () {
      return this.toString().split('&').map(pair => pair.split('=')[0]);
    };
  }
})();

