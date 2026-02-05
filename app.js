require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const moment = require("moment");
const session = require("express-session");
const flash = require("@stz184/connect-flash");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const crypto = require("crypto");

require("./passport")(passport);

const dbUrl = process.env.DB_URL || "";

if (!dbUrl) {
  console.error("DB_URL environment variable is not set.");
  process.exit(1);
}

const User = require("./models/user");

const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auths");
const pageRoutes = require("./routes/pages");

// Helper function to generate Gravatar URL
function getGravatarUrl(email, options = {}) {
  if (!email) {
    email = "john@example.com";
  }
  const hash = crypto
    .createHash("md5")
    .update(email.toLowerCase().trim())
    .digest("hex");
  const size = options.s || 80;
  const defaultImg = options.d || "mp"; // mp = mystery person (generic silhouette)
  const rating = options.r || "g";
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImg}&r=${rating}`;
}

app.use((req, res, next) => {
  const currentPage = req.path
    .replace(/^\//, "")
    .replaceAll("/", "-")
    .toLowerCase();
  res.locals.moment = moment;
  res.locals.page = `page-${currentPage ? currentPage : "index"}`;
  res.locals.title = process.env.APP_NAME || "My Awesome Meme";

  next();
});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "static")));

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error("SESSION_SECRET is not defined");

const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week cookie
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.gravatar = getGravatarUrl(req.user ? req.user.email : "", {
    s: 100,
  });
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use("/", postRoutes);
app.use("/posts/:id/comments", commentRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/pages", pageRoutes);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("*", (req, res) => {
  res.render("errors/404");
});

mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on("error", console.log.bind(console, "connection error"));
db.once("open", () => {
  console.log("MongoDB connected, ready to serve");

  const port = process.env.PORT || 8030;

  app.listen(port, () => {
    console.log("Express server listening on port", port);
  });
});
