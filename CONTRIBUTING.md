# How to contribute

1. Fork this repo
2. Clone your fork
3. `cd` into the `pipep` directory
4. Run `npm i`
5. `git checkout -b <branch>`
6. Add your feature/fix
7. `git add . && git push origin <branch>`
8. Open a pull request from your new branch

## Testing

Always include tests for any bug fixes and/or feature additions. Also ensure your code is compliant with [Standard](https://github.com/feross/standard) (run `npm run lint`) to make sure you adhere to code style - otherwise, tests will fail.

**pipeP** uses [AVA](https://github.com/sindresorhus/ava) for tests and [nyc](https://github.com/bocoup/nyc) for code coverage.
