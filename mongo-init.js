db.createUser({
  user: "appuser",
  pwd: process.env.MONGO_PASSWORD,
  roles: [
    {
      role: "readWrite",
      db: "myawesomememe",
    },
    {
      role: "dbOwner",
      db: "myawesomememe",
    },
  ],
});
