const express = require("express");
const router = express.Router();
const posts = require("../controllers/posts");
const { isLoggedIn } = require("../middleware");
const multer = require("multer");
const b2storage = require("../backblaze-b2/index");
const upload = multer({ storage: b2storage() });

router
  .route("/")
  .get(posts.index)
  .post(isLoggedIn, upload.array("image"), posts.createPost);

router.get("/new", isLoggedIn, posts.renderNewForm);

router.get("/random", posts.randomPost);

router.get("/more", posts.getMorePosts);

router.get("/:id/edit", isLoggedIn, posts.renderEditForm);

router
  .route("/:id")
  .get(posts.showPost)
  .put(isLoggedIn, posts.updatePost)
  .delete(isLoggedIn, posts.deletePost);

router.put("/:id/vote-up", isLoggedIn, posts.upvotePost);
router.put("/:id/vote-down", isLoggedIn, posts.downvotePost);

module.exports = router;
