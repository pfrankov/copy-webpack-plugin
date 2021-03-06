'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _includes2 = require('lodash/includes');

var _includes3 = _interopRequireDefault(_includes2);

var _forEach2 = require('lodash/forEach');

var _forEach3 = _interopRequireDefault(_forEach2);

var _now2 = require('lodash/now');

var _now3 = _interopRequireDefault(_now2);

var _omit2 = require('lodash/omit');

var _omit3 = _interopRequireDefault(_omit2);

var _assignIn2 = require('lodash/assignIn');

var _assignIn3 = _interopRequireDefault(_assignIn2);

var _isArray2 = require('lodash/isArray');

var _isArray3 = _interopRequireDefault(_isArray2);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _toLooksLikeDirectory = require('./toLooksLikeDirectory');

var _toLooksLikeDirectory2 = _interopRequireDefault(_toLooksLikeDirectory);

var _writeFileToAssets = require('./writeFileToAssets');

var _writeFileToAssets2 = _interopRequireDefault(_writeFileToAssets);

var _writeDirectoryToAssets = require('./writeDirectoryToAssets');

var _writeDirectoryToAssets2 = _interopRequireDefault(_writeDirectoryToAssets);

var _shouldIgnore = require('./shouldIgnore');

var _shouldIgnore2 = _interopRequireDefault(_shouldIgnore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/* eslint-disable import/no-commonjs */
var globAsync = _bluebird2.default.promisify(require('glob'));
var fs = _bluebird2.default.promisifyAll(require('fs-extra'));
/* eslint-enable */

var union = function union(set1, set2) {
    return new Set([].concat(_toConsumableArray(set1), _toConsumableArray(set2)));
};

var getOutputDir = function getOutputDir(compiler) {
    if (compiler.options.output.path && compiler.options.output.path !== '/') {
        return compiler.options.output.path;
    }

    var devServer = compiler.options.devServer;

    if (!devServer || !devServer.outputPath || devServer.outputPath === '/') {
        throw new Error('CopyWebpackPlugin: to use webpack-dev-server, devServer.outputPath must be defined in the webpack config');
    }

    return devServer.outputPath;
};

exports.default = function () {
    var patterns = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    if (!(0, _isArray3.default)(patterns)) {
        throw new Error('CopyWebpackPlugin: patterns must be an array');
    }

    var apply = function apply(compiler) {
        var webpackContext = compiler.options.context;
        var outputPath = getOutputDir(compiler);
        var fileDependencies = [];
        var contextDependencies = [];
        var webpackIgnore = options.ignore || [];
        var copyUnmodified = options.copyUnmodified;
        var writtenAssets = void 0;
        var lastGlobalUpdate = void 0;

        lastGlobalUpdate = 0;

        compiler.plugin('emit', function (compilation, cb) {
            writtenAssets = new Set();

            _bluebird2.default.each(patterns, function (pattern) {
                var relDest = void 0;
                var globOpts = void 0;

                if (pattern.context && !_path2.default.isAbsolute(pattern.context)) {
                    pattern.context = _path2.default.resolve(webpackContext, pattern.context);
                }

                var context = pattern.context || webpackContext;
                var ignoreList = webpackIgnore.concat(pattern.ignore || []);

                globOpts = {
                    cwd: context
                };

                // From can be an object
                if (pattern.from.glob) {
                    globOpts = (0, _assignIn3.default)(globOpts, (0, _omit3.default)(pattern.from, 'glob'));
                    pattern.from = pattern.from.glob;
                }

                var relSrc = pattern.from;
                var absSrc = _path2.default.resolve(context, relSrc);

                relDest = pattern.to || '';

                var forceWrite = Boolean(pattern.force);

                return fs.statAsync(absSrc).catch(function () {
                    return null;
                }).then(function (stat) {
                    if (stat && stat.isDirectory()) {
                        contextDependencies.push(absSrc);

                        // Make the relative destination actually relative
                        if (_path2.default.isAbsolute(relDest)) {
                            relDest = _path2.default.relative(outputPath, relDest);
                        }

                        return (0, _writeDirectoryToAssets2.default)({
                            absDirSrc: absSrc,
                            compilation: compilation,
                            copyUnmodified: copyUnmodified,
                            flatten: pattern.flatten,
                            forceWrite: forceWrite,
                            ignoreList: ignoreList,
                            lastGlobalUpdate: lastGlobalUpdate,
                            relDirDest: relDest
                        }).then(function (assets) {
                            writtenAssets = union(writtenAssets, assets);
                        });
                    }

                    return globAsync(relSrc, globOpts).each(function (relFileSrcParam) {
                        var relFileDest = void 0;
                        var relFileSrc = void 0;

                        relFileSrc = relFileSrcParam;

                        // Skip if it matches any of our ignore list
                        if ((0, _shouldIgnore2.default)(relFileSrc, ignoreList)) {
                            return false;
                        }

                        var absFileSrc = _path2.default.resolve(context, relFileSrc);

                        relFileDest = pattern.to || '';

                        // Remove any directory references if flattening
                        if (pattern.flatten) {
                            relFileSrc = _path2.default.basename(relFileSrc);
                        }

                        var relFileDirname = _path2.default.dirname(relFileSrc);

                        fileDependencies.push(absFileSrc);

                        // If the pattern is a blob
                        if (!stat) {
                            // If the source is absolute
                            if (_path2.default.isAbsolute(relFileSrc)) {
                                // Make the destination relative
                                relFileDest = _path2.default.join(_path2.default.relative(context, relFileDirname), _path2.default.basename(relFileSrc));

                                // If the source is relative
                            } else {
                                    relFileDest = _path2.default.join(relFileDest, relFileSrc);
                                }

                            // If it looks like a directory
                        } else if ((0, _toLooksLikeDirectory2.default)(pattern)) {
                                // Make the path relative to the source
                                relFileDest = _path2.default.join(relFileDest, _path2.default.basename(relFileSrc));
                            }

                        // If there's still no relFileDest
                        relFileDest = relFileDest || _path2.default.basename(relFileSrc);

                        // Make sure the relative destination is actually relative
                        if (_path2.default.isAbsolute(relFileDest)) {
                            relFileDest = _path2.default.relative(outputPath, relFileDest);
                        }

                        return (0, _writeFileToAssets2.default)({
                            absFileSrc: absFileSrc,
                            compilation: compilation,
                            copyUnmodified: copyUnmodified,
                            forceWrite: forceWrite,
                            lastGlobalUpdate: lastGlobalUpdate,
                            relFileDest: relFileDest
                        }).then(function (asset) {
                            writtenAssets.add(asset);
                        });
                    });
                });
            }).then(function () {
                lastGlobalUpdate = (0, _now3.default)();
            }).catch(function (err) {
                compilation.errors.push(err);
            }).finally(cb);
        });

        compiler.plugin('after-emit', function (compilation, callback) {
            var trackedFiles = compilation.fileDependencies;

            (0, _forEach3.default)(fileDependencies, function (file) {
                if (!(0, _includes3.default)(trackedFiles, file)) {
                    trackedFiles.push(file);
                }
            });

            var trackedDirs = compilation.contextDependencies;

            (0, _forEach3.default)(contextDependencies, function (context) {
                if (!(0, _includes3.default)(trackedDirs, context)) {
                    trackedDirs.push(context);
                }
            });

            callback();
            return;
        });
    };

    return {
        apply: apply
    };
};

module.exports = exports['default'];
//# sourceMappingURL=index.js.map
