const verifyToken = (req, res) => {
  // defensa extra por si Express enruta HEAD a GET igual
  if (req.method === "HEAD") return res.sendStatus(200);

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // más tolerante: si hay challenge y token ok, devolvés challenge
  if (token && challenge && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

const receiveMessage = (req, res) => {
  res.send("Hola receive message");
};

module.exports = { verifyToken, receiveMessage };
