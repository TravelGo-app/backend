export async function createWallet(client, userId) {
    const result = await client.query(`
    INSERT INTO wallets (user_id)
    VALUES ($1)
    RETURNING id, user_id, created_at, updated_at
    `, [userId]);
    return result.rows[0];
}
export async function findWalletByUserId(client, userId) {
    const result = await client.query(`
    SELECT id, user_id, created_at, updated_at
    FROM wallets
    WHERE user_id = $1
    `, [userId]);
    return result.rows[0] ?? null;
}
