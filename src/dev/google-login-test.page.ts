import type { Request, Response } from "express";

import { env } from "../config/env.js";

export function googleLoginTestPage(
  _req: Request,
  res: Response
): void {
  if (
    !env.googleAuthEnabled ||
    !env.googleClientId
  ) {
    res
      .status(503)
      .type("html")
      .send(
        "<h1>Google Login no está configurado</h1>"
      );

    return;
  }

  const clientId = JSON.stringify(
    env.googleClientId
  );

  res.status(200).type("html").send(`
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">

  <meta
    name="referrer"
    content="no-referrer-when-downgrade"
  >

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>TravelGo Google Login Test</title>

  <script
    src="https://accounts.google.com/gsi/client"
    async
    defer
  ></script>
</head>

<body>
  <h1>TravelGo Google Login</h1>

  <div id="google-button"></div>

  <h2>Autenticación</h2>

  <pre id="auth-result">
Esperando autenticación...
  </pre>

  <button
    id="test-profile"
    type="button"
    disabled
  >
    Probar /api/auth/me
  </button>

  <button
    id="test-balances"
    type="button"
    disabled
  >
    Probar /api/wallet/balances
  </button>

  <h2>Perfil</h2>

  <pre id="profile-result">
Sin ejecutar
  </pre>

  <h2>Balances</h2>

  <pre id="balances-result">
Sin ejecutar
  </pre>

  <script>
    let travelGoToken = "";

    async function handleCredentialResponse(
      response
    ) {
      const resultElement =
        document.getElementById(
          "auth-result"
        );

      try {
        const apiResponse = await fetch(
          "/api/auth/google",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              credential:
                response.credential
            })
          }
        );

        const data =
          await apiResponse.json();

        if (!apiResponse.ok) {
          resultElement.textContent =
            "HTTP " +
            apiResponse.status +
            "\\n" +
            JSON.stringify(
              data,
              null,
              2
            );

          return;
        }

        travelGoToken =
          data.token || "";

        const safeData = {
          ...data,
          token: travelGoToken
            ? "[JWT generado correctamente]"
            : null
        };

        resultElement.textContent =
          "HTTP " +
          apiResponse.status +
          "\\n" +
          JSON.stringify(
            safeData,
            null,
            2
          );

        document.getElementById(
          "test-profile"
        ).disabled = !travelGoToken;

        document.getElementById(
          "test-balances"
        ).disabled = !travelGoToken;
      } catch (error) {
        resultElement.textContent =
          String(error);
      }
    }

    async function testProtectedRoute(
      path,
      resultElementId
    ) {
      const resultElement =
        document.getElementById(
          resultElementId
        );

      if (!travelGoToken) {
        resultElement.textContent =
          "Primero iniciá sesión con Google.";

        return;
      }

      try {
        const apiResponse = await fetch(
          path,
          {
            method: "GET",
            headers: {
              Authorization:
                "Bearer " +
                travelGoToken
            }
          }
        );

        const data =
          await apiResponse.json();

        resultElement.textContent =
          "HTTP " +
          apiResponse.status +
          "\\n" +
          JSON.stringify(
            data,
            null,
            2
          );
      } catch (error) {
        resultElement.textContent =
          String(error);
      }
    }

    window.addEventListener(
      "load",
      function () {
        google.accounts.id.initialize({
          client_id: ${clientId},
          callback:
            handleCredentialResponse,
          ux_mode: "popup"
        });

        google.accounts.id.renderButton(
          document.getElementById(
            "google-button"
          ),
          {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular"
          }
        );
      }
    );

    document.getElementById(
      "test-profile"
    ).addEventListener(
      "click",
      function () {
        testProtectedRoute(
          "/api/auth/me",
          "profile-result"
        );
      }
    );

    document.getElementById(
      "test-balances"
    ).addEventListener(
      "click",
      function () {
        testProtectedRoute(
          "/api/wallet/balances",
          "balances-result"
        );
      }
    );
  </script>
</body>
</html>
  `);
}