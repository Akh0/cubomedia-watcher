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

                            movieFiche.code = movie.code;

                            allocine.api('movie', { code: movie.code }, function(err, result) {
                                var movie = result.movie;

                                movieFiche.originalTitle = movie.originalTitle;
                                movieFiche.title = movie.title;
                                movieFiche.synopsis = movie.synopsis;
                                movieFiche.productionYear = movie.productionYear;
                                movieFiche.pressRating = movie.statistics.pressRating;
                                movieFiche.userRating = movie.statistics.userRating;
                                movieFiche.posterHref = movie.poster.href;
                                movieFiche.link = movie.link[0].href;

                                var parser = new htmlparser.Parser({
                                    onopentag: function(name, attrs) {
                                        if(name === 'iframe')
                                            movieFiche.trailerEmbedHref = attrs.src;
                                    }
                                });

                                parser.write(movie.trailerEmbed);
                                parser.end();

                                movieFiche.genre = '';

                                movie.genre.forEach(function(genre) {
                                   movieFiche.genre += genre.$ + ', ';
                                });

                                if(movie.genre.length > 2)
                                    movieFiche.genre = movieFiche.genre.slice(0, -2);

                                movieFiche.posters = [];

                                movie.media.forEach(function(media) {
                                    if(media.type.code === 31001 || media.type.code === 31006) { // Affiche || Photo
                                        movieFiche.posters.push({
                                            href: media.thumbnail.href,
                                            width: media.width,
                                            height: media.height,
                                            type: media.type.code === 31001 ? 'affiche' : 'photo'
                                        })
                                    }
                                });

                                movieFiche.save(mongoDBErrorHandler);

                                //fs.writeFile('/home/achille/CUBOMEDIA-WATCHER.json', JSON.stringify(result, null, 4), function(err) {
                                //    if(err) {
                                //        console.log(err);
                                //    } else {
                                //        console.log("JSON saved to " + outputFilename);
                                //    }
                                //});
                            });
                        }
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
