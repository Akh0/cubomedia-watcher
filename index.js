'use strict';

var recursive = require('recursive-readdir'),
    watch = require('watch'),
    fs = require('fs'),
    allocineHelper = require('./lib/allocine-api-helper'),
    cmModels = require('cubomedia-models'),
    config = require('./config'),
    filenameParser = require('./lib/filename-parser'),
    filetype = require('./lib/filetype'),
    dirstat = require('./lib/dirstat'),
    async = require('async'),
    q = require('q');

cmModels.connect(config.mongoURI);

var File = cmModels.File,
    Movie = cmModels.Movie,
    Serie = cmModels.Serie,
    Episode = cmModels.Episode;

module.exports = function () {

    var mySeries = [];

    /**
     *
     * @param filepath
     * @param inode
     * @param username
     */
    var addNewRecord = function (filepath, inode, username) {
        var deferred = q.defer();

        if (filetype.isVideo(filepath)) {

            File.findOne({inode: inode, user: username}, function (err, file) {
                if (err) {
                    return mongoDBErrorHandler(err);
                }

                if (!file) {
                    var queryParams = {
                        q: filenameParser.getWorkTitle(filepath),
                        filter: filenameParser.isSerie(filepath) ? 'tvseries' : 'movie',
                        count: 1
                    };

                    allocineHelper.search(queryParams).then(function (results) {
                        var file = new File({
                            filepath: filepath,
                            name: queryParams.q,
                            type: 'video',
                            inode: inode,
                            user: username,
                            category: queryParams.filter
                        });

                        if (results.feed.movie) {
                            makeMovieRecord(file, results.feed.movie[0]).then(function () {
                                deferred.resolve(true);
                            });
                        }
                        else if (results.feed.tvseries) {
                            makeSerieRecord(file, results.feed.tvseries[0]).then(function () {
                                deferred.resolve(true);
                            });
                        }
                    }, function (err) {
                        console.log(err);
                    });
                }
            });
        }

        return deferred.promise;
    };

    /**
     *
     * @param File file
     */
    var makeMovieRecord = function (file, movie) {
        var deferred = q.defer();

        var movieFile = new Movie(file);

        movieFile.code = movie.code;

        allocineHelper.findMovieFromCode(movie.code).then(function (result) {
            var movie = result.movie;

            movieFile.originalTitle = movie.originalTitle;
            movieFile.title = movie.title;
            movieFile.synopsis = movie.synopsis;
            movieFile.productionYear = movie.productionYear;
            movieFile.pressRating = movie.statistics.pressRating;
            movieFile.userRating = movie.statistics.userRating;
            movieFile.link = movie.link[0].href;

            if (movie.poster)
                movieFile.posterHref = movie.poster.href;

            allocineHelper.parseTrailerEmbedSrc(movie.trailerEmbed).then(function (src) {
                movieFile.trailerEmbedHref = src;

                movieFile.genre = allocineHelper.getGenresInline(movie.genre);

                if (movie.media)
                    movieFile.posters = allocineHelper.keepPosters(movie.media);

                movieFile.save(function (err) {
                    err ? deferred.reject(err) : deferred.resolve(true);
                });
            });
        });

        return deferred;
    };

    /**
     *
     * @param File file
     */
    var makeSerieRecord = function (file, tvserie) {
        var deferred = q.defer();


        // On ajoute l'épisode à la série
        var episode = new Episode(file);

        episode.seasonNumber = filenameParser.getSeasonNumber(file.filepath);
        episode.episodeNumber = filenameParser.getEpisodeNumber(file.filepath);

        // On rattache l'épisode à la série
        if (typeof mySeries[tvserie.code] !== 'undefined') {
            console.log("serie already exists");
            episode._serie = mySeries[tvserie]._id;
            episode.save(function (err) {
                err ? deferred.reject(err) : deferred.resolve(true);
            });
        }
        else { // On a pas encore d'épisode de la série, on créé la serie
            var serie = new Serie();
            serie.code = tvserie.code;
            mySeries[serie.code] = serie;
            serie.user = file.user;
            serie.save(mongoDBErrorHandler);

            allocineHelper.findSerieFromCode(tvserie.code).then(function (result) {
                var tvserie = result.tvseries;

                serie.originalTitle = tvserie.originalTitle;
                serie.title = tvserie.title;
                serie.synopsis = tvserie.synopsis;
                serie.productionYear = tvserie.yearStart;
                serie.pressRating = tvserie.statistics.pressRating;
                serie.userRating = tvserie.statistics.userRating;
                serie.link = tvserie.link[0].href;
                serie.posterHref = tvserie.poster.href;

                allocineHelper.parseTrailerEmbedSrc(tvserie.trailerEmbed).then(function (src) {
                    serie.trailerEmbedHref = src;

                    serie.genre = allocineHelper.getGenresInline(tvserie.genre);
                    serie.posters = allocineHelper.keepPosters(tvserie.media);

                    serie.save(function (err) {
                        if (err) {
                            deferred.reject(err);
                        }
                        else {
                            episode._serie = serie._id;
                            episode.save(function (err) {
                                err ? deferred.reject(err) : deferred.resolve(true);
                            });
                        }
                    });
                });
            });
        }

        return deferred;
    };

    /**
     *
     */
    var init = function () {
        Serie.find({_type: 'Serie'}, function (err, series) {
            if (err) {
                return mongoDBErrorHandler(err);
            }

            series.forEach(function (serie) {
                mySeries[serie.code] = serie;
            });

            for (var username in config.videoDirectories) {
                recursive(config.videoDirectories[username], function (err, files) {
                    if (!err) {
                        files.forEach(function (file) {
                            fs.stat(file, function (err, stat) {
                                addNewRecord(file, stat.ino, username);
                            });
                        });
                    }
                });
            }

            for (var username in config.videoDirectories) {
                if (config.videoDirectories.hasOwnProperty(username)) {
                    watch.createMonitor(config.videoDirectories[username], function (monitor) {
                        monitor.on('created', function (f, stat) {
                            console.log('FILE CREATED : ', f, stat);
                            addNewRecord(f, stat.ino, username);
                        });

                        monitor.on('removed', function (f, stat) {
                            console.log('FILE REMOVED', f, stat);
                            clearDB();
                        });
                    });
                }
            }
        });
    };


    var mongoDBErrorHandler = function (err) {
        if (err)
            console.error('MongoDB Error: ' + err);
    };

    /**
     * Nettoie la base des files n'étant plus rattachées à un fichier (comparaison basée sur l'inode)
     */
    var clearDB = function () {
        File.find({}, function (err, files) {
            console.log("File found in DB : " + files.length);
            for (var username in config.videoDirectories) {
                if (config.videoDirectories.hasOwnProperty(username)) {
                    dirstat.getFileStats(config.videoDirectories[username]).then(function (fileStats) {
                        console.log("File found in FILESYSTEM : " + fileStats.length);

                        files.forEach(function (file) {
                            var fileStatsMatching = fileStats.filter(function (fileStat) {
                                return fileStat.stat.ino == file.inode;
                            });

                            if (fileStatsMatching.length === 0) {
                                console.log("FILE REMOVED !!!!!!!!!!!!!" + file.inode);
                                File.remove({inode: file.inode, user: username}, mongoDBErrorHandler);
                            }
                        });
                    });
                }
            }
        })
    };

    init();
};
