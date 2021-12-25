const mongoose = require('mongoose')
const url = 'mongodb://localhost:27017/node'

mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true})

const moviesSchema = new mongoose.Schema({
    title: String,
    url: Array,
    pic: String,
    detail: String,
    region: Array,
    year: String,
    labels: Array,
    director: String,
    lead: Array,
    score: String,
    collected: Boolean
    // versionKey是关闭版本__v
},{versionKey: false})

const dbo = mongoose.model('node', moviesSchema, 'movies')

module.exports = {
    dbo,
    mongoose
}