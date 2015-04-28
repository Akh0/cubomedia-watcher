'use strict';
var assert = require('assert');
var filenameParser = require('../lib/filename-parser');

describe('Filename parser', function () {
    var serieFilepath = '/home/achille/torrents/Game.of.Thrones.S05E04.PROPER.VOSTFR.HDTV.XviD-GODSPACE.avi';
    var movieFilepath = '/home/achille/torrents/The.Hobbit.The.Battle.of.the.Five.Armies.2014.1080p.BluRay.x264.VOSTFR.YIFY.mp4';
    var uselessFilepath = '/home/achille/torrents/Cities.Skyline.Crack.nfo';

    describe('getWorkTitle function', function() {
        it('should return "Game of Thrones"', function () {
            var result = filenameParser.getWorkTitle(serieFilepath);
            assert.equal('Game of Thrones', result);
        });

        it('should return "The Hobbit The Battle of the Five Armies"', function () {
            var result = filenameParser.getWorkTitle(movieFilepath);
            assert.equal('The Hobbit The Battle of the Five Armies', result);
        });
    });

    describe('isSerie function', function() {
        it('should return true', function () {
            var result = filenameParser.isSerie(serieFilepath);
            assert.equal(true, result);
        });

        it('should return false', function () {
            var result = filenameParser.isSerie(movieFilepath);
            assert.equal(false, result);
        });

        it('should return false', function () {
            var result = filenameParser.isSerie(uselessFilepath);
            assert.equal(false, result);
        });
    });

    describe('episode functions', function() {
        it('should return 5', function () {
            var result = filenameParser.getSeasonNumber(serieFilepath);
            assert.equal(5, result);
        });

        it('should return 4', function () {
            var result = filenameParser.getEpisodeNumber(serieFilepath);
            assert.equal(4, result);
        });
    });
});
