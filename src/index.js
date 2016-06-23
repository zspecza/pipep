'use strict'

module.exports = pipeP

var _slice = [].slice

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
function pipeP () {
  // throw error if environment has no Promise support
  if (Promise == null) {
    throw new Error('[pipeP] Use a `Promise` polyfill for environments that do not support native ES2015 Promises.')
  }

  // throw error if environment has no Object.assign support
  if (!_is(Function, Object.assign)) {
    throw new Error('[pipeP] Use an `Object.assign` polyfill for environments that do not support native ES2015 Object properties.')
  }

  // flatten arguments in case they contain arrays
  var rest = _slice.apply(arguments).reduce(function concat (prev, next) {
    return prev.concat(next)
  }, [])

  // grab the initial handler from args
  var initial = rest.shift()

  // throw if first handler is missing
  if (!initial) {
    throw new SyntaxError('[pipeP] expects at least one argument')
  }

  // throw if first handler has incorrect type
  if (!_is(Function, initial)) {
    throw new SyntaxError('[pipeP] first handler must be a variadic function that returns a promise or value')
  }

  // create curried executor function that accepts n paramaters and evaluates all functions as a dynamic promise chain
  var _executor = _curryN(initial.length, function _executor () {
    var values = _slice.apply(arguments)

    // prevent mutations
    var clonedValues = values.map(function clone (val) {
      if (_is(Function, val.then)) { // if val is a promise, just return it
        return val
      } else if (_is(Array, val)) {
        return Promise.all([].concat(val)) // wait for resolution of arrays containing promises
      } else if (_is(Object, val)) {
        return Object.assign({}, val)
      }
      return val
    })

    // compute initial values
    var computedValues = Promise.all(clonedValues).then(function initialize (args) {
      return initial.apply(null, args)
    })

    // pipe all handlers through promise chain
    var promise = rest.reduce(function sequence (prev, next, i) {
      if (_is(Function, next)) {
        return prev.then(resolveArrayValue).then(next)
      }

      // if next handler is not a function, reject the promise
      return Promise.reject(new SyntaxError("[pipeP] expected handler '" + (i + 2) + "' to have type 'function', got '" + typeof next + "': '" + next + "'"))
    }, computedValues)

    // return resolved promise in case of arrays
    return promise.then(resolveArrayValue)
  })

  // ensure returned executor reports correct arity
  Object.defineProperty(_executor, 'length', {
    get: function get () {
      return initial.length
    }
  })

  return _executor
}

/**
 * Calls Promise.all on passed value if it is an array
 * @param  {*} val - value to resolve
 * @return {*} - if val is an array, a promise for all resolved elements, else the original value
 */
function resolveArrayValue (val) {
  return _is(Array, val) ? Promise.all(val) : val
}

/**
 * Checks that the type of value provided as second argument is the same as the constructor provided as first argument
 * @param  {Function} Ctor - Constructor function / class of the type to check on `val`
 * @param  {*}        val  - value undergoing type inspection
 * @return {Boolean}       - true if types match
 */
function _is (Ctor, val) {
  return val != null && val.constructor === Ctor || val instanceof Ctor
}

/**
 * Takes an arity and a function and returns a new function curried to arity
 * @param  {Number}   n  - arity
 * @param  {Function} fn - function to curry
 * @return {Function}    - curried function
 */
function _curryN (n, fn) {
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
    var rest = _slice.apply(arguments)
    var allArgs = args.concat(rest)
    return n > allArgs.length
      ? _curry(n, fn, allArgs)
      : fn.apply(null, allArgs.slice(0, n))
  }
}
