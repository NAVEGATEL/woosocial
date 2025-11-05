import { db } from '../database/connection';
import { SocialMediaCredential, UpsertSocialCredentialRequest, SocialPlatformId } from '../models/SocialMedia';

export class SocialMediaService {
  static async listConnectionsByUser(id_usuario: number): Promise<SocialMediaCredential[]> {
    const sql = `
      SELECT *
      FROM social_media_credentials
      WHERE id_usuario = ?
    `;

    const [rows] = await db.execute(sql, [id_usuario]) as any[];
    return rows as unknown as SocialMediaCredential[];
  }

  static async getByUserAndPlatform(id_usuario: number, plataforma: SocialPlatformId): Promise<SocialMediaCredential | null> {
    const sql = `
      SELECT *
      FROM social_media_credentials
      WHERE id_usuario = ? AND plataforma = ?
      LIMIT 1
    `;

    const [rows] = await db.execute(sql, [id_usuario, plataforma]) as any[];
    if (!rows || (rows as any).length === 0) return null;
    return (rows as any)[0] as SocialMediaCredential;
  }

  static async upsertCredential(id_usuario: number, data: UpsertSocialCredentialRequest): Promise<SocialMediaCredential> {
    const existing = await this.getByUserAndPlatform(id_usuario, data.plataforma);

    if (existing) {
      const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active ? 1 : 0;
      
      const sql = `
        UPDATE social_media_credentials
        SET access_token = ?,
            refresh_token = ?,
            token_expires_at = ?,
            app_id = ?,
            app_secret = ?,
            username = ?,
            account_id = ?,
            is_active = ?,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_usuario = ? AND plataforma = ?
      `;

      await db.execute(sql, [
        data.access_token ?? existing.access_token,
        data.refresh_token ?? existing.refresh_token,
        data.token_expires_at ?? existing.token_expires_at,
        data.app_id ?? existing.app_id,
        data.app_secret ?? existing.app_secret,
        data.username ?? existing.username,
        data.account_id ?? existing.account_id,
        isActive,
        id_usuario,
        data.plataforma
      ]);

      const updated = await this.getByUserAndPlatform(id_usuario, data.plataforma);
      if (!updated) throw new Error('No se pudieron actualizar las credenciales');
      return updated;
    }

    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;
    
    const insertSql = `
      INSERT INTO social_media_credentials (
        id_usuario, plataforma, access_token, refresh_token, token_expires_at, app_id, app_secret, username, account_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(insertSql, [
      id_usuario,
      data.plataforma,
      data.access_token ?? null,
      data.refresh_token ?? null,
      data.token_expires_at ?? null,
      data.app_id ?? null,
      data.app_secret ?? null,
      data.username ?? null,
      data.account_id ?? null,
      isActive,
    ]) as any;

    const created = await this.getByUserAndPlatform(id_usuario, data.plataforma);
    if (!created) {
      throw new Error('No se pudieron crear las credenciales');
    }
    return created;
  }

  static async deactivateCredential(id_usuario: number, plataforma: SocialPlatformId): Promise<void> {
    const sql = `
      UPDATE social_media_credentials
      SET is_active = 0,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_usuario = ? AND plataforma = ?
    `;
    await db.execute(sql, [id_usuario, plataforma]);
  }

  static async deleteCredential(id_usuario: number, plataforma: SocialPlatformId): Promise<void> {
    const sql = `
      DELETE FROM social_media_credentials
      WHERE id_usuario = ? AND plataforma = ?
    `;
    await db.execute(sql, [id_usuario, plataforma]);
  }
}


