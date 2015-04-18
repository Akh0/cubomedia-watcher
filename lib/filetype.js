'use strict';

var mime = require('mime');

var getFileType = function(filepath) {
    var mimeType = mime.lookup(filepath);
    return mimeType.substr(0, mimeType.indexOf('/'));
};

var isVideo = function(filepath) {
    return getFileType(filepath) === 'video';
};

var isMusic = function(filepath) {
    throw new Error('Not yet implemented');
};

var isISO = function(filepath) {
    throw new Error('Not yet implemented');
};

var isEbook = function(filepath) {
    throw new Error('Not yet implemented');
};

module.exports.getFileType = getFileType;
module.exports.isVideo = isVideo;
module.exports.isMusic = isMusic;
module.exports.isISO = isISO;
module.exports.isEbook = isEbook;