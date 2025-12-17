const verifyToken = (req, res) => {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (challenge && token && token === accessToken) {
      res.status(200).send(challenge);
    } else {
      res.status(400).send("Token de verificación no válido");
    }
  } catch (error) {
    res.status(400).send("Error en la verificación del token");
  }
};

const receiveMessage = (req, res) => {
  res.send("Hola receive message");
};

module.exports = {
  verifyToken,
  receiveMessage,
};
