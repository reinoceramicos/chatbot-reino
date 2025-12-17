const express = require("express");
const apiRoutes = require("./routes/route");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/webhook", apiRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
