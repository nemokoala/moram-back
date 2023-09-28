const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.GPT_KEY,
});

module.exports = openai;
