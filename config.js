var npmInfo = require('./package.json');

module.exports = function () {
    console.log("Environment : " + process.env.NODE_ENV);

    switch (process.env.NODE_ENV) {
        case 'dev':
            return {
                videoDirectories: {
                    'akh': '/home/achille/Vidéos/'
                },
                mongoURI: 'mongodb://localhost/cubomedia-dev'
            };
            break;
        case 'test':
            return {
                videoDirectory: '/d/t/c/',
                mongoURI: 'mongodb://'
            };
            break;
        case 'prod':
            return {
                videoDirectories: {
                    'akh': '/home/akh/torrents/'
                },
                mongoURI: 'mongodb://localhost/cubomedia'
            };
            break;
    }
}();