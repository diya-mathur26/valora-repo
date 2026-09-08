// Netlify serverless function — keeps the OpenRouter API key secret on the server.
// The key lives ONLY in Netlify's environment variables (Site settings -> Environment variables),
// never in the browser, never committed to the repo.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OPENROUTER_API_KEY is not set in environment variables." })
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing prompt" }) };
    }

    // Use ONE model only, with a hard timeout well under Netlify's function limit.
    // Trying multiple models one after another causes the whole function to time out,
    // because each attempt eats into the same 10-second budget.
    const MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s safety margin under the 10s limit

    let res;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }]
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await res.json();

    if (data?.error) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: data.error.message || JSON.stringify(data.error) })
      };
    }

    const text = data?.choices?.[0]?.message?.content || null;

    if (!text) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Model returned no content." })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, modelUsed: MODEL })
    };
  } catch (err) {
    if (err.name === "AbortError") {
      return {
        statusCode: 504,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Model request timed out." })
      };
    }
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
