'use strict';

var recursive = require('recursive-readdir'),
    watch = require('watch'),
    fs = require('fs'),
    //q = require('q'),
    mongoose = require('mongoose'),
    allocine = require('allocine-api'),
    Fiche = require('./fiche.model'),
    config = require('./config'),
    filenameParser = require('./lib/filenameParser'),
    filetype = require('./lib/filetype'),
    dirstat = require('./lib/dirstat');

mongoose.connect(config.mongoURI);

module.exports = function (videoDirectory) {
    if (!videoDirectory)
        videoDirectory = config.videoDirectory;

    var addNewRecord = function (filepath, inode) {

        if (filetype.isVideo(filepath)) {
            var title = filenameParser.getWorkTitle(filepath);
            Fiche.findOne({ inode: inode }, function (err, fiche) {
                if(err) {
                    mongoDBErrorHandler(err);
                    return;
                }

                // Si la fiche n'existe pas encore
                if (!fiche) {
                    allocine.api('search', { q: title, count: 1 }, function (err, results) {
                        var movieFiche = new Fiche({
                            filepath: filepath,
                            name: title,
                            type: 'video',
                            inode: inode
                        });

                        if (!err && results.feed.movie) {
                            // TODO: Voir comment faire en cas de résultat multiple
                            var movie = results.feed.movie[0];
                            console.log(movie);
                            movieFiche.code = movie.code;
                            movieFiche.originalTitle = movie.originalTitle;
                            movieFiche.title = movie.title;
                            movieFiche.productionYear = movie.productionYear;
                            movieFiche.pressRating = movie.statistics.pressRating;
                            movieFiche.userRating = movie.statistics.userRating;
                            movieFiche.posterHref = movie.poster.href;
                            movieFiche.link = movie.link[0].href;

                            allocine.api('movie', { code: movie.code });
                        }

                        movieFiche.save(mongoDBErrorHandler);
                    });

                }
            });
        }
    };

    recursive(videoDirectory, function (err, files) {
        if (!err) {
            files.forEach(function (file) {
                fs.stat(file, function (err, stat) {
                    addNewRecord(file, stat.ino);
                });
            });
        }
    });

    var mongoDBErrorHandler = function(err) {
        if(err)
            console.error('MongoDB Error: ' + err);
    };

    /**
     * Nettoie la base des fiches n'étant plus rattachées à un fichier (comparaison basée sur l'inode)
     */
    var clearDB = function () {
        Fiche.find({}, function (err, fiches) {
            console.log("Fiche found in DB : " + fiches.length);
            dirstat.getFileStats(videoDirectory).then(function(fileStats) {
                console.log("Fiche found in FILESYSTEM : " + fileStats.length);

                fiches.forEach(function (fiche) {
                    var fileStatsMatching = fileStats.filter(function(fileStat) {
                        return fileStat.stat.ino == fiche.inode;
                    });

                    if(fileStatsMatching.length === 0) {
                        console.log("FILE REMOVED !!!!!!!!!!!!!"+fiche.inode);
                        Fiche.remove({ inode: fiche.inode }, mongoDBErrorHandler);
                    }
                });
            });
        })
    };

    watch.createMonitor(videoDirectory, function (monitor) {
        monitor.on('created', function (f, stat) {
            console.log('FILE CREATED : ', f, stat);
            addNewRecord(f, stat.ino);
        });

        monitor.on('removed', function (f, stat) {
            console.log('FILE REMOVED', f, stat);
            clearDB();
        });
    });
};
