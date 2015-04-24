'use strict';

var recursive = require('recursive-readdir'),
    watch = require('watch'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    allocine = require('allocine-api'),
    allocineHelper = require('./lib/allocine-api-helper'),
    cmModels = require('cubomedia-models'),
    config = require('./config'),
    filenameParser = require('./lib/filename-parser'),
    filetype = require('./lib/filetype'),
    dirstat = require('./lib/dirstat');

mongoose.connect(config.mongoURI);


//console.log(cubomediaModels);
module.exports = function () {

    var addNewRecord = function (filepath, inode, username) {

        if (filetype.isVideo(filepath)) {
            var title = filenameParser.getWorkTitle(filepath);
            cmModels.File.findOne({inode: inode, user: username}, function (err, file) {

                // Si la file n'existe pas encore
                if (!file) {
                    var queryParams = {q: title, count: 1};

                    if(filenameParser.isSerie(filepath)) {
                        queryParams.filter = 'tvseries';
                    }
                    else {
                        queryParams.filter = 'movie';
                    }

                    allocine.api('search', queryParams, function (err, results) {
                        var file = new cmModels.File({
                            filepath: filepath,
                            name: title,
                            type: 'video',
                            inode: inode,
                            user: username,
                            category: queryParams.filter
                        });

                        if (!err) {
                            if (results.feed.movie) {
                                var movieFile = new cmModels.Movie(file);

                                var movie = results.feed.movie[0];
                                movieFile.code = movie.code;

                                allocine.api('movie', {code: movie.code}, function (err, result) {
                                    if(err) return;

                                    var movie = result.movie;

                                    movieFile.originalTitle = movie.originalTitle;
                                    movieFile.title = movie.title;
                                    movieFile.synopsis = movie.synopsis;
                                    movieFile.productionYear = movie.productionYear;
                                    movieFile.pressRating = movie.statistics.pressRating;
                                    movieFile.userRating = movie.statistics.userRating;
                                    movieFile.link = movie.link[0].href;
                                    movieFile.posterHref = movie.poster.href;

                                    allocineHelper.parseTrailerEmbedSrc(movie.trailerEmbed).then(function(src) {
                                        movieFile.trailerEmbedHref = src;
                                    });

                                    movieFile.genre = allocineHelper.getGenresInline(movie.genre);
                                    movieFile.posters = allocineHelper.keepPosters(movie.media);

                                    movieFile.save(mongoDBErrorHandler);

                                    //fs.writeFile('/home/achille/CUBOMEDIA-WATCHER.json', JSON.stringify(result, null, 4), function(err) {
                                    //    if(err) {
                                    //        console.log(err);
                                    //    } else {
                                    //        console.log("JSON saved to " + outputFilename);
                                    //    }
                                    //});
                                });
                            }
                            else if(results.feed.tvseries) {

                                var tvserie = results.feed.tvseries[0];

                                cmModels.Serie.findOne({ code: tvserie.code }, function(err, serie) {

                                    // On a pas encore d'épisode de la série, on créé la serie
                                    if(!file) {
                                        allocine.api('tvseries', { code: tvserie.code, profile: 'large' }, function (err, result) {
                                            if(err)
                                                return;

                                            var serie = cmModels.Serie();

                                            var tvserie = result.tvseries;
                                            serie.code = tvserie.code;

                                            serie.originalTitle = tvserie.originalTitle;
                                            serie.title = tvserie.title;
                                            serie.synopsis = tvserie.synopsis;
                                            serie.productionYear = tvserie.yearStart;
                                            serie.pressRating = tvserie.statistics.pressRating;
                                            serie.userRating = tvserie.statistics.userRating;
                                            serie.link = tvserie.link[0].href;
                                            serie.posterHref = tvserie.poster.href;

                                            allocineHelper.parseTrailerEmbedSrc(tvserie.trailerEmbed).then(function(src) {
                                                serie.trailerEmbedHref = src;
                                            });

                                            serie.genre = allocineHelper.getGenresInline(tvserie.genre);
                                            serie.posters = allocineHelper.keepPosters(tvserie.media);

                                            serie.save(mongoDBErrorHandler);
                                        });
                                    }

                                    // On ajoute l'épisode à la série
                                    var episode = new cmModels.Episode(file);

                                    episode.seasonNumber = filenameParser.getSeasonNumber(filepath);
                                    episode.episodeNumber = filenameParser.getEpisodeNumber(filepath);

                                    episode.save(mongoDBErrorHandler);
                                });
                            }
                        }
                    });
                }
            });
        }
    };

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

    var mongoDBErrorHandler = function (err) {
        if (err)
            console.error('MongoDB Error: ' + err);
    };

    /**
     * Nettoie la base des files n'étant plus rattachées à un fichier (comparaison basée sur l'inode)
     */
    var clearDB = function () {
        cmModels.File.find({}, function (err, files) {
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
                                cmModels.File.remove({inode: file.inode, user: username}, mongoDBErrorHandler);
                            }
                        });
                    });
                }
            }
        })
    };

    for (var username in config.videoDirectories) {
        if (config.videoDirectories.hasOwnProperty(username)) {
            watch.createMonitor(config.videoDirectories[username], function (monitor) {
                monitor.on('created', function (f, stat) {
                    console.log('FILE CREATED : ', f, stat);
                    addNewRecord(f, stat.ino);
                });

                monitor.on('removed', function (f, stat) {
                    console.log('FILE REMOVED', f, stat);
                    clearDB();
                });
            });
        }
    }
};
