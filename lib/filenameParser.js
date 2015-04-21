'use strict';

var path = require('path');

var getWorkTitle = function(filepath) {
    var filename = path.basename(filepath);

    var titleDelimiters = ['.S', '.1080', '1080', '.720', '.[', '[', '.(', '(', 'VOST'],
        workTitle = filename;

    workTitle = path.parse(workTitle).name;

    // Séparateurs communs
    titleDelimiters.forEach(function (titleDelimiter) {
        var index = workTitle.indexOf(titleDelimiter);

        if (index !== -1) {
            workTitle = workTitle.substr(0, index);
        }
    });

    // Séparateur : Année de distribution
    var match = workTitle.match(/\.?[0-9]{4}/);

    if(match) {
        workTitle = workTitle.substr(0, match.index);
    }

    //['.avi', '.mkv', '.mp4', '.mov', '.divx', '.']
    //console.log('PARSE WORKS ::: '+workTitle);

    console.log('PARSE WORKS ::: '+workTitle);
    return workTitle.replace(/\./g, ' ').trim();
};

/**
 * Tente de définir s'il s'agit d'une série télé à partir du nom de fichier (eg: "S01")
 * @param filepath
 * @returns {boolean}
 */
var isSerie = function(filepath) {
    var filename = path.basename(filepath);
    return !!filename.match(/S[0-9]{2}/i);
};

module.exports.getWorkTitle = getWorkTitle;
module.exports.isSerie = isSerie;