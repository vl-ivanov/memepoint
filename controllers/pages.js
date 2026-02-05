const Page = require("../models/page");
const Comment = require("../models/comment");

module.exports.getPage = async (req, res) => {
  const slug = req.params.slug;
  const page = await Page.findOne({ slug });
  if (!page) {
    res.render("errors/404");
  } else {
    res.render("pages/show", { page });
  }
};
