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
const oidc = require("./oidc.js");
const crypto = require("crypto");
const sentry = require("./sentry.js");
sentry.init(app);

const dbUrl = process.env.DB_URL || "";

if (!dbUrl) {
  console.error("DB_URL environment variable is not set.");
  process.exit(1);
}

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
const userRoutes = require("./routes/users");
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

app.get("/auth/login", async (req, res, next) => {
  try {
    await oidc.login(req, res);
  } catch (err) {
    req.flash("error", "Login unavailable, please try again");
    res.redirect("/users/login");
  }
});

app.get("/auth/callback", async (req, res, next) => {
  try {
    await oidc.callback(req, res);
  } catch (err) {
    console.error("OIDC callback error:", err.message);
    console.error(err);
    // Miracl returns a fresh user to the redirect_uri after registration,
    // but the returned code is not yet exchangeable for tokens. In that case
    // the correct UX is to send the user to the login step.
    const isRegistration =
      err.code === "OAUTH_WWW_AUTHENTICATE_CHALLENGE" ||
      err.message?.toLowerCase().includes("invalid_token") ||
      err.message?.toLowerCase().includes("invalid_client");
    if (isRegistration) {
      req.flash(
        "success",
        "Registration complete. Please log in with your new account.",
      );
      return res.redirect("/auth/login");
    }
    req.flash("error", "Login failed, please try again");
    res.redirect("/users/login");
  }
});

app.use(async (req, res, next) => {
  const profile = oidc.getProfile(req);
  if (!profile) {
    req.user = null;
    return next();
  }
  try {
    const { sub, email, name, nickname, picture } = profile;
    const username =
      nickname || name || (email && email.split("@")[0]) || sub;
    const isAdmin = process.env.ADMIN_EMAIL
      ? process.env.ADMIN_EMAIL.split(/\s*,\s*/).includes(email)
      : false;
    const user = await User.findOneAndUpdate(
      { miraclId: sub },
      {
        $set: { email, username, image: picture },
        $setOnInsert: { miraclId: sub, role: isAdmin ? "admin" : "user" },
      },
      { upsert: true, new: true, runValidators: true },
    );
    if (isAdmin && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
});

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.gravatar = req.user?.image
    ? req.user.image
    : getGravatarUrl(req.user ? req.user.email : "", {
        s: 100,
      });
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use("/", postRoutes);
app.use("/posts/:id/comments", commentRoutes);
app.use("/users", userRoutes);
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
