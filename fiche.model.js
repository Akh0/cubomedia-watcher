'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var FicheSchema = new Schema({
    name: String,
    filepath: String,
    type: String,
    hash: String,
    inode: Number,
    code: String,
    originalTitle: String,
    title: String,
    synopsis: String,
    productionYear: Number,
    pressRating: Number,
    userRating: Number,
    posterHref: String,
    posters: Array,
    link: String,
    trailerEmbedHref: String,
    genre: String
});

module.exports = mongoose.model('Fiche', FicheSchema);