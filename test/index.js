'use strict'

import test from 'ava'
import pipe from '../src'

test('pipeP should throw if Promise is unavailable', (t) => {
  /* eslint-disable */
  const _Promise = Promise
  Promise = null
  t.throws(() => pipe(), '[pipeP] Use a `Promise` polyfill for environments that do not support native ES2015 Promises.')
  Promise = _Promise
  /* eslint-enable */
})

test('pipeP should throw if Object.assign is unavailable', (t) => {
  const _assign = Object.assign.bind(Object)
  Object.assign = null
  t.throws(() => pipe(), '[pipeP] Use an `Object.assign` polyfill for environments that do not support native ES2015 Object properties.')
  Object.assign = _assign
})

test('pipeP should throw if first handler is missing', (t) => {
  t.throws(() => pipe(), '[pipeP] expects at least one argument')
})

test('pipeP should throw if first handler has incorrect type', (t) => {
  t.throws(() => pipe(1, (x) => x + 2), '[pipeP] first handler must be a variadic function that returns a promise or value')
})

test('pipeP should reject if remaining arguments are of incorrect type', (t) => {
  t.throws(pipe((x) => x, 8)(1), "[pipeP] expected handler '2' to have type 'function', got 'number': '8'")
})

test('pipeP first handler can have no arity', (t) => {
  return pipe(() => 5)().then(t.is.bind(t, 5))
})

test('pipeP should coerce first return value to promise', (t) => {
  return pipe((x) => x, (x) => x + 2)(2).then(t.is.bind(t, 4))
})

test('pipeP should accept a mix of array and value arguments', (t) => {
  return pipe([(x) => x + 2], (x) => x * 2)(10).then(t.is.bind(t, 24))
})

test('pipeP initial handler should support variadic params', (t) => {
  return pipe((a, b) => a + b, (x) => x * x)(5, 2).then(t.is.bind(t, 49))
})

test('pipeP returned funcs are composable', (t) => {
  const add2 = pipe((x) => x, (x) => x + 2)
  const add2AndMultiplyBy3 = pipe(add2, (x) => x * 3)
  return add2AndMultiplyBy3(2).then(t.is.bind(t, 12))
})

test('pipeP returned funcs are curried with the length of the initial handlers args', (t) => {
  const add = pipe((a, b) => a + b)
  const increment = add(1)
  t.true(typeof increment === 'function')
  return increment(5).then(t.is.bind(t, 6))
})

test('pipeP funcs used as initial handler do not break when curried', (t) => {
  const add = pipe((a, b) => a + b)
  const square = pipe((n) => n * n)
  const addAndSquare = pipe(add, square)
  return Promise.all([
    addAndSquare(2, 3).then(t.is.bind(t, 25)),
    addAndSquare(1)(2).then(t.is.bind(t, 9))
  ])
})

test('pipeP automatically resolves an array of promises', (t) => {
  const delayedVal = (ms, val) => new Promise((resolve) => setTimeout(() => resolve(val), ms))
  const process = pipe(
    (res) => {
      t.deepEqual(res, ['fizz'])
      return [...res, delayedVal(100, 'foo'), delayedVal(100, 'bar')]
    },
    (res) => {
      t.deepEqual(res, ['fizz', 'foo', 'bar'])
      return [...res, delayedVal(100, 'baz')]
    },
    (res) => {
      t.deepEqual(res, ['fizz', 'foo', 'bar', 'baz'])
      return [...res, delayedVal(100, 'buzz')]
    }
  )
  return process([delayedVal(100, 'fizz')]).then(t.deepEqual.bind(t, ['fizz', 'foo', 'bar', 'baz', 'buzz']))
})

test('pipeP automatically resolves promises passed to initial handler', (t) => {
  return pipe((a, b) => {
    t.is(a, 5)
    t.deepEqual(b, { foo: 'bar' })
    return [a, b]
  })(Promise.resolve(5), Promise.resolve({ foo: 'bar' }))
})

test('values passed to pipeP are not mutated', (t) => {
  let x = { foo: 'bar' }
  return pipe(
    (y) => {
      y.foo = y.foo.toUpperCase()
      y.bar = 'baz'
      return y
    }
  )(x).then((y) => {
    t.false(x === y)
    t.deepEqual(x, { foo: 'bar' })
    t.deepEqual(y, { foo: 'BAR', bar: 'baz' })
  })
})
