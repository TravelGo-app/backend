import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { CurrencyCode } from "../../config/currencies.js";
import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/AppError.js";
import { getRatePair } from "../rates/rates.service.js";
import { findWalletByUserId } from "../wallet/wallet.repository.js";
import {
  acquireIdempotencyLock,
  calculateExchangeAmounts,
  createTransaction,
  creditBalance,
  debitBalance,
  findRecipientWalletByEmail,
  findTransactionByIdempotencyKey,
  lockBalances,
  lockWallets,
  type BalanceRow,
  type TransactionRow,
} from "./transactions.repository.js";
import type {
  DepositInput,
  ExchangeInput,
  TransferInput,
} from "./transactions.schemas.js";

type OperationResult = {
  idempotentReplay: boolean;
  transaction: ReturnType<typeof mapTransaction>;
  balances?: Array<ReturnType<typeof mapBalance>>;
};


function requestHash(
  type: "DEPOSIT" | "TRANSFER" | "EXCHANGE",
  payload: Record<string, string>
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        type,
        ...payload,
      })
    )
    .digest("hex");
}

function assertIdempotentRequest(
  transaction: TransactionRow,
  expectedType: TransactionRow["type"],
  expectedHash: string
): void {
  if (
    transaction.type !== expectedType ||
    transaction.request_hash !== expectedHash
  ) {
    throw new AppError(
      "La clave de idempotencia ya fue usada con otros datos",
      409
    );
  }
}

function mapBalance(balance: BalanceRow) {
  return {
    walletId: balance.wallet_id,
    currencyCode: balance.currency_code,
    amount: balance.amount,
    updatedAt: balance.updated_at,
  };
}

function mapTransaction(transaction: TransactionRow) {
  return {
    id: transaction.id,
    type: transaction.type,
    status: transaction.status,
    walletId: transaction.wallet_id,
    destinationWalletId:
      transaction.destination_wallet_id,
    destinationEmail:
      transaction.destination_email,
    fromCurrency: transaction.from_currency,
    toCurrency: transaction.to_currency,
    fromAmount: transaction.from_amount,
    toAmount: transaction.to_amount,
    exchangeRate: transaction.exchange_rate,
    idempotencyKey:
      transaction.idempotency_key,
    createdAt: transaction.created_at,
  };
}

async function beginOperation(
  client: PoolClient,
  userId: string,
  idempotencyKey: string
) {
  const wallet = await findWalletByUserId(
    client,
    userId
  );

  if (!wallet) {
    throw new AppError("Wallet no encontrada", 404);
  }

  await acquireIdempotencyLock(
    client,
    wallet.id,
    idempotencyKey
  );

  const existingTransaction =
    await findTransactionByIdempotencyKey(
      client,
      wallet.id,
      idempotencyKey
    );

  return {
    wallet,
    existingTransaction,
  };
}

function assertBalancesFound(
  balances: BalanceRow[],
  expectedCount: number
): void {
  if (balances.length !== expectedCount) {
    throw new AppError(
      "No se encontraron todos los balances necesarios",
      409
    );
  }
}

