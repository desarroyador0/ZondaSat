// =====================================================================
// Netlify Serverless Function — Proxy seguro para la API de Gemini
// Lee la clave desde la variable de entorno GEMINI_API_KEY en Netlify
// para que nunca quede expuesta en el frontend ni en el repositorio.
// =====================================================================

exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Falta configurar GEMINI_API_KEY en las variables de entorno de Netlify." })
        };
    }

    try {
        const { accion, modelo, cuerpo } = JSON.parse(event.body || "{}");

        if (accion === "listar") {
            const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
                headers: { "x-goog-api-key": apiKey }
            });
            const text = await resp.text();
            return { statusCode: resp.status, headers, body: text };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo || "gemini-2.5-flash")}:generateContent`;
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify(cuerpo)
        });

        const text = await resp.text();
        return { statusCode: resp.status, headers, body: text };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || "Error interno en la función de Gemini" })
        };
    }
};
