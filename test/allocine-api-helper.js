'use strict';
var assert = require('assert');
var allocineHelper = require('../lib/allocine-api-helper');

describe('Allocine API Helper', function () {
    describe('search function', function() {
        it('should find the movie : Interstellar', function (done) {
            return allocineHelper.search({ q: 'Interstellar', filter: 'movie', count: 1 }).then(function(result) {
                var movie = result.feed.movie[0];
                assert.equal(114782, movie.code);
                done();
            });
        });

        it('should find the tv serie : The Big Bang Theory', function (done) {
            return allocineHelper.search({ q: 'The Big Bang Theory', filter: 'tvseries', count: 1 }).then(function(result) {
                var tvserie = result.feed.tvseries[0];
                assert.equal(3247, tvserie.code);
                done();
            });
        });
    });

    describe('findMovieFromCode function', function() {
        it('should find the movie Interstellar from code : 114782', function (done) {
            return allocineHelper.findMovieFromCode(114782).then(function(result) {
                var movie = result.movie;
                assert.equal('Interstellar', movie.originalTitle);
                done();
            });
        });
    });

    describe('findSerieFromCode function', function() {
        it('should find the tv serie The Big Bang Theory from code : 3247', function (done) {
            return allocineHelper.findSerieFromCode(3247).then(function(result) {
                var serie = result.tvseries;
                assert.equal('The Big Bang Theory', serie.originalTitle);
                done();
            });
        });
    });

    describe('parseTrailerEmbedSrc function', function () {
        it('should parse the embed trailer code to extract the "src" attr', function (done) {
            var embedTrailerCode = '<div id=\'ACEmbed\'><iframe src=\'http://www.allocine.fr/_video/iblogvision.aspx?cmedia=19548515\' style=\'width:480px; height:270px\' frameborder=\'0\' allowfullscreen=\'true\'></iframe><br /><a href="http://www.allocine.fr/film/fichefilm_gen_cfilm=114782.html" target="_blank">Interstellar</a></div>';

            return allocineHelper.parseTrailerEmbedSrc(embedTrailerCode).then(function (src) {
                assert.equal('http://www.allocine.fr/_video/iblogvision.aspx?cmedia=19548515', src);
                done();
            });
        });
    });

    describe('getGenresInline function', function() {
        it('should return "Science fiction, Drame"', function(done) {
            return allocineHelper.findMovieFromCode(114782).then(function(result) {
                var genreInline = allocineHelper.getGenresInline(result.movie.genre);
                assert.equal('Science fiction, Drame', genreInline);

                done();
            });
        });
    });

    describe('keepPosters function', function() {
        it('should only keep poster and photo medias', function(done) {
            return allocineHelper.findMovieFromCode(114782).then(function(result) {
                var posters = allocineHelper.keepPosters(result.movie.media);

                var onlyPosters = true;
                posters.forEach(function(poster) {
                    // On considère les types affiche et photo comme poster
                    if(poster.type != 'affiche' && poster.type != 'photo') {
                        onlyPosters = false;
                    }
                });

                assert.equal(true, onlyPosters);

                done();
            });
        });
    });
});
