export async function createInitialBalances(client, walletId, balances) {
    const entries = Object.entries(balances);
    const createdBalances = [];
    for (const [currencyCode, amount] of entries) {
        const result = await client.query(`
      INSERT INTO balances (wallet_id, currency_code, amount)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        wallet_id,
        currency_code,
        amount,
        created_at,
        updated_at
      `, [walletId, currencyCode, amount]);
        createdBalances.push(result.rows[0]);
    }
    return createdBalances;
}
export async function findBalancesByWalletId(client, walletId) {
    const result = await client.query(`
    SELECT
      id,
      wallet_id,
      currency_code,
      amount,
      created_at,
      updated_at
    FROM balances
    WHERE wallet_id = $1
    ORDER BY CASE currency_code
      WHEN 'ARS' THEN 1
      WHEN 'USD' THEN 2
      WHEN 'EUR' THEN 3
      WHEN 'BRL' THEN 4
      WHEN 'CLP' THEN 5
      ELSE 6
    END
    `, [walletId]);
    return result.rows;
}
