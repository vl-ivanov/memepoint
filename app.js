require("dotenv").config();

const express = require("express");
const app = express();
const helmet = require("helmet");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const moment = require("moment");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cookieParser = require("cookie-parser");
const flash = require("@stz184/connect-flash");
const mongoose = require("mongoose");
const { auth } = require("express-openid-connect");
const crypto = require("crypto");
const sentry = require("./sentry.js");
const openidConfig = require("./openid-config");
sentry.init(app);

const dbUrl = process.env.DB_URL || "";

if (!dbUrl) {
  console.error("DB_URL environment variable is not set.");
  process.exit(1);
}

// Apply the auth middleware
app.use(auth(openidConfig));

const User = require("./models/user");
// Generate a nonce for each request
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(32).toString("base64");
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Allow scripts from your domain and a specific CDN
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          "https://matomo.beautybytes.pro",
        ],

        // Allow images from your domain, data URIs, and external sources
        imgSrc: [
          "'self'",
          "data:",
          "https://www.gravatar.com",
          "https://f000.backblazeb2.com",
          "https://*.googleusercontent.com",
          "https://stackpath.bootstrapcdn.com",
          "https://images.myawesome.meme",
          "https://matomo.beautybytes.pro",
        ],

        // Allow styles from your domain and a specific font/service CDN
        styleSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://fonts.googleapis.com",
          "https://stackpath.bootstrapcdn.com",
        ],

        // Allow connections to your domain and specific APIs
        connectSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://matomo.beautybytes.pro",
        ],
      },
    },
  }),
);

app.use(function (req, res, next) {
  try {
    decodeURIComponent(req.path);
  } catch (err) {
    res.locals.currentUser = null;
    return res.render("errors/404").status(404);
  }
  next();
});

const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
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
  store: MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
  }),
};
app.use(cookieParser());
app.use(session(sessionConfig));
app.use(flash());

app.use(async (req, res, next) => {
  res.locals.gravatar = req.oidc.user?.image
      ? req.user.image
      : getGravatarUrl(req.user ? req.user.email : "", {
        s: 100,
      });

  res.locals.currentUser = null;

  if (req.oidc.user) {
    // create user if not exists
    const newUser = {
      username: (req.oidc.user?.email || req.oidc.user?.sub).split("@")[0],
      image: res.locals.gravatar,
      email: (req.oidc.user?.email || req.oidc.user?.sub),
      role: process.env.ADMIN_EMAIL.split(/\s*,\s*/).includes(
          (req.oidc.user?.email || req.oidc.user?.sub),
      ) ? "admin" : "user",
    };

    try {
      let user = await User.findOne({email: newUser.email});
      if (user) {
        user.role = process.env.ADMIN_EMAIL.split(/\s*,\s*/).includes(newUser.email) ? "admin" : "user";
        await user.save();
      } else {
        user = await User.create(newUser);
      }
      res.locals.currentUser = user;
    } catch (e) {
      console.log(e);
    }
  }

  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use("/", postRoutes);
app.use("/posts/:id/comments", commentRoutes);
app.use("/page", pageRoutes);

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
