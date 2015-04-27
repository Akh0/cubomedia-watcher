'use strict';

var htmlparser = require('htmlparser2'),
    q = require('q'),
    fs = require('fs'),
    allocine = require('allocine-api');

/**
 *
 * @param htmlTrailerEmbed
 * @returns {promise|*|Q.promise}
 */
var parseTrailerEmbedSrc = function (htmlTrailerEmbed) {
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

/**
 *
 * @param genres
 * @returns {string}
 */
var getGenresInline = function (genres) {
    var genresInline = '';

    genres.forEach(function (genre) {
        genresInline += genre.$ + ', ';
    });

    if (genres.length > 2)
        genresInline = genresInline.slice(0, -2);

    return genresInline;
};

/**
 *
 * @param medias
 * @returns {Array}
 */
var keepPosters = function (medias) {
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

/**
 *
 * @param data
 * @param filepath
 */
var stringifyInFile = function (data, filepath) {
    fs.writeFile(filepath, JSON.stringify(data, null, 4), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + filepath);
        }
    });
};

/**
 *
 * @param method
 * @param params
 * @returns {promise|*|Q.promise}
 */
var allocineApiRequest = function(method, params) {
    var deferred = q.defer();

    allocine.api(method, params, function (err, results) {
        err ? deferred.reject(err) : deferred.resolve(results);
    });

    return deferred.promise;
};

/**
 *
 * @param params
 * @returns {promise|*|Q.promise}
 */
var search = function (params) {
    return allocineApiRequest('search', params);
};

/**
 *
 * @param allocineCode
 * @param profile
 * @returns {promise|*|Q.promise}
 */
var findMovieFromCode = function(allocineCode, profile) {
    return allocineApiRequest('movie', { code: allocineCode, profile: profile ? profile : 'large' });
};

/**
 *
 * @param allocineCode
 * @param profile
 * @returns {promise|*|Q.promise}
 */
var findSerieFromCode = function(allocineCode, profile) {
    return allocineApiRequest('tvseries', { code: allocineCode, profile: profile ? profile : 'large' });
};

module.exports.parseTrailerEmbedSrc = parseTrailerEmbedSrc;
module.exports.getGenresInline = getGenresInline;
module.exports.keepPosters = keepPosters;
module.exports.stringifyInFile = stringifyInFile;
module.exports.search = search;
module.exports.findMovieFromCode = findMovieFromCode;
module.exports.findSerieFromCode = findSerieFromCode;
