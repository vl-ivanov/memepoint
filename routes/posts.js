const express = require("express");
const router = express.Router();
const posts = require("../controllers/posts");
const { isLoggedIn } = require("../middleware");
const multer = require("multer");
const b2storage = require("../helpers/backblaze-b2/index");
const upload = multer({ storage: b2storage() });

router.route("/").get(posts.index);

router.post("/posts", isLoggedIn, upload.array("image"), posts.createPost);

router.get("/posts/new", isLoggedIn, posts.renderNewForm);

router.get("/posts/random", posts.randomPost);

router.get("/posts/more", posts.getMorePosts);

router.get("/posts/:id/edit", isLoggedIn, posts.renderEditForm);

router.get("/posts/tagged/:tag", posts.taggedPosts);

router
  .route("/posts/:id")
  .get(posts.showPost)
  .put(isLoggedIn, posts.updatePost)
  .delete(isLoggedIn, posts.deletePost);

router.put("/posts/:id/vote-up", isLoggedIn, posts.upvotePost);
router.put("/posts/:id/vote-down", isLoggedIn, posts.downvotePost);

module.exports = router;
