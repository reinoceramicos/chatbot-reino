const fs = require("fs");

const fileStream = fs.createWriteStream("logs.txt", {
  flags: "a",
  encoding: "utf8",
});

const log = (label, payload) => {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const body =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  const line = `[${ts}] ${label}: ${body}\n`;
  process.stdout.write(line);
  fileStream.write(line);
};

const verifyToken = (req, res) => {
  if (req.method !== "GET") return res.sendStatus(405);

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const {
    "hub.mode": mode,
    "hub.verify_token": token,
    "hub.challenge": challenge,
  } = req.query;

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    log("WEBHOOK VERIFIED", { mode, token });
    return res.status(200).send(challenge);
  }

  log("WEBHOOK VERIFY FAIL", { mode, token, expected: VERIFY_TOKEN });
  return res.sendStatus(403);
};

const receiveMessage = (req, res) => {
  try {
    log("RAW BODY", req.body);

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages) {
      log("NO_MESSAGES", req.body);
      return res.status(200).send("EVENT_RECEIVED");
    }

    messages.forEach((msg) => {
      log("MESSAGE", msg);
      if (msg.type === "text") {
        log("TEXT_BODY", msg.text?.body || "");
      }
    });

    return res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    log("WEBHOOK_ERROR", { message: err.message, stack: err.stack });
    return res.status(200).send("EVENT_RECEIVED");
  }
};

module.exports = {
  verifyToken,
  receiveMessage,
};
