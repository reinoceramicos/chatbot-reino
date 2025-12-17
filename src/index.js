require("dotenv").config();
const express = require("express");
const apiRoutes = require("./routes/route");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/webhook", apiRoutes);

app.use((req, _res, next) => {
  if (req.path.startsWith("/webhook")) {
    console.log("IN", req.method, req.originalUrl, req.headers["user-agent"]);
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
