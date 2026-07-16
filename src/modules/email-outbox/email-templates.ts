import type {
  EmailEventType,
  EmailOutboxPayload,
} from "./email-outbox.repository.js";

export type RenderedEmail = {
  subject: string;
  htmlBody: string;
  textBody: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stringValue(
  payload: EmailOutboxPayload,
  key: string,
  fallback = ""
): string {
  const value = payload[key];

  return typeof value === "string"
    ? value
    : fallback;
}

function numberValue(
  payload: EmailOutboxPayload,
  key: string,
  fallback = 0
): number {
  const value = payload[key];

  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : fallback;
}

function formatAmount(
  amount: string,
  currencyCode: string
): string {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${amount} ${currencyCode}`.trim();
  }

  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(numericAmount) +
    ` ${currencyCode}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "No disponible";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function layout(input: {
  title: string;
  userName: string;
  contentHtml: string;
  contentText: string[];
  callToAction?: {
    label: string;
    url: string;
  };
}): RenderedEmail {
  const safeTitle = escapeHtml(input.title);
  const safeUserName = escapeHtml(
    input.userName || "Usuario"
  );

  const ctaHtml = input.callToAction
    ? `
      <p style="margin:28px 0 8px">
        <a href="${escapeHtml(input.callToAction.url)}"
          style="display:inline-block;padding:12px 18px;border-radius:10px;background:#6d5dfc;color:#ffffff;text-decoration:none;font-weight:700">
          ${escapeHtml(input.callToAction.label)}
        </a>
      </p>
    `
    : "";

  const htmlBody = `
    <!doctype html>
    <html lang="es">
      <body style="margin:0;background:#07111f;font-family:Arial,sans-serif;color:#edf3fb">
        <div style="max-width:640px;margin:0 auto;padding:32px 18px">
          <div style="background:#0e1c2e;border:1px solid #263a54;border-radius:18px;padding:28px">
            <p style="margin:0 0 18px;font-size:22px;font-weight:800;color:#ffffff">TravelGo</p>
            <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#ffffff">${safeTitle}</h1>
            <p style="margin:0 0 18px;color:#b8c5d8">Hola ${safeUserName},</p>
            ${input.contentHtml}
            ${ctaHtml}
            <hr style="border:0;border-top:1px solid #263a54;margin:28px 0">
            <p style="margin:0;color:#8fa0b7;font-size:13px;line-height:1.5">
              TravelGo es una plataforma educativa y demostrativa. Los saldos,
              depósitos, transferencias, intercambios, alias y CVU son simulados
              y no representan dinero ni cuentas bancarias reales.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = [
    "TravelGo",
    input.title,
    "",
    `Hola ${input.userName || "Usuario"},`,
    "",
    ...input.contentText,
    ...(input.callToAction
      ? [
          "",
          `${input.callToAction.label}:`,
          input.callToAction.url,
        ]
      : []),
    "",
    "TravelGo es una plataforma educativa y demostrativa. Los saldos, depósitos, transferencias, intercambios, alias y CVU son simulados y no representan dinero ni cuentas bancarias reales.",
  ].join("\n");

  return {
    subject: `TravelGo - ${input.title}`,
    htmlBody,
    textBody,
  };
}

function detailList(
  details: Array<[string, string]>
): string {
  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${details
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:9px 0;color:#8fa0b7;border-bottom:1px solid #263a54">${escapeHtml(label)}</td>
              <td style="padding:9px 0;text-align:right;color:#ffffff;border-bottom:1px solid #263a54;font-weight:700">${escapeHtml(value)}</td>
            </tr>
          `
        )
        .join("")}
    </table>
  `;
}

function renderDashboardSummary(
  payload: EmailOutboxPayload
): RenderedEmail {
  const userName = stringValue(
    payload,
    "userName",
    "Usuario"
  );
  const days = numberValue(payload, "days", 30);
  const alias = stringValue(
    payload,
    "travelgoAlias",
    "No disponible"
  );
  const cvu = stringValue(
    payload,
    "travelgoCvu",
    "No disponible"
  );

  const balances = Array.isArray(payload.balances)
    ? payload.balances
    : [];
  const recent = Array.isArray(payload.recentTransactions)
    ? payload.recentTransactions
    : [];
  const counts =
    typeof payload.operationCounts === "object" &&
    payload.operationCounts !== null
      ? payload.operationCounts as Record<string, unknown>
      : {};
  const rates =
    typeof payload.rates === "object" &&
    payload.rates !== null
      ? payload.rates as Record<string, unknown>
      : null;

  const balanceRows = balances
    .map((item) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return "";
      }

      const row = item as Record<string, unknown>;
      const currencyCode =
        typeof row.currencyCode === "string"
          ? row.currencyCode
          : "";
      const amount =
        typeof row.amount === "string"
          ? row.amount
          : "0";

      return `
        <tr>
          <td style="padding:8px 0;color:#b8c5d8">${escapeHtml(currencyCode)}</td>
          <td style="padding:8px 0;text-align:right;color:#ffffff;font-weight:700">${escapeHtml(formatAmount(amount, currencyCode))}</td>
        </tr>
      `;
    })
    .join("");

  const recentRows = recent
    .slice(0, 5)
    .map((item) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return "";
      }

      const row = item as Record<string, unknown>;
      const type =
        typeof row.type === "string"
          ? row.type
          : "operación";
      const direction =
        typeof row.direction === "string"
          ? row.direction
          : "";
      const amount =
        typeof row.amount === "string"
          ? row.amount
          : "";
      const currencyCode =
        typeof row.currencyCode === "string"
          ? row.currencyCode
          : "";
      const createdAt =
        typeof row.createdAt === "string"
          ? row.createdAt
          : "";

      return `
        <li style="margin:0 0 9px;color:#b8c5d8">
          <strong style="color:#ffffff">${escapeHtml(type)}</strong>
          ${direction ? `(${escapeHtml(direction)})` : ""}
          ${amount ? `— ${escapeHtml(formatAmount(amount.replace(/^\+/, ""), currencyCode))}` : ""}
          ${createdAt ? `— ${escapeHtml(formatDate(createdAt))}` : ""}
        </li>
      `;
    })
    .join("");

  const countDetails: Array<[string, string]> = [
    ["Operaciones totales", String(counts.total ?? 0)],
    ["Depósitos", String(counts.deposits ?? 0)],
    ["Transferencias enviadas", String(counts.transfersSent ?? 0)],
    ["Transferencias recibidas", String(counts.transfersReceived ?? 0)],
    ["Intercambios", String(counts.exchanges ?? 0)],
  ];

  const rateDetails: Array<[string, string]> = [];

  if (rates) {
    for (const [currencyCode, value] of Object.entries(rates)) {
      if (
        typeof value === "number" &&
        Number.isFinite(value)
      ) {
        rateDetails.push([
          `ARS → ${currencyCode}`,
          String(value),
        ]);
      }
    }
  }

  const contentHtml = `
    <p style="color:#b8c5d8">Este es el resumen solicitado de tu dashboard para los últimos ${days} días.</p>
    ${detailList([
      ["Alias TravelGo", alias],
      ["CVU TravelGo", cvu],
    ])}
    <h2 style="font-size:18px;color:#ffffff;margin:24px 0 8px">Balances actuales</h2>
    <table style="width:100%;border-collapse:collapse">${balanceRows || '<tr><td style="color:#8fa0b7">Sin balances disponibles</td></tr>'}</table>
    <h2 style="font-size:18px;color:#ffffff;margin:24px 0 8px">Actividad</h2>
    ${detailList(countDetails)}
    <h2 style="font-size:18px;color:#ffffff;margin:24px 0 8px">Últimos movimientos</h2>
    <ul style="padding-left:20px">${recentRows || '<li style="color:#8fa0b7">Todavía no hay movimientos.</li>'}</ul>
    <h2 style="font-size:18px;color:#ffffff;margin:24px 0 8px">Tasas de referencia</h2>
    ${rateDetails.length > 0
      ? detailList(rateDetails)
      : '<p style="color:#8fa0b7">No fue posible incluir tasas en este resumen.</p>'}
  `;

  const textBalances = balances
    .map((item) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return "";
      }
      const row = item as Record<string, unknown>;
      return `${String(row.currencyCode ?? "")}: ${String(row.amount ?? "0")}`;
    })
    .filter(Boolean);

  return layout({
    title: `Resumen de tu dashboard (${days} días)`,
    userName,
    contentHtml,
    contentText: [
      `Alias TravelGo: ${alias}`,
      `CVU TravelGo: ${cvu}`,
      "",
      "Balances:",
      ...textBalances,
      "",
      ...countDetails.map(
        ([label, value]) => `${label}: ${value}`
      ),
    ],
  });
}

export function renderEmail(
  eventType: EmailEventType,
  payload: EmailOutboxPayload
): RenderedEmail {
  const userName = stringValue(
    payload,
    "userName",
    "Usuario"
  );

  if (eventType === "user_registered") {
    const alias = stringValue(
      payload,
      "travelgoAlias",
      "No disponible"
    );
    const cvu = stringValue(
      payload,
      "travelgoCvu",
      "No disponible"
    );
    const dashboardUrl = stringValue(
      payload,
      "dashboardUrl"
    );

    return layout({
      title: "Bienvenido a TravelGo",
      userName,
      contentHtml: `
        <p style="color:#b8c5d8">Tu cuenta fue creada correctamente. Ya podés usar saldos simulados, transferencias e intercambios de monedas.</p>
        ${detailList([
          ["Alias TravelGo", alias],
          ["CVU TravelGo", cvu],
        ])}
      `,
      contentText: [
        "Tu cuenta fue creada correctamente.",
        `Alias TravelGo: ${alias}`,
        `CVU TravelGo: ${cvu}`,
      ],
      callToAction: dashboardUrl
        ? {
            label: "Abrir mi dashboard",
            url: dashboardUrl,
          }
        : undefined,
    });
  }

  if (eventType === "deposit_completed") {
    const amount = stringValue(payload, "amount");
    const currencyCode = stringValue(
      payload,
      "currencyCode"
    );
    const balanceAfter = stringValue(
      payload,
      "balanceAfter"
    );
    const transactionId = stringValue(
      payload,
      "transactionId"
    );
    const createdAt = stringValue(
      payload,
      "createdAt"
    );

    const details: Array<[string, string]> = [
      ["Monto", formatAmount(amount, currencyCode)],
      ["Saldo actualizado", formatAmount(balanceAfter, currencyCode)],
      ["Fecha", formatDate(createdAt)],
      ["Operación", transactionId],
    ];

    return layout({
      title: "Depósito simulado realizado",
      userName,
      contentHtml: detailList(details),
      contentText: details.map(
        ([label, value]) => `${label}: ${value}`
      ),
    });
  }

  if (
    eventType === "transfer_sent" ||
    eventType === "transfer_received"
  ) {
    const amount = stringValue(payload, "amount");
    const currencyCode = stringValue(
      payload,
      "currencyCode"
    );
    const counterparty = stringValue(
      payload,
      "counterparty",
      "Usuario TravelGo"
    );
    const transactionId = stringValue(
      payload,
      "transactionId"
    );
    const createdAt = stringValue(
      payload,
      "createdAt"
    );
    const balanceAfter = stringValue(
      payload,
      "balanceAfter"
    );

    const details: Array<[string, string]> = [
      ["Monto", formatAmount(amount, currencyCode)],
      [
        eventType === "transfer_sent"
          ? "Destinatario"
          : "Remitente",
        counterparty,
      ],
      ["Fecha", formatDate(createdAt)],
      ["Operación", transactionId],
    ];

    if (
      eventType === "transfer_sent" &&
      balanceAfter
    ) {
      details.splice(1, 0, [
        "Saldo actualizado",
        formatAmount(balanceAfter, currencyCode),
      ]);
    }

    return layout({
      title:
        eventType === "transfer_sent"
          ? "Transferencia enviada"
          : "Recibiste una transferencia",
      userName,
      contentHtml: detailList(details),
      contentText: details.map(
        ([label, value]) => `${label}: ${value}`
      ),
    });
  }

  if (eventType === "exchange_completed") {
    const fromCurrency = stringValue(
      payload,
      "fromCurrency"
    );
    const toCurrency = stringValue(
      payload,
      "toCurrency"
    );
    const fromAmount = stringValue(
      payload,
      "fromAmount"
    );
    const toAmount = stringValue(
      payload,
      "toAmount"
    );
    const exchangeRate = stringValue(
      payload,
      "exchangeRate"
    );
    const transactionId = stringValue(
      payload,
      "transactionId"
    );
    const createdAt = stringValue(
      payload,
      "createdAt"
    );

    const details: Array<[string, string]> = [
      ["Entregaste", formatAmount(fromAmount, fromCurrency)],
      ["Recibiste", formatAmount(toAmount, toCurrency)],
      ["Tasa utilizada", exchangeRate],
      ["Fecha", formatDate(createdAt)],
      ["Operación", transactionId],
    ];

    return layout({
      title: "Intercambio realizado",
      userName,
      contentHtml: detailList(details),
      contentText: details.map(
        ([label, value]) => `${label}: ${value}`
      ),
    });
  }

  if (eventType === "dashboard_summary") {
    return renderDashboardSummary(payload);
  }

  const dashboardUrl = stringValue(
    payload,
    "dashboardUrl"
  );

  return layout({
    title: "Tu dashboard está listo",
    userName,
    contentHtml: `
      <p style="color:#b8c5d8">
        Iniciaste sesión hace unos minutos. Recordá que desde TravelGo podés
        consultar tus balances, movimientos y gráficos, y solicitar manualmente
        un resumen completo por correo.
      </p>
    `,
    contentText: [
      "Iniciaste sesión hace unos minutos.",
      "Desde tu dashboard podés consultar balances, movimientos y gráficos, y solicitar manualmente un resumen completo por correo.",
    ],
    callToAction: dashboardUrl
      ? {
          label: "Ver mi dashboard",
          url: dashboardUrl,
        }
      : undefined,
  });
}
