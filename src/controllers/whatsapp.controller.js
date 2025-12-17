const verifyToken = (req, res) => {
  res.send("Hola verify token");
};

const receiveMessage = (req, res) => {
  res.send("Hola receive message");
};

module.exports = {
  verifyToken,
  receiveMessage,
};
