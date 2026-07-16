CREATE TABLE IF NOT EXISTS activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  category VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  title VARCHAR(160) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  request_id VARCHAR(100),
  deduplication_key VARCHAR(220),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_history_category_valid CHECK (
    category IN ('AUTH', 'PROFILE', 'WALLET', 'EMAIL', 'SECURITY', 'SYSTEM')
  ),
  CONSTRAINT activity_history_status_valid CHECK (
    status IN ('SUCCESS', 'FAILED', 'PENDING', 'INFO')
  ),
  CONSTRAINT activity_history_metadata_object CHECK (
    jsonb_typeof(metadata) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS idx_activity_history_user_created
ON activity_history(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_activity_history_user_category
ON activity_history(user_id, category, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_activity_history_user_event_type
ON activity_history(user_id, event_type, created_at DESC, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_history_user_deduplication
ON activity_history(user_id, deduplication_key)
WHERE deduplication_key IS NOT NULL;

CREATE OR REPLACE FUNCTION travelgo_mask_email(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  local_part TEXT;
  domain_part TEXT;
BEGIN
  IF value IS NULL OR POSITION('@' IN value) = 0 THEN
    RETURN NULL;
  END IF;

  local_part := SPLIT_PART(LOWER(BTRIM(value)), '@', 1);
  domain_part := SPLIT_PART(LOWER(BTRIM(value)), '@', 2);

  RETURN LEFT(local_part, LEAST(3, LENGTH(local_part))) || '***@' || domain_part;
END;
$$;

CREATE OR REPLACE FUNCTION travelgo_history_users_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO activity_history (
    user_id, event_type, category, status, title, description,
    entity_type, entity_id, deduplication_key, metadata, created_at
  ) VALUES (
    NEW.id,
    'auth.user_registered',
    'AUTH',
    'SUCCESS',
    'Cuenta creada',
    'La cuenta de TravelGo fue creada correctamente.',
    'user',
    NEW.id,
    'auth:user-registered:' || NEW.id::text,
    jsonb_build_object(
      'provider', CASE WHEN NEW.google_id IS NOT NULL THEN 'google' ELSE 'password' END,
      'emailMasked', travelgo_mask_email(NEW.email)
    ),
    NEW.created_at
  ) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_users_insert ON users;
CREATE TRIGGER trg_activity_history_users_insert
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION travelgo_history_users_insert();

CREATE OR REPLACE FUNCTION travelgo_history_users_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  changed_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF OLD.last_login_at IS DISTINCT FROM NEW.last_login_at
     AND NEW.last_login_at IS NOT NULL THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, deduplication_key, metadata, created_at
    ) VALUES (
      NEW.id,
      'auth.login_success',
      'AUTH',
      'SUCCESS',
      'Inicio de sesión',
      'Se inició sesión correctamente en TravelGo.',
      'user',
      NEW.id,
      'auth:login:' || NEW.id::text || ':' || NEW.last_login_at::text,
      jsonb_build_object(
        'provider', CASE
          WHEN NEW.google_id IS NOT NULL AND NEW.password_hash IS NULL THEN 'google'
          ELSE 'account'
        END
      ),
      NEW.last_login_at
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF OLD.google_id IS DISTINCT FROM NEW.google_id
     AND OLD.google_id IS NULL
     AND NEW.google_id IS NOT NULL THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, deduplication_key, metadata
    ) VALUES (
      NEW.id,
      'auth.google_account_linked',
      'AUTH',
      'SUCCESS',
      'Cuenta de Google vinculada',
      'La cuenta de Google fue vinculada correctamente.',
      'user',
      NEW.id,
      'auth:google-linked:' || NEW.id::text,
      '{}'::jsonb
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash
     AND NEW.password_hash IS NOT NULL THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, metadata
    ) VALUES (
      NEW.id,
      CASE WHEN OLD.password_hash IS NULL
        THEN 'auth.password_configured'
        ELSE 'auth.password_updated'
      END,
      'SECURITY',
      'SUCCESS',
      CASE WHEN OLD.password_hash IS NULL
        THEN 'Contraseña configurada'
        ELSE 'Contraseña actualizada'
      END,
      'La contraseña de acceso fue modificada correctamente.',
      'user',
      NEW.id,
      '{}'::jsonb
    );
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, metadata
    ) VALUES (
      NEW.id,
      'profile.email_changed',
      'PROFILE',
      'SUCCESS',
      'Email actualizado',
      'El email principal de la cuenta fue confirmado y actualizado.',
      'user',
      NEW.id,
      jsonb_build_object(
        'previousEmailMasked', travelgo_mask_email(OLD.email),
        'newEmailMasked', travelgo_mask_email(NEW.email)
      )
    );
  END IF;

  IF OLD.name IS DISTINCT FROM NEW.name THEN
    changed_fields := ARRAY_APPEND(changed_fields, 'name');
  END IF;
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    changed_fields := ARRAY_APPEND(changed_fields, 'phone');
  END IF;
  IF OLD.birth_date IS DISTINCT FROM NEW.birth_date THEN
    changed_fields := ARRAY_APPEND(changed_fields, 'birthDate');
  END IF;
  IF OLD.preferred_currency IS DISTINCT FROM NEW.preferred_currency THEN
    changed_fields := ARRAY_APPEND(changed_fields, 'preferredCurrency');
  END IF;
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    changed_fields := ARRAY_APPEND(changed_fields, 'avatar');
  END IF;

  IF CARDINALITY(changed_fields) > 0 THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, metadata
    ) VALUES (
      NEW.id,
      'profile.updated',
      'PROFILE',
      'SUCCESS',
      'Perfil actualizado',
      'Se actualizaron datos del perfil.',
      'user',
      NEW.id,
      jsonb_build_object('changedFields', TO_JSONB(changed_fields))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_users_update ON users;
CREATE TRIGGER trg_activity_history_users_update
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION travelgo_history_users_update();

CREATE OR REPLACE FUNCTION travelgo_history_wallets_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.travelgo_alias IS DISTINCT FROM NEW.travelgo_alias THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, metadata
    ) VALUES (
      NEW.user_id,
      'profile.alias_changed',
      'PROFILE',
      'SUCCESS',
      'Alias actualizado',
      'El alias de TravelGo fue actualizado.',
      'wallet',
      NEW.id,
      jsonb_build_object(
        'previousAlias', OLD.travelgo_alias,
        'newAlias', NEW.travelgo_alias
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_wallets_update ON wallets;
CREATE TRIGGER trg_activity_history_wallets_update
AFTER UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION travelgo_history_wallets_update();

CREATE OR REPLACE FUNCTION travelgo_history_email_change_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO activity_history (
    user_id, event_type, category, status, title, description,
    entity_type, entity_id, deduplication_key, metadata, created_at
  ) VALUES (
    NEW.user_id,
    'profile.email_change_requested',
    'PROFILE',
    'PENDING',
    'Cambio de email solicitado',
    'Se solicitó verificar una nueva dirección de email.',
    'email_change_token',
    NEW.id,
    'profile:email-change-request:' || NEW.id::text,
    jsonb_build_object(
      'newEmailMasked', travelgo_mask_email(NEW.new_email),
      'expiresAt', NEW.expires_at
    ),
    NEW.created_at
  ) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_email_change_insert ON email_change_tokens;
CREATE TRIGGER trg_activity_history_email_change_insert
AFTER INSERT ON email_change_tokens
FOR EACH ROW
EXECUTE FUNCTION travelgo_history_email_change_insert();

CREATE OR REPLACE FUNCTION travelgo_history_password_reset_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO activity_history (
    user_id, event_type, category, status, title, description,
    entity_type, entity_id, deduplication_key, metadata, created_at
  ) VALUES (
    NEW.user_id,
    'auth.password_reset_requested',
    'SECURITY',
    'PENDING',
    'Recuperación de contraseña solicitada',
    'Se generó una solicitud para restablecer la contraseña.',
    'password_reset_token',
    NEW.id,
    'auth:password-reset-request:' || NEW.id::text,
    jsonb_build_object('expiresAt', NEW.expires_at),
    NEW.created_at
  ) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_password_reset_insert ON password_reset_tokens;
CREATE TRIGGER trg_activity_history_password_reset_insert
AFTER INSERT ON password_reset_tokens
FOR EACH ROW
EXECUTE FUNCTION travelgo_history_password_reset_insert();

CREATE OR REPLACE FUNCTION travelgo_history_email_preferences_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(
    OLD.notify_deposits,
    OLD.notify_transfers_sent,
    OLD.notify_transfers_received,
    OLD.notify_exchanges,
    OLD.notify_login_dashboard_reminder
  ) IS DISTINCT FROM ROW(
    NEW.notify_deposits,
    NEW.notify_transfers_sent,
    NEW.notify_transfers_received,
    NEW.notify_exchanges,
    NEW.notify_login_dashboard_reminder
  ) THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, metadata
    ) VALUES (
      NEW.user_id,
      'profile.notification_preferences_updated',
      'PROFILE',
      'SUCCESS',
      'Preferencias de notificación actualizadas',
      'Se modificaron las preferencias de correo.',
      'user_email_preferences',
      NEW.user_id,
      jsonb_build_object(
        'notifyDeposits', NEW.notify_deposits,
        'notifyTransfersSent', NEW.notify_transfers_sent,
        'notifyTransfersReceived', NEW.notify_transfers_received,
        'notifyExchanges', NEW.notify_exchanges,
        'notifyLoginDashboardReminder', NEW.notify_login_dashboard_reminder
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_email_preferences_update ON user_email_preferences;
CREATE TRIGGER trg_activity_history_email_preferences_update
AFTER UPDATE ON user_email_preferences
FOR EACH ROW
EXECUTE FUNCTION travelgo_history_email_preferences_update();

CREATE OR REPLACE FUNCTION travelgo_history_email_outbox_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO activity_history (
    user_id, event_type, category, status, title, description,
    entity_type, entity_id, deduplication_key, metadata, created_at
  ) VALUES (
    NEW.user_id,
    'email.queued',
    'EMAIL',
    'PENDING',
    'Email programado',
    'Se agregó un correo a la cola de envíos.',
    'email_outbox',
    NEW.id,
    'email:queued:' || NEW.id::text,
    jsonb_build_object(
      'emailEventType', NEW.event_type,
      'recipientMasked', travelgo_mask_email(NEW.recipient_email)
    ),
    NEW.created_at
  ) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_email_outbox_insert ON email_outbox;
CREATE TRIGGER trg_activity_history_email_outbox_insert
AFTER INSERT ON email_outbox
FOR EACH ROW
EXECUTE FUNCTION travelgo_history_email_outbox_insert();

CREATE OR REPLACE FUNCTION travelgo_history_email_outbox_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'sent' THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, deduplication_key, metadata, created_at
    ) VALUES (
      NEW.user_id,
      'email.sent',
      'EMAIL',
      'SUCCESS',
      'Email enviado',
      'El correo fue enviado correctamente.',
      'email_outbox',
      NEW.id,
      'email:sent:' || NEW.id::text,
      jsonb_build_object(
        'emailEventType', NEW.event_type,
        'attemptCount', NEW.attempt_count
      ),
      COALESCE(NEW.sent_at, NOW())
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'failed'
     AND NEW.attempt_count >= NEW.max_attempts THEN
    INSERT INTO activity_history (
      user_id, event_type, category, status, title, description,
      entity_type, entity_id, deduplication_key, metadata
    ) VALUES (
      NEW.user_id,
      'email.failed_final',
      'EMAIL',
      'FAILED',
      'No se pudo enviar un email',
      'El proveedor agotó los intentos de entrega.',
      'email_outbox',
      NEW.id,
      'email:failed-final:' || NEW.id::text,
      jsonb_build_object(
        'emailEventType', NEW.event_type,
        'attemptCount', NEW.attempt_count,
        'reason', CASE
          WHEN COALESCE(NEW.last_error, '') ILIKE '%not verified%'
            THEN 'recipient_not_verified'
          ELSE 'delivery_failed'
        END
      )
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_email_outbox_update ON email_outbox;
CREATE TRIGGER trg_activity_history_email_outbox_update
AFTER UPDATE ON email_outbox
FOR EACH ROW
EXECUTE FUNCTION travelgo_history_email_outbox_update();

INSERT INTO activity_history (
  user_id, event_type, category, status, title, description,
  entity_type, entity_id, deduplication_key, metadata, created_at
)
SELECT
  u.id,
  'auth.user_registered',
  'AUTH',
  'SUCCESS',
  'Cuenta creada',
  'La cuenta de TravelGo fue creada correctamente.',
  'user',
  u.id,
  'auth:user-registered:' || u.id::text,
  jsonb_build_object(
    'provider', CASE WHEN u.google_id IS NOT NULL THEN 'google' ELSE 'password' END,
    'emailMasked', travelgo_mask_email(u.email),
    'backfilled', TRUE
  ),
  u.created_at
FROM users u
ON CONFLICT DO NOTHING;
