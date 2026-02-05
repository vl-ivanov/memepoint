if (process.env.NODE_ENV !== "production") require("dotenv").config();

const mongoose = require("mongoose");
const { fakerEN: faker } = require("@faker-js/faker");
const Page = require("../models/page");

mongoose.connect(process.env.DB_URL);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async () => {
  console.log("Database connected");
  await seedDB();
  mongoose.connection.close();
});

const seedDB = async () => {
  await Page.deleteMany({});

  const pages = await Page.insertMany([
    {
      slug: "tos",
      title: "Terms of Service",
      content: faker.lorem.paragraphs(3),
      createdAt: faker.date.past(),
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      content: faker.lorem.paragraphs(3),
      createdAt: faker.date.past(),
    },
    {
      slug: "user-data-deletion",
      title: "User Data Deletion",
      content: faker.lorem.paragraphs(3),
      createdAt: faker.date.past(),
    },
  ]);

  console.log("Seeded pages");
};
