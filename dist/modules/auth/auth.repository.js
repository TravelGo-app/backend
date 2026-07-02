export async function findUserByEmail(client, email) {
    const result = await client.query(`
    SELECT id, name, email, password_hash, created_at, updated_at
    FROM users
    WHERE email = $1
    `, [email]);
    return result.rows[0] ?? null;
}
export async function findUserById(client, userId) {
    const result = await client.query(`
    SELECT id, name, email, password_hash, created_at, updated_at
    FROM users
    WHERE id = $1
    `, [userId]);
    return result.rows[0] ?? null;
}
export async function createUser(client, data) {
    const result = await client.query(`
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, password_hash, created_at, updated_at
    `, [data.name, data.email, data.passwordHash]);
    return result.rows[0];
}
