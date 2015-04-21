'use strict';

var recursive = require('recursive-readdir'),
    watch = require('watch'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    allocine = require('allocine-api'),
    htmlparser = require('htmlparser2'),
    Fiche = require('./fiche.model'),
    config = require('./config'),
    filenameParser = require('./lib/filenameParser'),
    filetype = require('./lib/filetype'),
    dirstat = require('./lib/dirstat');

mongoose.connect(config.mongoURI);

module.exports = function () {

    var addNewRecord = function (filepath, inode, username) {

        if (filetype.isVideo(filepath)) {
            var title = filenameParser.getWorkTitle(filepath);
            Fiche.findOne({inode: inode, user: username}, function (err, fiche) {
                if (err) {
                    mongoDBErrorHandler(err);
                    return;
                }

                // Si la fiche n'existe pas encore
                if (!fiche) {
                    var queryParams = {q: title, count: 1};

                    if(filenameParser.isSerie(filepath)) {
                        queryParams.filter = 'tvseries';
                    }
                    else {
                        queryParams.filter = 'movie';
                    }

                    allocine.api('search', queryParams, function (err, results) {
                        var fiche = new Fiche({
                            filepath: filepath,
                            name: title,
                            type: 'video',
                            inode: inode,
                            user: username,
                            category: queryParams.filter
                        });

                        if (!err) {
                            if (results.feed.movie) {
                                var movie = results.feed.movie[0];
                                fiche.code = movie.code;

                                allocine.api('movie', {code: movie.code}, function (err, result) {
                                    var movie = result.movie;

                                    fiche.originalTitle = movie.originalTitle;
                                    fiche.title = movie.title;
                                    fiche.synopsis = movie.synopsis;
                                    fiche.productionYear = movie.productionYear;
                                    fiche.pressRating = movie.statistics.pressRating;
                                    fiche.userRating = movie.statistics.userRating;
                                    fiche.link = movie.link[0].href;

                                    var parser = new htmlparser.Parser({
                                        onopentag: function (name, attrs) {
                                            if (name === 'iframe')
                                                fiche.trailerEmbedHref = attrs.src;
                                        }
                                    });

                                    parser.write(movie.trailerEmbed);
                                    parser.end();

                                    fiche.genre = '';

                                    movie.genre.forEach(function (genre) {
                                        fiche.genre += genre.$ + ', ';
                                    });

                                    if (movie.genre.length > 2)
                                        fiche.genre = fiche.genre.slice(0, -2);

                                    fiche.posters = [];

                                    movie.media.forEach(function (media) {
                                        if (media.type.code === 31001 || media.type.code === 31006) { // Affiche || Photo
                                            fiche.posters.push({
                                                href: media.thumbnail.href,
                                                width: media.width,
                                                height: media.height,
                                                type: media.type.code === 31001 ? 'affiche' : 'photo'
                                            })
                                        }
                                    });

                                    fiche.save(mongoDBErrorHandler);

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
                                fiche.code = tvserie.code;

                                allocine.api('tvseries', {code: tvserie.code, profile: 'large'}, function (err, result) {
                                    var tvserie = result.tvseries;

                                    fiche.originalTitle = tvserie.originalTitle;
                                    fiche.title = tvserie.title;
                                    fiche.synopsis = tvserie.synopsis;
                                    fiche.productionYear = tvserie.yearStart;
                                    fiche.pressRating = tvserie.statistics.pressRating;
                                    fiche.userRating = tvserie.statistics.userRating;
                                    fiche.link = tvserie.link[0].href;

                                    var parser = new htmlparser.Parser({
                                        onopentag: function (name, attrs) {
                                            if (name === 'iframe')
                                                fiche.trailerEmbedHref = attrs.src;
                                        }
                                    });

                                    parser.write(tvserie.trailerEmbed);
                                    parser.end();

                                    fiche.genre = '';

                                    tvserie.genre.forEach(function (genre) {
                                        fiche.genre += genre.$ + ', ';
                                    });

                                    if (tvserie.genre.length > 2)
                                        fiche.genre = fiche.genre.slice(0, -2);

                                    fiche.posters = [];

                                    tvserie.media.forEach(function (media) {
                                        if (media.type.code === 31001 || media.type.code === 31006) { // Affiche || Photo
                                            fiche.posters.push({
                                                href: media.thumbnail.href,
                                                width: media.width,
                                                height: media.height,
                                                type: media.type.code === 31001 ? 'affiche' : 'photo'
                                            })
                                        }
                                    });

                                    fiche.save(mongoDBErrorHandler);

                                    fs.writeFile('/home/achille/CUBOMEDIA-WATCHER.json', JSON.stringify(result, null, 4), function(err) {
                                    });
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
     * Nettoie la base des fiches n'étant plus rattachées à un fichier (comparaison basée sur l'inode)
     */
    var clearDB = function () {
        Fiche.find({}, function (err, fiches) {
            console.log("Fiche found in DB : " + fiches.length);
            for (var username in config.videoDirectories) {
                if (config.videoDirectories.hasOwnProperty(username)) {
                    dirstat.getFileStats(config.videoDirectories[username]).then(function (fileStats) {
                        console.log("Fiche found in FILESYSTEM : " + fileStats.length);

                        fiches.forEach(function (fiche) {
                            var fileStatsMatching = fileStats.filter(function (fileStat) {
                                return fileStat.stat.ino == fiche.inode;
                            });

                            if (fileStatsMatching.length === 0) {
                                console.log("FILE REMOVED !!!!!!!!!!!!!" + fiche.inode);
                                Fiche.remove({inode: fiche.inode, user: username}, mongoDBErrorHandler);
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
