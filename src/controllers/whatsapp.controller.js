const { Console } = require("console");
const fs = require("fs");

const myConsole = new Console({
  stdout: fs.createWriteStream("logs.txt"),
  stderr: fs.createWriteStream("logs.txt"),
});

function extractIncomingMessages(value) {
  if (!value?.messages) return [];

  return value.messages.map((msg) => ({
    from: msg.from,
    type: msg.type,
    text: msg.text?.body ?? null,
    button: msg.button ?? null,
    interactive: msg.interactive ?? null,
    timestamp: msg.timestamp,
  }));
}

const verifyToken = (req, res) => {
  if (req.method !== "GET") {
    return res.sendStatus(405);
  }

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const {
    "hub.mode": mode,
    "hub.verify_token": token,
    "hub.challenge": challenge,
  } = req.query;

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    myConsole.log("WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

const receiveMessage = (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const messages = extractIncomingMessages(value);

    if (!messages || messages.length === 0) {
      myConsole.log("No incoming messages");
      return res.status(200).send("EVENT_RECEIVED");
    }

    messages.forEach((m) => {
      myConsole.log(JSON.stringify(m, null, 2));
    });

    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    myConsole.error("Webhook parse error", error);
    return res.status(200).send("EVENT_RECEIVED");
  }
};

module.exports = { verifyToken, receiveMessage };
