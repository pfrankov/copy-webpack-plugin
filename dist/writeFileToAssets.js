'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable import/no-commonjs */
var fs = _bluebird2.default.promisifyAll(require('fs-extra'));
/* eslint-enable */

exports.default = function (opts) {
    var compilation = opts.compilation;
    // ensure forward slashes
    var relFileDest = opts.relFileDest.replace(/\\/g, '/');
    var absFileSrc = opts.absFileSrc;
    var forceWrite = opts.forceWrite;
    var lastGlobalUpdate = opts.lastGlobalUpdate;
    var copyUnmodified = opts.copyUnmodified;

    if (compilation.assets[relFileDest] && !forceWrite) {
        return _bluebird2.default.resolve();
    }

    return fs.statAsync(absFileSrc).then(function (stat) {
        if (stat.isDirectory() || !copyUnmodified && stat.mtime.getTime() < lastGlobalUpdate) {
            return null;
        }

        compilation.assets[relFileDest] = {
            size: function size() {
                return stat.size;
            },
            source: function source() {
                return fs.readFileSync(absFileSrc);
            }
        };

        return relFileDest;
    });
};

module.exports = exports['default'];
//# sourceMappingURL=writeFileToAssets.js.map
