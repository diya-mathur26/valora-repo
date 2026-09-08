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

    // Use OpenRouter's free model auto-router: it picks a currently-working free model
    // for you, so we don't depend on one specific model slug staying available or fast.
    // Only ONE call is made (no looping), with a hard timeout well under Netlify's limit.
    const MODEL = "openrouter/free";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // leaves more buffer under Netlify's 10s limit

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
