const verifyToken = (req, res) => {
  if (req.method === "HEAD") return res.sendStatus(200);

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && challenge && token === VERIFY_TOKEN) {
    console.log("WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  console.warn("Webhook verification failed", {
    mode,
    tokenReceived: token,
    expectedToken: VERIFY_TOKEN,
  });
  return res.sendStatus(403);
};

const receiveMessage = (req, res) => {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(
    `\nWebhook received ${timestamp}\n${JSON.stringify(req.body, null, 2)}\n`
  );
  return res.sendStatus(200);
};

module.exports = { verifyToken, receiveMessage };
