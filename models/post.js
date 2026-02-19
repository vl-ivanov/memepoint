const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Comment = require("./comment");
const { getPublicUrl } = require("../helpers/backblaze-b2/helper");

const ImageSchema = new Schema({
  fileName: String,
  fileId: String,
  size: Number,
  width: Number,
  height: Number,
});

ImageSchema.virtual("url").get(function () {
  return getPublicUrl(this.fileName);
});

const PostSchema = new Schema({
  title: String,
  images: [ImageSchema],
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  tags: [String], // ← Changed to array of strings!
  upvote: [{ type: Schema.Types.ObjectId, ref: "User" }],
  downvote: [{ type: Schema.Types.ObjectId, ref: "User" }],
  upvoteNum: { type: Number, default: 0 },
  downvoteNum: { type: Number, default: 0 },
  adminApproved: { type: Boolean, default: false },
  comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  createdAt: { type: Date, default: Date.now },
});

// Add index for efficient tag queries
PostSchema.index({ tags: 1 });

//middleware for delete all comments when deleting a post
PostSchema.post("findOneAndDelete", async (post) => {
  if (post) {
    await Comment.deleteMany({
      _id: {
        $in: post.comments,
      },
    });
  }
});

module.exports = mongoose.model("Post", PostSchema);
