export async function createInitialBalances(client, walletId, balances) {
    const entries = Object.entries(balances);
    const createdBalances = [];
    for (const [currencyCode, amount] of entries) {
        const result = await client.query(`
      INSERT INTO balances (wallet_id, currency_code, amount)
      VALUES ($1, $2, $3)
      RETURNING id, wallet_id, currency_code, amount, created_at, updated_at
      `, [walletId, currencyCode, amount]);
        createdBalances.push(result.rows[0]);
    }
    return createdBalances;
}
