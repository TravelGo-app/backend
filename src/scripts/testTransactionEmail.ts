import { sendTransactionEmail } from "../services/email.service.js";

const toEmail = process.argv[2];

if (!toEmail) {
  throw new Error(
    "Uso: npm run email:test -- correo@ejemplo.com"
  );
}

try {
  const result = await sendTransactionEmail({
    toEmail,
    userName: "Usuario de prueba",
    type: "EXCHANGE",
    fromCurrency: "ARS",
    toCurrency: "USD",
    fromAmount: 10000,
    toAmount: 6.72,
    timestamp: new Date().toISOString(),
    transactionId: "TEST-EMAIL-001",
  });

  console.log(
    JSON.stringify(result, null, 2)
  );
} catch (error) {
  console.error(
    "Error probando AWS SES:",
    error
  );

  process.exitCode = 1;
}