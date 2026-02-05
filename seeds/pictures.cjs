if (process.env.NODE_ENV !== "production") require("dotenv").config();

const mongoose = require("mongoose");
const { glob, globSync, globStream, globStreamSync, Glob } = require("glob");
const path = require("path");
const fs = require("fs");
const mime = require("mime").default;
const appRoot = path.dirname(require.main.filename);
const { fakerEN: faker } = require("@faker-js/faker");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Tag = require("../models/tag");
const User = require("../models/user");
const { resizeImage } = require("../helpers/resize");
const {
  streamToBuffer,
  uploadFile,
} = require("../helpers/backblaze-b2/helper");
const B2 = require("@stz184/backblaze-b2");

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
  await User.deleteMany({});

  // Create a seed user
  const seedUser = await User.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    role: "user",
  });

  const b2 = new B2({
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
  });

  const images = await glob([
    path.join(appRoot, "pictures", "*.{png,jpeg,gif}"),
  ]);

  for (const image of images) {
    console.log(`Processing image: ${image}`);

    const imagePath = image;
    const mimeType = mime.getType(imagePath);

    const {
      fileBuffer: resizedBuffer,
      fileName: resizedFileName,
      mimeType: resizedMimeType,
      width,
      height,
      size,
    } = await resizeImage(imagePath, mimeType, 800);

    const uploadResponse = await uploadFile(
      b2,
      resizedBuffer,
      resizedFileName,
      resizedMimeType,
    );

    const tags = [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()];

    const post = await Post.create({
      title: faker.lorem.sentence(),
      images: [
        {
          fileName: path.basename(resizedFileName),
          fileId: uploadResponse.fileId,
          size: uploadResponse.size,
          width,
          height,
        },
      ],
      author: seedUser._id,
      upvote: [],
      upvoteNum: 0,
      tags: tags,
    });

    // Update Tag collection for statistics/autocomplete
    for (let tagName of tags) {
      await Tag.findOneAndUpdate(
        { name: tagName },
        {
          $inc: { countNum: 1 },
          $setOnInsert: { displayName: tagName }, // Store first occurrence
        },
        { upsert: true }, // Create if doesn't exist
      );
    }
  }
};
