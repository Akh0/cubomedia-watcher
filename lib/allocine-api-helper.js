'use strict';

var htmlparser = require('htmlparser2'),
    q = require('q');

var parseTrailerEmbedSrc = function(htmlTrailerEmbed) {
    var deferred = q.defer();

    var parser = new htmlparser.Parser({
        onopentag: function (name, attrs) {
            if (name === 'iframe')
                deferred.resolve(attrs.src);
        }
    });

    parser.write(htmlTrailerEmbed);
    parser.end();

    return deferred.promise;
};

var getGenresInline = function(genres) {
    var genresInline = '';

    genres.forEach(function (genre) {
        genresInline += genre.$ + ', ';
    });

    if (genres.length > 2)
        genresInline = genresInline.slice(0, -2);

    return genresInline;
};

var keepPosters = function(medias) {
    var posters = [];

    medias.forEach(function (media) {
        if (media.type.code === 31001 || media.type.code === 31006) { // Affile || Photo
            posters.push({
                href: media.thumbnail.href,
                width: media.width,
                height: media.height,
                type: media.type.code === 31001 ? 'affile' : 'photo'
            })
        }
    });

    return posters;
};

module.exports.parseTrailerEmbedSrc = parseTrailerEmbedSrc;
module.exports.getGenresInline = getGenresInline;
module.exports.keepPosters = keepPosters;
