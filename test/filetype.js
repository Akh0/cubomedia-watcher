'use strict';
var assert = require('assert');
var filetype = require('../lib/filetype');

describe('Filetype detector', function () {
    var serieFilepath = '/home/achille/torrents/Game.of.Thrones.S05E04.PROPER.VOSTFR.HDTV.XviD-GODSPACE.avi';
    var movieFilepath = '/home/achille/torrents/The.Hobbit.The.Battle.of.the.Five.Armies.2014.1080p.BluRay.x264.VOSTFR.YIFY.mp4';
    var uselessFilepath = '/home/achille/torrents/Cities.Skyline.Crack.nfo';

    describe('getFileType function', function() {
        it('should return "video"', function () {
            var result = filetype.getFileType(serieFilepath);
            assert.equal('video', result);
        });

        it('should return "video"', function () {
            var result = filetype.getFileType(movieFilepath);
            assert.equal('video', result);
        });

        it('should return "text"', function () {
            var result = filetype.getFileType(uselessFilepath);
            assert.equal('text', result);
        });
    });

    describe('isVideo function', function() {
        it('should return true', function () {
            var result = filetype.isVideo(serieFilepath);
            assert.equal(true, result);
        });

        it('should return true', function () {
            var result = filetype.isVideo(movieFilepath);
            assert.equal(true, result);
        });

        it('should return false', function () {
            var result = filetype.isVideo(uselessFilepath);
            assert.equal(false, result);
        });
    });
});
