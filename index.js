'use strict';

var watch = require('watch'),
    allocineHelper = require('./lib/allocine-api-helper'),
    cmModels = require('cubomedia-models'),
    config = require('./config'),
    filenameParser = require('./lib/filename-parser'),
    filetype = require('./lib/filetype'),
    dirstat = require('./lib/dirstat'),
    q = require('q'),
    sleep = require('sleep');

cmModels.connect(config.mongoURI);

var File = cmModels.File,
    Movie = cmModels.Movie,
    Serie = cmModels.Serie,
    Episode = cmModels.Episode;

var tempSerie = {
    _series: {},
    tempSave: function (serie) {
        if (typeof this._series[serie.code] === 'undefined')
            this._series[serie.code] = {};

        this._series[serie.code][serie.user] = serie;
    },
    isTempSaved: function (codeSerie, username) {
        return typeof this._series[codeSerie] !== 'undefined' && typeof this._series[codeSerie][username] !== 'undefined';
    },
    getTempSerieID: function (codeSerie, username) {
        return this._series[codeSerie][username]._id;
    }
};

module.exports = function () {

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
                    // Préparation de la requête Allocine
                    var queryParams = {
                        q: filenameParser.getWorkTitle(filepath),
                        filter: filenameParser.isSerie(filepath) ? 'tvseries' : 'movie',
                        count: 1
                    };

                    allocineHelper.search(queryParams).then(function (results) {
                        sleep.sleep(1); // On ménage l'API allocine

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
                        else {
                            console.log("NI FILM NI SÉRIE POUR : " + queryParams.q, results.feed);
                        }
                    }, function (err) {
                        console.log('Allocine API Search Error: ' + err, queryParams);
                    });
                }
            });
        }

        return deferred.promise;
    };

    /**
     *
     * @param file
     * @param movie
     * @returns {*}
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

            sleep.sleep(1);
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
        if (tempSerie.isTempSaved(tvserie.code, file.user)) {
            episode._serie = tempSerie.getTempSerieID(tvserie.code, file.user);
            episode.save(function (err) {
                err ? deferred.reject(err) : deferred.resolve(true);
            });
        }
        else { // On a pas encore d'épisode de la série, on créé la serie
            var serie = new Serie();
            serie.code = tvserie.code;
            serie.user = file.user;
            tempSerie.tempSave(serie);
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

                sleep.sleep(1);
            });
        }

        return deferred;
    };

    /**
     *
     */
    var init = function () {
        Serie.find(function (err, series) {
            if (err) {
                return mongoDBErrorHandler(err);
            }

            series.forEach(function (serie) {
                tempSerie.tempSave(serie);
            });

            for (var username in config.videoDirectories) {
                if (config.videoDirectories.hasOwnProperty(username)) {
                    browseDirectory(username, config.videoDirectories[username]);
                }
            }

            for (var username in config.videoDirectories) {
                if (config.videoDirectories.hasOwnProperty(username)) {
                    monitorDirectory(username, config.videoDirectories[username]);
                }
            }
        });
    };

    /**
     *
     * @param username
     * @param directory
     */
    var monitorDirectory = function (username, directory) {
        watch.createMonitor(directory, function (monitor) {
            monitor.on('created', function (f, stat) {
                console.log('FILE CREATED : ', f, stat);
                addNewRecord(f, stat.ino, username);
            });

            monitor.on('removed', function (f, stat) {
                console.log('FILE REMOVED', f, stat);
                clearDB();
            });
        });
    };

    /**
     *
     * @param username
     * @param directory
     */
    var browseDirectory = function (username, directory) {
        dirstat.getFileStats(directory).then(function (files) {
            files.forEach(function (file) {
                addNewRecord(file.name, file.stat.ino, username);
            });
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
            for (var username in config.videoDirectories) {
                if (config.videoDirectories.hasOwnProperty(username)) {
                    dirstat.getFileStats(config.videoDirectories[username]).then(function (fileStats) {

                        files.forEach(function (file) {
                            // Si le file de la base n'est rattaché à aucun fichier physique -> on le supprime
                            var fileStatsMatching = fileStats.filter(function (fileStat) {
                                return fileStat.stat.ino === file.inode && username === file.user;
                            });

                            if (0 === fileStatsMatching.length) {
                                removeFile(file);
                            }
                        });
                    });
                }
            }
        })
    };

    /**
     * Supprime un file et sa série s'il s'agit d'un dernier épisode d'une série
     * @param file
     */
    var removeFile = function (file) {
        File.remove({inode: file.inode, user: file.user}, function (err) {
            if (err)
                return mongoDBErrorHandler(err);

            // On supprime la série quand on arrive sur le dernier épisode
            if (file instanceof Episode) {
                Episode.count({_serie: file._serie}, function (err, nbEpisodes) {
                    if (0 === nbEpisodes) {
                        Serie.remove({_id: file._serie}, mongoDBErrorHandler);
                    }
                });
            }
        });
    };

    init();
};
