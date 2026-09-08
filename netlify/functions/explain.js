// Netlify serverless function — keeps the OpenRouter API key secret on the server.
// The key lives ONLY in Netlify's environment variables (Site settings -> Environment variables),
// never in the browser, never committed to the repo.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const apiKey = process.env.OPENROUTER_API_KEY; // <-- paste your real OpenRouter key here

  try {
    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing prompt" }) };
    }

    // NOTE: OpenRouter's free model IDs rotate over time and get retired without
    // notice. Instead of relying on one slug, try a short list in order and use
    // whichever one is currently live. If all fail, check https://openrouter.ai/models
    // (filter by "Free") for current :free slugs and update this list.
    const MODELS = [
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "poolside/laguna-s-2.1:free",
      "nvidia/nemotron-3-super-120b-a12b:free"
    ];

    let lastError = null;

    for (const model of MODELS) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await res.json();

      if (data?.error) {
        lastError = data.error.message || JSON.stringify(data.error);
        continue; // try the next model
      }

      const text = data?.choices?.[0]?.message?.content || null;
      if (text) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, modelUsed: model })
        };
      }
      lastError = "Model returned no content.";
    }

    // Every model in the list failed — surface the last real error instead of
    // silently returning null, so this doesn't hide the failure again.
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `All fallback models failed. Last error: ${lastError}` })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
