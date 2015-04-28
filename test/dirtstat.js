'use strict';
var assert = require('assert');
var dirstat = require('../lib/dirstat');

describe('Dirstat', function () {
    var movieDirPath = 'test/videos/';

    describe('getFileStats function', function() {
        it('should respond with 3 items', function (done) {
            return dirstat.getFileStats(movieDirPath).then(function(files) {
                assert.equal(3, files.length);
                done();
            });
        });
    });
});
