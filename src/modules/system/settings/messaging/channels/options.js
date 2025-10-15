// Channel provider options catalog and validation helpers

export const CHANNEL_OPTIONS = Object.freeze({
  IN_APP: {
    builtIn: true,
    types: [],
    description: "Built-in in-app messaging; no external provider configuration required.",
  },
  EMAIL: {
    builtIn: false,
    types: [
      {
        code: "SMTP",
        name: "SMTP Server",
        required: ["host", "port"],
        schema: {
          host: { type: "string" },
          port: { type: "number", min: 1 },
          secure: { type: "boolean", default: false },
          user: { type: "string", optional: true },
          pass: { type: "string", optional: true },
          from: { type: "string", optional: true },
          reply_to: { type: "string", optional: true }
        }
      }
    ]
  },
  SMS: {
    builtIn: false,
    types: [
      {
        code: "TWILIO",
        name: "Twilio",
        required: ["account_sid", "auth_token", "from"],
        schema: {
          account_sid: { type: "string" },
          auth_token: { type: "string" },
          from: { type: "string" }
        }
      },
      {
        code: "SMPP",
        name: "SMPP Gateway",
        required: ["host", "port", "system_id", "password"],
        schema: {
          host: { type: "string" },
          port: { type: "number", min: 1 },
          system_id: { type: "string" },
          password: { type: "string" },
          system_type: { type: "string", optional: true },
          from: { type: "string", optional: true },
          tls: { type: "boolean", optional: true },
          bind: { type: "string", optional: true, enum: ["transceiver", "transmitter"] }
        }
      },
      {
        code: "HTTP_API",
        name: "Generic HTTP API",
        required: ["url"],
        schema: {
          url: { type: "string" },
          method: { type: "string", optional: true, enum: ["GET", "POST"] },
          api_key: { type: "string", optional: true },
          from: { type: "string", optional: true },
          headers: { type: "object", optional: true },
          params: { type: "object", optional: true }
        }
      }
    ]
  },
  WHATSAPP: {
    builtIn: false,
    types: [
      {
        code: "META",
        name: "Meta Cloud API",
        required: ["token", "phone_number_id"],
        schema: {
          token: { type: "string" },
          phone_number_id: { type: "string" },
          waba_id: { type: "string", optional: true },
          from: { type: "string", optional: true }
        }
      },
      {
        code: "HTTP_API",
        name: "Generic HTTP API",
        required: ["base_url", "token"],
        schema: {
          base_url: { type: "string" },
          token: { type: "string" },
          from: { type: "string", optional: true }
        }
      }
    ]
  },
  TELEGRAM: {
    builtIn: false,
    types: [
      {
        code: "BOT_API",
        name: "Telegram Bot API",
        required: ["bot_token"],
        schema: {
          bot_token: { type: "string" },
          default_chat_id: { type: "string", optional: true }
        }
      }
    ]
  }
});

export function getChannelOptions(channel) {
  const ch = String(channel || "").toUpperCase();
  return CHANNEL_OPTIONS[ch] || { builtIn: false, types: [] };
}

export function isValidProviderType(channel, type) {
  const opts = getChannelOptions(channel);
  if (!type) return false;
  const code = String(type).toUpperCase();
  return Array.isArray(opts.types) && opts.types.some((t) => t.code === code);
}

export function validateConfigForType(channel, type, cfg) {
  const opts = getChannelOptions(channel);
  const code = String(type || "").toUpperCase();
  const def = (opts.types || []).find((t) => t.code === code);
  if (!def) return `Unknown provider_type '${type}' for channel ${channel}`;
  const schema = def.schema || {};
  const required = def.required || [];
  // Required fields
  for (const k of required) {
    if (!(k in cfg) || cfg[k] === undefined || cfg[k] === null || String(cfg[k]).length === 0) {
      return `Missing required config field '${k}'`;
    }
  }
  // Type checks (basic)
  for (const [k, s] of Object.entries(schema)) {
    if (!(k in cfg)) continue;
    const v = cfg[k];
    if (s.type === "number" && typeof v !== "number") return `Field '${k}' must be a number`;
    if (s.type === "string" && typeof v !== "string") return `Field '${k}' must be a string`;
    if (s.type === "boolean" && typeof v !== "boolean") return `Field '${k}' must be a boolean`;
    if (s.type === "object" && (typeof v !== "object" || Array.isArray(v) || v === null)) return `Field '${k}' must be an object`;
    if (s.enum && !s.enum.includes(v)) return `Field '${k}' must be one of ${s.enum.join(", ")}`;
    if (typeof s.min === "number" && typeof v === "number" && v < s.min) return `Field '${k}' must be >= ${s.min}`;
  }
  return null; // no error
}