async function runInTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await operation(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function depositFunds(
  userId: string,
  input: DepositInput
): Promise<OperationResult> {
  const operationHash = requestHash(
    "DEPOSIT",
    {
      currencyCode: input.currencyCode,
      amount: input.amount,
    }
  );

  return runInTransaction(async (client) => {
    const { wallet, existingTransaction } =
      await beginOperation(
        client,
        userId,
        input.idempotencyKey
      );

    if (existingTransaction) {
      assertIdempotentRequest(
        existingTransaction,
        "DEPOSIT",
        operationHash
      );

      return {
        idempotentReplay: true,
        transaction: mapTransaction(
          existingTransaction
        ),
      };
    }

    await lockWallets(client, [wallet.id]);

    const lockedBalances = await lockBalances(
      client,
      [
        {
          walletId: wallet.id,
          currencyCode: input.currencyCode,
        },
      ]
    );

    assertBalancesFound(lockedBalances, 1);

    const creditedBalance = await creditBalance(
      client,
      wallet.id,
      input.currencyCode,
      input.amount
    );

    if (!creditedBalance) {
      throw new AppError(
        "El depósito excede el límite máximo del saldo",
        409
      );
    }

    const transaction = await createTransaction(
      client,
      {
        walletId: wallet.id,
        destinationWalletId: null,
        type: "DEPOSIT",
        fromCurrency: input.currencyCode,
        toCurrency: input.currencyCode,
        fromAmount: input.amount,
        toAmount: input.amount,
        exchangeRate: "1",
        idempotencyKey: input.idempotencyKey,
        requestHash: operationHash,
      }
    );

    return {
      idempotentReplay: false,
      transaction: mapTransaction(transaction),
      balances: [mapBalance(creditedBalance)],
    };
  });
}

export async function transferFunds(
  userId: string,
  input: TransferInput
): Promise<OperationResult> {
  const operationHash = requestHash(
    "TRANSFER",
    {
      recipientEmail: input.recipientEmail,
      currencyCode: input.currencyCode,
      amount: input.amount,
    }
  );

  return runInTransaction(async (client) => {
    const { wallet, existingTransaction } =
      await beginOperation(
        client,
        userId,
        input.idempotencyKey
      );

    if (existingTransaction) {
      assertIdempotentRequest(
        existingTransaction,
        "TRANSFER",
        operationHash
      );

      return {
        idempotentReplay: true,
        transaction: mapTransaction(
          existingTransaction
        ),
      };
    }

    const recipient =
      await findRecipientWalletByEmail(
        client,
        input.recipientEmail
      );

    if (!recipient) {
      throw new AppError(
        "Destinatario no encontrado",
        404
      );
    }

    if (recipient.user_id === userId) {
      throw new AppError(
        "No podés transferirte fondos a tu propia cuenta",
        400
      );
    }

    await lockWallets(client, [
      wallet.id,
      recipient.wallet_id,
    ]);

    const lockedBalances = await lockBalances(
      client,
      [
        {
          walletId: wallet.id,
          currencyCode: input.currencyCode,
        },
        {
          walletId: recipient.wallet_id,
          currencyCode: input.currencyCode,
        },
      ]
    );

    assertBalancesFound(lockedBalances, 2);

    const debitedBalance = await debitBalance(
      client,
      wallet.id,
      input.currencyCode,
      input.amount
    );

    if (!debitedBalance) {
      throw new AppError(
        "Saldo insuficiente",
        409
      );
    }

    const creditedBalance = await creditBalance(
      client,
      recipient.wallet_id,
      input.currencyCode,
      input.amount
    );

    if (!creditedBalance) {
      throw new AppError(
        "La transferencia excede el límite máximo del saldo del destinatario",
        409
      );
    }

    const transaction = await createTransaction(
      client,
      {
        walletId: wallet.id,
        destinationWalletId:
          recipient.wallet_id,
        type: "TRANSFER",
        fromCurrency: input.currencyCode,
        toCurrency: input.currencyCode,
        fromAmount: input.amount,
        toAmount: input.amount,
        exchangeRate: "1",
        idempotencyKey: input.idempotencyKey,
        requestHash: operationHash,
      }
    );

    return {
      idempotentReplay: false,
      transaction: mapTransaction(transaction),
      balances: [mapBalance(debitedBalance)],
    };
  });
}

export async function exchangeFunds(
  userId: string,
  input: ExchangeInput
): Promise<OperationResult> {
  const operationHash = requestHash(
    "EXCHANGE",
    {
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      amount: input.amount,
    }
  );

  const rateResult = await getRatePair(
    input.fromCurrency,
    input.toCurrency
  );

  return runInTransaction(async (client) => {
    const { wallet, existingTransaction } =
      await beginOperation(
        client,
        userId,
        input.idempotencyKey
      );

    if (existingTransaction) {
      assertIdempotentRequest(
        existingTransaction,
        "EXCHANGE",
        operationHash
      );

      return {
        idempotentReplay: true,
        transaction: mapTransaction(
          existingTransaction
        ),
      };
    }

    await lockWallets(client, [wallet.id]);

    const lockedBalances = await lockBalances(
      client,
      [
        {
          walletId: wallet.id,
          currencyCode: input.fromCurrency,
        },
        {
          walletId: wallet.id,
          currencyCode: input.toCurrency,
        },
      ]
    );

    assertBalancesFound(lockedBalances, 2);

    const calculated =
      await calculateExchangeAmounts(
        client,
        input.amount,
        String(rateResult.rate)
      );

    const calculatedAmount = Number(
      calculated.to_amount
    );

    if (
      !Number.isFinite(calculatedAmount) ||
      calculatedAmount <= 0
    ) {
      throw new AppError(
        "El monto resultante es demasiado pequeño",
        400
      );
    }

    if (calculatedAmount >= 1000000000000) {
      throw new AppError(
        "El monto resultante excede el límite permitido",
        400
      );
    }

    const debitedBalance = await debitBalance(
      client,
      wallet.id,
      input.fromCurrency,
      input.amount
    );

    if (!debitedBalance) {
      throw new AppError(
        "Saldo insuficiente",
        409
      );
    }

    const creditedBalance = await creditBalance(
      client,
      wallet.id,
      input.toCurrency,
      calculated.to_amount
    );

    if (!creditedBalance) {
      throw new AppError(
        "El intercambio excede el límite máximo del saldo destino",
        409
      );
    }

    const transaction = await createTransaction(
      client,
      {
        walletId: wallet.id,
        destinationWalletId: null,
        type: "EXCHANGE",
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        fromAmount: input.amount,
        toAmount: calculated.to_amount,
        exchangeRate:
          calculated.exchange_rate,
        idempotencyKey: input.idempotencyKey,
        requestHash: operationHash,
      }
    );

    return {
      idempotentReplay: false,
      transaction: mapTransaction(transaction),
      balances: [
        mapBalance(debitedBalance),
        mapBalance(creditedBalance),
      ],
    };
  });
}
