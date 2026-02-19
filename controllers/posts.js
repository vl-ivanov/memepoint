const Post = require("../models/post");
const Tag = require("../models/tag");
const backblaze = require("../helpers/backblaze-b2");
const { getPublicUrl } = require("../helpers/backblaze-b2/helper");

function getFilterQuery(req) {
  const query = req.query.q
    ? { title: { $regex: req.query.q, $options: "i" } }
    : {};
  if (req.user?.role !== "admin") {
    query.adminApproved = true;
  }
  return query;
}

async function getPopularTags() {
  return await Tag.find({})
    .sort({ countNum: "desc" })
    .limit(15)
    .sort({ body: "asc" });
}

const pageSize = 10;

module.exports.index = async (req, res) => {
  let { page } = req.query;

  page = parseInt(page, 10) || 1;
  if (page > 100) {
    page = 100;
  }

  const query = getFilterQuery(req);
  const posts = await Post.find(query)
    .sort()
    .sort({ createdAt: "desc" })
    .populate("tags")
    .limit(pageSize * page);

  const popularTags = await getPopularTags();
  const currUser = req.user;
  res.render("posts/index", { posts, popularTags, currUser });
};

module.exports.getMorePosts = async (req, res) => {
  let { page } = req.query;

  page = parseInt(page, 10) || 1;

  const query = getFilterQuery(req);
  const posts = await Post.find(query)
    .sort()
    .sort({ createdAt: "desc" })
    .populate("tags")
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  if (!posts.length) {
    return res.status(404).send("No more posts found");
  }

  const currUser = req.user;
  res.render("posts/more", { posts, currUser });
};

module.exports.renderNewForm = async (req, res) => {
  const tags = await Tag.aggregate([
    {
      $group: {
        _id: "$category",
        tags: {
          $push: "$$ROOT",
        },
      },
    },
  ]);
  res.render("posts/new", { tags });
};

module.exports.createPost = async (req, res) => {
  const post = new Post(req.body.post);
  post.images = req.files.map((f) => ({
    fileName: f.fileName,
    fileId: f.fileId,
    size: f.size,
    width: f.width,
    height: f.height,
  }));
  post.author = req.user._id;
  post.upvote = [];
  post.upvoteNum = 0;
  post.downvote = [];
  post.downvoteNum = 0;

  // Normalize tags: trim, lowercase, remove duplicates
  let tags = req.body?.post?.tags;
  if (typeof tags === "string") {
    tags = [tags];
  }

  if (Array.isArray(tags) && tags.length > 0) {
    tags = tags.map((t) => t.trim().toLowerCase());
  } else {
    req.flash("error", "Invalid tags format");
    res.redirect("/posts/new");
    return;
  }

  tags = [...new Set(tags)]; // Remove duplicates
  post.tags = tags;

  post.adminApproved = req.user.role === "admin";

  await post.save();

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

  req.flash("success", "Post created!");
  res.redirect(`/posts/${post._id}`);
};

module.exports.showPost = async (req, res) => {
  const tags = await Tag.find({}).sort({ body: "asc" });
  try {
    let post = await Post.findById(req.params.id || post._id)
      .populate("tags")
      .populate("author")
      .populate({
        path: "comments",
        populate: {
          path: "author",
        },
      });
    if (!post || (!post.adminApproved && req.user.role !== "admin")) {
      res.render("errors/404");
    } else {
      const currUser = req.user;
      const popularTags = await Tag.find({})
        .sort({ countNum: "desc" })
        .limit(15)
        .sort({ body: "asc" });

      res.locals.title = post.title;
      res.render("posts/show", { post, tags, popularTags, currUser });
    }
  } catch (e) {
    return res.render("errors/404");
  }
};

module.exports.randomPost = async (req, res) => {
  const randomPost = await Post.aggregate([
    { $match: { adminApproved: true } }, // your filters here
    { $sample: { size: 1 } },
  ]);

  // randomDoc is an array, so access [0]
  const post = randomPost[0];

  if (!post) {
    res.render("errors/404");
    return;
  }
  res.redirect(`${post._id}`);
};

