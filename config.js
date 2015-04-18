var npmInfo = require('./package.json');

module.exports = function () {
    console.log("Environment : " + process.env.NODE_ENV);

    switch (process.env.NODE_ENV) {
        case 'dev':
            return {
                videoDirectory: '/home/achille/Vidéos/',
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
                videoDirectory: '/home/akh/torrents/',
                mongoURI: 'mongodb://localhost/cubomedia'
            };
            break;
    }
}();