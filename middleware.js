const Post = require("./models/post");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.requestedUrl = req.originalUrl;
    req.flash("error", "You have to login first");
    // check if it is an ajax request
    if (req.xhr) {
      return res.json({
        error: "You have to login first",
        redirect: "/users/login",
      });
    }
    return res.redirect("/users/login");
  }
  next();
};

module.exports.isAdminOrPostOwner = async (req, res, next) => {
  const postId = req.params.id;
  const post = await Post.findById(postId);
  if (!post) {
    return res.json({ error: "Post not found" });
  }

  if (!req.user.role === "admin") {
    if (req.user.id !== post.author.id) {
      return res.json({
        error: "You are not authorized to perform this action",
      });
    }
  }

  req.post = post;
  next();
};
