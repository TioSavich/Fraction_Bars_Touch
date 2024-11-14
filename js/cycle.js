// cycle.js

// Copyright University of Massachusetts Dartmouth
//
// Designed and built by James P. Burke and Jason Orrill
// Modified and developed by Hakan Sandir
//
// This Javascript version of Fraction Bars is based on
// the Transparent Media desktop version of Fraction Bars,
// which in turn was based on the original TIMA Bars software
// by John Olive and Leslie Steffe.
// We thank them for allowing us to update that product.

/* cycle.js 2013-02-19
   Public Domain.
   NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
   This code should be minified before deployment.
   See http://javascript.crockford.com/jsmin.html
   USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO NOT CONTROL.
*/

/*jslint evil: true, regexp: true */
/*members $ref, apply, call, decycle, hasOwnProperty, length, prototype, push, retrocycle, stringify, test, toString */

if (typeof JSON.decycle !== 'function') {
    JSON.decycle = function decycle(object) {
        "use strict";
        var objects = [],
            paths = [];

        return (function derez(value, path) {
            var i, name, nu;

            if (typeof value === 'object' && value !== null &&
                !(value instanceof Boolean) && !(value instanceof Date) &&
                !(value instanceof Number) && !(value instanceof RegExp) &&
                !(value instanceof String)) {

                for (i = 0; i < objects.length; i += 1) {
                    if (objects[i] === value) {
                        return { $ref: paths[i] };
                    }
                }

                objects.push(value);
                paths.push(path);

                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    nu = [];
                    for (i = 0; i < value.length; i += 1) {
                        nu[i] = derez(value[i], path + '[' + i + ']');
                    }
                } else {
                    nu = {};
                    for (name in value) {
                        if (Object.prototype.hasOwnProperty.call(value, name)) {
                            nu[name] = derez(value[name], path + '[' + JSON.stringify(name) + ']');
                        }
                    }
                }
                return nu;
            }
            return value;
        }(object, '$'));
    };
}

if (typeof JSON.retrocycle !== 'function') {
    JSON.retrocycle = function retrocycle($) {
        "use strict";
        var px = /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;

        (function rez(value) {
            var i, item, name, path;

            if (value && typeof value === 'object') {
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    for (i = 0; i < value.length; i += 1) {
                        item = value[i];
                        if (item && typeof item === 'object') {
                            path = item.$ref;
                            if (typeof path === 'string' && px.test(path)) {
                                value[i] = eval(path);
                            } else {
                                rez(item);
                            }
                        }
                    }
                } else {
                    for (name in value) {
                        if (typeof value[name] === 'object') {
                            item = value[name];
                            if (item) {
                                path = item.$ref;
                                if (typeof path === 'string' && px.test(path)) {
                                    value[name] = eval(path);
                                } else {
                                    rez(item);
                                }
                            }
                        }
                    }
                }
            }
        }($));

        return $;
    };
}
