/**
 * The buffer package, with the `constants` of the Node module: pi's exec
 * reads MAX_STRING_LENGTH when it loads.
 */
const buffer = require('buffer/');

module.exports = {
  ...buffer,
  constants: {
    MAX_LENGTH: buffer.kMaxLength,
    // The string length limit of V8.
    MAX_STRING_LENGTH: 2 ** 29 - 24
  }
};
