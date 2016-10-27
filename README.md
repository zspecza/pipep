[![build status](https://img.shields.io/travis/declandewet/pipep.svg?style=flat-square)](https://travis-ci.org/declandewet/pipep) [![codecov.io](https://img.shields.io/codecov/c/gh/declandewet/pipep.svg?style=flat-square)](https://codecov.io/gh/declandewet/pipep?branch=master) [![dependency status](https://img.shields.io/david/declandewet/pipep.svg?style=flat-square)](https://david-dm.org/declandewet/pipep) [![dev dependency status](https://img.shields.io/david/dev/declandewet/pipep.svg?style=flat-square)](https://david-dm.org/declandewet/pipep#info=devDependencies)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

# pipeP

Functional, composable, immutable and curried promise sequences that automatically handle Promise resolution. 0.8kb Minified & GZIP'd. Inspired by the function of the same name in [Ramda](http://ramdajs.com/0.21.0/docs/#pipeP).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
# Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
  - [Node.js](#nodejs)
  - [Browser](#browser)
      - [Development/Uncompressed](#developmentuncompressed)
      - [Production/Minified](#productionminified)
- [Why Should You Care?](#why-should-you-care)
    - [Removes the need to call `.then()` in a promise pipeline](#removes-the-need-to-call-then-in-a-promise-pipeline)
    - [Automatic value, array and promise coercion](#automatic-value-array-and-promise-coercion)
    - [Works with varying arguments](#works-with-varying-arguments)
    - [Immutable data](#immutable-data)
    - [Automatic currying](#automatic-currying)
    - [No-Sweat Composition](#no-sweat-composition)
    - [Handles array arguments](#handles-array-arguments)
    - [Bonus Snippet: Recursion & Sharing Context](#bonus-snippet-recursion-&-sharing-context)
- [API](#api)
  - [pipeP(…(Array<Function>|Function)) => Function](#pipep%E2%80%A6arrayfunctionfunction--function)
- [How to Contribute](#how-to-contribute)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Requirements

**pipeP** has no dependencies and is exported as a UMD module, so it should be consumable anywhere. However, it does rely on access to ES2015 native `Promise` and `Object.assign`. Since these are standard, your environment needs to support them. By default, **pipeP** does not ship with any fallbacks in order to keep the code size manageable. If you're already using an ES2015 environment, you have nothing to worry about. Otherwise, see [CoreJS](https://github.com/zloirock/core-js).

## Limitations

**IE8**: This is really only applicable if you use the currying features. **pipeP** makes use of `Object.defineProperty` in order to make functions returned by a **pipeP** sequence report the correct arity, so that they can then be used as the first handler in a new **pipeP** sequence. There are known limitations in Internet Explorer 8 that prevent this from working correctly. A possible workaround is to not use a **pipeP** returned function as the first handler in a new **pipeP** sequence. Instead, make it unary, use it as the second handler and provide your own initial handler that translates arguments accordingly.

## Installation

### Node.js

```sh
$ npm i pipep -S
```

Then your code:

```js
var pipeP = require('pipep')
// if using ES2015: `import pipeP from 'pipep'`
```

### Browser

You can grab the latest release from npm CDN ([See this for instructions on how to specify a specific version](https://unpkg.com)):

##### Development/Uncompressed

[pipep.js](https://unpkg.com/pipep)

```html
<script src="//unpkg.com/pipep"></script>
```

##### Production/Minified

[pipep.min.js](https://unpkg.com/pipep/pipep.min.js)

```html
<script src="//unpkg.com/pipep/pipep.min.js"></script>
```



## Why Should You Care?

**pipeP** can do some pretty cool things:

#### Removes the need to call `.then()` in a promise pipeline

This abstraction gives you the ability to process variable-length promise chains and also enables chains to be point-free:

```js
// pipeline - use of composed "fetch" is point-free
const getJSON = pipeP(fetch, handleError, grabJSON)

getJSON('http://randomuser.me/api')
  .then(console.log.bind(console))
  .catch((err) => console.error(err))

function handleError (response) {
  if (!response.ok) {
    throw new Error(response.status + ' ' + response.statusText)
  }
  return response
}

function grabJSON (response) {
  return response.json()
}
```

#### Automatic value, array and promise coercion

**pipeP** abstracts all type resolution for you:

```js
const process = pipeP((x) => [x, 5], ([x, y]) => [x, y, Promise.resolve(15)])
process(Promise.resolve(10)).then(console.log.bind(console)) // logs '[10, 5, 15]'
```

#### Works with varying arguments

All handlers passed to **pipeP** operate on and receive a single value (this is how promises work), but you can reduce a single value from many arguments in the first handler:

```js
const addAndSquare = pipeP(
  (a, b) => a + b,
  (n) => n * n
)
addAndSquare(2, 3).then(console.log.bind(console)) // logs '25'
```

#### Immutable data

**pipeP** makes a best effort to not mutate your data:

```js
const obj = { foo: 'bar' }
const process = pipeP(
  (x) => {
    x.foo = x.foo.toUpperCase()
    x.bar = 'baz'
  }
)
process(obj).then((x) => {
  console.log(x) // logs '{ foo: 'BAR', bar: 'baz' }'
  console.log(obj) // logs '{ foo: 'bar' }'
})
```

#### Automatic currying

**pipeP** automatically curries the returned function to the arity of the first handler:

```js
const add = pipeP((a, b) => a + b)
const increment = add(1)
increment(5).then(console.log.bind(console)) // logs '6'
```

#### No-Sweat Composition

Functions returned from **pipeP** are just functions, so they can also be used as handlers in a **pipeP** sequence. They also support currying:

```js
const add = pipeP((a, b) => a + b)
const square = pipeP((n) => n * n)
const addAndSquare = pipeP(add, square)
addAndSquare(5, 2).then(console.log.bind(console)) // logs '49'
addAndSquare(1)(3).then(console.log.bind(console)) // logs '16'
```

#### Handles array arguments

If you already have an array of functions, **pipeP** will accept it as input anywhere in the argument list, and will still support currying:

```js
const mathbomb = pipeP(
  [(a, b) => a + b, (n) => n * n],
  (n) => n / 2,
  [(n) => n - 1, (n) => n + 5]
)
mathbomb(1, 2).then(console.log.bind(console)) // logs '8.5'
mathbomb(2)(3).then(console.log.bind(console)) // logs '16.5
```

#### Bonus Snippet: Recursion & Sharing Context

You can share context between **pipeP** handlers by passing an array of arguments to the next handler. Behind the scenes, **pipeP** will use `Promise.all` to resolve the arguments. Here is a recursive call to the Github API that serves as a good example:

```js
const GET = pipeP(fetch, (res) => {
  if (!res.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  return res
})

const constructCommitAPICall = (repo, page) => {
  return `https://api.github.com/repos/${repo}/commits?page=${page}&per_page=100`
}

const getCommits = pipeP(
  // if only received 1 arg, set some defaults
  (...args) => args.length > 1 ? args : [...args, [], 1],
  // get page `page` of the commits for the passed `repo` & martial down arguments
  ([repo, _, page]) => [...arguments, GET(constructCommitAPICall(repo, page))],
  // martial down the commits
  ([repo, pages, page, commits]) => {
    // append the commits for page `page` in the `pages` array
    pages.push(commits.json())
    // inspect response headers for current page
    for (const curr of Array.values(commits.headers.get('Link').split(', '))) {
      // if there is a link for the next page, grab the commits from it
      if (/rel="next"/.test(curr)) {
        return getCommits(repo, pages, page + 1)
      }
    }
    return pages
  },
  // flatten the pages into a single list of commits
  (pages) => pages.reduce((a, b) => a.concat(b), [])
)
```

## API

### pipeP(…(Array<Function>|Function)) => Function

Accepts any number of arguments. Each argument can either be a unary function or an array containing unary functions.

"Unary" means that they can only accept one argument and return one argument.

The first function passed to **pipeP** (whether in an array or not) can accept as many arguments as you want it to, as long as it returns a single value.

These functions may accept and/or return values or promises for values. Conversion between arrays, promises and values is abstracted for you.

Returns a function that is curried to the same number of arguments as the first function passed to **pipeP**. When this function receives all expected arguments, it will return a promise for the single computed value of its input after being _piped_ through each function passed to **pipeP**.

## How to Contribute

Please read the [Contribution Guidelines](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE.md).
