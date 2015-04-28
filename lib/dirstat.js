'use strict';

var recursive = require('recursive-readdir'),
    q = require('q'),
    fs = require('fs');

var getFileStats = function(directory) {
    var fileStats = [],
        deferred = q.defer();

    recursive(directory, function (err, files) {
        if(err) {
            deferred.reject(err);
        }
        else {
            var nbFiles = files.length,
                i = 0;

            files.forEach(function (file) {
                fs.stat(file, function (err, stat) {
                    fileStats.push({name: file, stat: stat});

                    if (++i === nbFiles) {
                        deferred.resolve(fileStats);
                    }
                });
            });
        }
    });

    return deferred.promise;
};

module.exports.getFileStats = getFileStats;
