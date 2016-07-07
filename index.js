'use strict'

// enable point-free capabilities
var call = curry(_call)
var replace = curry(_replace)
var resolvePromises = curry(_resolvePromises)

/**
 * returns a variadic function that pipes its arguments through a promise chain
 * @param {arguments} ...args - argument list of handlers
 * @param {Array<Function>||Function} initial - initial handler
 * which is:
 * - (1) a variadic function returning a single promise or value
 * - (2) a unary function returning a single promise or value
 * - (3) an array wherein the first element is either (1) or (2) and remaining elements are (2)
 * @param {Array|Function} ...rest - remaining handlers
 * which are:
 * - (1) a unary function returning a single promise or value
 * - (2) an array containing (1)
 * @return {Function} - Promise-chain executing variadic function that returns a promise for the final computation of its arguments.
 */
module.exports = function pipeP () {
  // throw error if environment has no Promise support
  if (typeof Promise === 'undefined' || Promise === null) {
    throw new ReferenceError(s('Use a `Promise` polyfill for environments that do not support native ES2015 Promises.'))
  }

  // throw error if environment has no Object.assign support
  if (!is(Function, Object.assign)) {
    throw new ReferenceError(s('Use an `Object.assign` polyfill for environments that do not support native ES2015 Object properties.'))
  }

  // flatten arguments in case they contain arrays
  var remainingHandlers = flatten(arrayFrom(arguments))

  // grab the initial handler from args
  var initialHandler = remainingHandlers.shift()

  // throw if first handler is missing
  if (initialHandler == null) {
    throw new ReferenceError(s('expects at least one argument'))
  }

  // throw if first handler has incorrect type
  if (!is(Function, initialHandler)) {
    throw new TypeError(s('first handler must be a variadic function that returns a promise or value'))
  }

  // store arity of initial handler for future reference
  var initialArity = length(initialHandler)

  // create curried sequencer function that accepts n paramaters and evaluates all functions as a dynamic promise chain
  var callSequence = curryN(initialArity, function executor () {
    // duplicate values & resolve all individual promises
    var resolvedValues = arrayFrom(arguments).map(resolvePromises({ duplicate: true }))

    // compute initial values
    var initialComputation = Promise.all(resolvedValues).then(call(initialHandler))

    // pipe all handlers through promise chain
    var promiseForFinalComputation = remainingHandlers.reduce(function sequence (prev, next, i) {
      return is(Function, next)
        // resolve individual promises before calling next handler
        ? prev.then(resolvePromises(null)).then(next)
        // if next handler is not a function, reject the promise
        : Promise.reject(new TypeError(s("expected handler '%d' to have type 'function', got '%s': '%s'", i + 2, typeof next, next)))
    }, initialComputation)

    // resolve individual promises in final computation
    return promiseForFinalComputation.then(resolvePromises(null))
  })

  try {
    // ensure sequencer reports correct arity so currying works when callSequence is the first handler in a sequence
    Object.defineProperty(callSequence, 'length', {
      get: function get () {
        return initialArity
      }
    })
  } catch (error) {} // supress errors on Object.defineProperty in case of IE8

  // return the promise-sequence-calling curried function
  return callSequence
}

/**
 * Calls Promise.all on passed value if it is an array
 * Duplicates value if required.
 * @param  {Object} opts - options
 * @param  {*} val - value to resolve
 * @return {*} - if val is an array, a promise for all resolved elements, else the original value
 */
function _resolvePromises (opts, val) {
  opts = opts || {}
  var duplicate = opts.duplicate
  if (is(Array, val)) {
    return Promise.all(duplicate ? concat([], val) : val)
  } else if (duplicate && is(Object, val) && !is(Function, val.then)) {
    return Object.assign({}, val)
  }
  return val
}

/**
 * Flattens an array of arrays and values into an array of values
 * @param  {Array} list - the array to flatten
 * @return {Array} - flattened result
 */
function flatten (list) {
  return list.reduce(concat, [])
}

/**
 * Converts an array-like object into an array
 * @param  {Object} args - an array-like object
 * @return {Array} - array representation
 */
function arrayFrom (args) {
  return [].slice.apply(args)
}

/**
 * Returns the length property of passed value
 * @param  {*} val - Object to access length on
 * @return {Number} - Object's length value
 */
function length (val) {
  return val.length
}

/**
 * Calls a function with supplied arguments
 * @param  {Function} fn - function to call
 * @param  {Array} args - array of arguments to supply
 * @return {*} - return value of function `fn` called with `args`
 */
function _call (fn, args) {
  return fn.apply(null, args)
}

/**
 * Concatenates "b" onto "a"
 * @param  {String|Array} a - the value in which to concat
 * @param  {*} b - value to concat onto "a"
 * @return {String|Array} - the new value containing "a" & "b" merged
 */
function concat (a, b) {
  return a.concat(b)
}

/**
 * Checks that the type of value provided as second argument is the same as the constructor provided as first argument
 * @param  {Function} Ctor - Constructor function / class of the type to check on `val`
 * @param  {*}        val  - value undergoing type inspection
 * @return {Boolean}       - true if types match
 */
function is (Ctor, val) {
  return typeof val !== 'undefined' && val !== null && val.constructor === Ctor || val instanceof Ctor
}

/**
 * Takes a function and curries it to it's own arity
 * @param  {Function} fn - function to curry
 * @return {Function} - curried function
 */
function curry (fn) {
  return _curry(length(fn), fn)
}

/**
 * Takes an arity and a function and returns a new function curried to arity
 * @param  {Number}   n  - arity
 * @param  {Function} fn - function to curry
 * @return {Function}    - curried function
 */
function curryN (n, fn) {
  return _curry(n, fn)
}

/**
 * Returns a function of n-arity partially applied with supplied arguments
 * @param  {Number}   n         - arity of function to partially apply
 * @param  {Function} fn        - function to partially apply
 * @param  {Array}    args = [] - arguments to apply to new function
 * @return {Function}           - partially-applied function
 */
function _curry (n, fn, args) {
  args = args || []
  return function partial () {
    var rest = arrayFrom(arguments)
    var allArgs = concat(args, rest)
    return n > length(allArgs)
      ? _curry(n, fn, allArgs)
      : _call(fn, allArgs.slice(0, n))
  }
}

/**
 * Replaces `pattern` found in `str` with `val`
 * @param  {Regex|String} pattern - the pattern to replace
 * @param  {*} val - the value that will replace pattern
 * @param  {String} str - the string which is being manipulated
 * @return {String} - the new string
 */
function _replace (pattern, str, val) {
  return str.replace(pattern, val)
}

/**
 * Generic error message utility. Takes a formatted string
 * and returns that string with a `[pipep]` label.
 * Behaves in similar fashion to `sprintf`
 * @return {String} - the new message
 */
function s () {
  var args = arrayFrom(arguments)
  var msg = args.shift()
  return args.reduce(replace(/(?:%s|%d)/), '[pipeP] ' + msg)
}
