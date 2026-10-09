export function detect(messages, current) {
  const boundary = messages.findLastIndex((message) =>
    message.type === "compaction" && message.status === "completed"
  );
  const requests = messages.slice(boundary + 1).filter((message) =>
    message.type === "assistant" && message.id !== current.id &&
    message.time.created < current.time.created && message.tokens &&
    promptTokens(message.tokens) > 0
  );
  const previous = requests.at(-1);
  if (!previous || !current.tokens || promptTokens(current.tokens) === 0) return;
  const reported = current.tokens.cache.read + current.tokens.cache.write > 0 ||
    requests.some((message) => message.model.providerID === current.model.providerID &&
      message.tokens.cache.read + message.tokens.cache.write > 0);
  if (!reported) return;
  const missed = Math.min(promptTokens(previous.tokens), promptTokens(current.tokens)) - current.tokens.cache.read;
  if (missed < 20_000) return;
  const switched = previous.model.providerID !== current.model.providerID || previous.model.id !== current.model.id;
  const gap = Math.max(0, current.time.created - previous.time.created);
  const label = switched ? "after model switch" : gap >= 300_000 ? `after ${Math.round(gap / 60_000)}m between requests` : "cause unknown";
  return `Likely cache miss (${label}): ~${missed.toLocaleString("en-US")} prompt tokens re-billed`;
}

function promptTokens(tokens) {
  return tokens.input + tokens.cache.read + tokens.cache.write;
}
