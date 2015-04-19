'use strict';

var path = require('path');

var getWorkTitle = function(filepath) {
    var filename = path.basename(filepath);

    var titleDelimiters = ['.S', '2014', '1080', '720', '[', '(', 'VO'],
        workTitle = filename;

    titleDelimiters.forEach(function (titleDelimiter) {
        var index = workTitle.indexOf(titleDelimiter);

        if (index !== -1) {
            workTitle = workTitle.substr(0, index);
        }
    });

    workTitle = path.parse(workTitle).name;

    return workTitle.replace(/\./g, ' ').trim();
};

module.exports.getWorkTitle = getWorkTitle;