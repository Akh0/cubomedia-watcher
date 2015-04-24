'use strict';

var htmlparser = require('htmlparser2');

var parseEmbedTrailerHref = function(htmlEmbedTrailer) {
    var deferred = q.defer();

    var parser = new htmlparser.Parser({
        onopentag: function (name, attrs) {
            if (name === 'iframe')
                deferred.resolve(attrs.src);
        }
    });

    parser.write(htmlEmbedTrailer);
    parser.end();

    return deferred.promise;
};

module.exports.getFileStats = getFileStats;