module.exports.renderEditForm = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.render("errors/404");
  } else {
    res.render("posts/edit", { post });
  }
};

module.exports.updatePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.render("errors/404");
  } else {
    await Post.findByIdAndUpdate(req.params.id, { ...req.body.post });
    await post.save();
    req.flash("success", "Post updated!");
    res.redirect(`/posts/${req.params.id}`);
  }
};

module.exports.deletePost = async (req, res) => {
  const post = req.post;
  if (!post) {
    res.status(404).send("Post not found");
  } else {
    for (let tagName of post.tags) {
      var tag = await Tag.findOne({ name: tagName });
      tag.countNum--;
      await tag.save();
    }
    for (let image of post.images) {
      await backblaze().destroy(image.fileId, image.fileName);
    }
    await Post.findByIdAndDelete(req.params.id);
    res.status(200).send("Post deleted!");
  }
};

module.exports.upvotePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res
      .status(404)
      .header("Content-Type", "application/json")
      .send({ error: "Post not found" })
      .end();
  } else {
    const upvoted = await Post.find({
      _id: req.params.id,
      upvote: { $in: [req.user._id] },
    });
    const downvoted = await Post.find({
      _id: req.params.id,
      downvote: { $in: [req.user._id] },
    });
    if (downvoted.length > 0 && upvoted.length <= 0) {
      post.downvoteNum -= 1;
      await post.updateOne({ $pull: { downvote: { $in: [req.user._id] } } });
      post.upvoteNum += 1;
      post.upvote.push(req.user._id);
    } else if (upvoted.length > 0) {
      post.upvoteNum -= 1;
      await post.updateOne({ $pull: { upvote: { $in: [req.user._id] } } });
    } else {
      post.upvoteNum += 1;
      post.upvote.push(req.user._id);
    }
    post.save();
    res
      .status(200)
      .header("Content-Type", "application/json")
      .send({
        message: "Post upvoted!",
        upvoteNum: post.upvoteNum,
        downvoteNum: post.downvoteNum,
      })
      .end();
  }
};

module.exports.downvotePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res
      .status(404)
      .header("Content-Type", "application/json")
      .send({ error: "Post not found" })
      .end();
  } else {
    const upvoted = await Post.find({
      _id: req.params.id,
      upvote: { $in: [req.user._id] },
    });
    const downvoted = await Post.find({
      _id: req.params.id,
      downvote: { $in: [req.user._id] },
    });
    if (upvoted.length > 0 && downvoted.length <= 0) {
      post.upvoteNum -= 1;
      await post.updateOne({ $pull: { upvote: { $in: [req.user._id] } } });
      post.downvoteNum += 1;
      post.downvote.push(req.user._id);
    } else if (downvoted.length > 0) {
      post.downvoteNum -= 1;
      await post.updateOne({ $pull: { downvote: { $in: [req.user._id] } } });
    } else {
      post.downvoteNum += 1;
      post.downvote.push(req.user._id);
    }
    post.save();
    res
      .status(200)
      .header("Content-Type", "application/json")
      .send({
        message: "Post downvoted!",
        upvoteNum: post.upvoteNum,
        downvoteNum: post.downvoteNum,
      })
      .end();
  }
};

module.exports.taggedPosts = async (req, res) => {
  const posts = await Post.find({ tags: { $in: [req.params.tag] } });
  const popularTags = await getPopularTags();

  res.locals.title = `Memes Tagged: ${req.params.tag}`;
  res.render("posts/index", { posts, popularTags });
};

module.exports.approvePost = async (req, res) => {
  const post = req.post;
  if (!post) {
    res
      .status(404)
      .header("Content-Type", "application/json")
      .send({ error: "Post not found" })
      .end();
  } else {
    post.adminApproved = true;
    await post.save();
    res
      .status(200)
      .header("Content-Type", "application/json")
      .send({ message: "Post approved!" })
      .end();
  }
};
