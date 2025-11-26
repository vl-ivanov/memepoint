if (process.env.NODE_ENV !== "production") require("dotenv").config();

const mongoose = require("mongoose");
const tags = require("./tags");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Tag = require("../models/tag");

mongoose.connect(process.env.DB_URL);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async () => {
  console.log("Database connected");
  await seedDB();
  mongoose.connection.close();
});

const seedDB = async () => {
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await Tag.deleteMany({});

  for (const category of Object.keys(tags)) {
    console.log(category);
    for (const tag of tags[category]) {
      const newTag = new Tag({
        body: tag,
        category,
        url: tag.toLowerCase().replace(/\s/g, "-"),
      });
      await newTag.save();
    }
  }
};
