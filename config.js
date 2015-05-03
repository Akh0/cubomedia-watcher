var npmInfo = require('./package.json');

module.exports = function () {
    console.log("Environment : " + process.env.NODE_ENV);

    switch (process.env.NODE_ENV) {
        case 'development':
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
        case 'production':
            return {
                videoDirectories: {
                    'akh': '/home/akh/torrents/',
                    'bglacial': '/home/bglacial/torrents/',
                    'damibironn': '/home/damibironn/torrents/',
                    //'fredoln': '/home/fredoln/torrents/',
                    'pleox': '/home/pleox/torrents/',
                    //'tony': '/home/tony/torrents/',
                    //'tuxor': '/home/tuxor/torrents/',
                    //'victor': '/home/victor/torrents/',
                    //'yann': '/home/yann/torrents/'
                },
                mongoURI: 'mongodb://localhost/cubomedia'
            };
            break;
    }
}();