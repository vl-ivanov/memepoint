if (process.env.NODE_ENV !== 'production')
    require("dotenv").config()

const mongoose = require('mongoose');
const tags = require('./tags');
const Comment = require('../models/comment');
const Post = require('../models/post');
const Tag = require('../models/tag');

mongoose.connect(process.env.DB_URL);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const seedDB = async () => {
    await Comment.deleteMany({})
    await Post.deleteMany({})
    await Tag.deleteMany({})
    for (var i = 0; i < tags.tags.length; i++) {
        const newTag = new Tag({
            body: tags.tags[i],
            url: tags.tags[i].toLowerCase().replace(/\s/g, "-")
        })
        await newTag.save()
    }
}

seedDB().then(() => {
    mongoose.connection.close()
})