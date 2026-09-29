const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  AttachmentBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  OverwriteType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// --- API KEY DIREKT KOD ICINDE (ENV YOKSA) ---
if (!process.env.AI_API_KEY) {
  process.env.AI_API_KEY = "AQ.Ab8RN6L6oJ5lIwbH8Yt9XwESLwMJA2UOOJ-GwXVxMkstIhQN5g";
}


// ======================================================
// CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    // Presence (online sayacı) privileged intent ister: sadece ENABLE_PRESENCE=true ise açılır
    ...(process.env.ENABLE_PRESENCE === "true" ? [GatewayIntentBits.GuildPresences] : [])
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember
  ]
});

// ======================================================
// DATA
// ======================================================

const dataFolder = path.join(__dirname, "..", "data");
const dataFile = path.join(dataFolder, "servers.json");

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, "{}");
}

const CONFIG_VERSION = 10;
let db = null;
let saveTimer = null;

function loadData() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    if (!db || typeof db !== "object" || Array.isArray(db)) throw new Error("geçersiz format");
  } catch (error) {
    console.error("❌ servers.json okunamadı:", error.message);
    try { fs.copyFileSync(dataFile, `${dataFile}.bozuk-${Date.now()}`); } catch {}
    db = {};
  }
  return db;
}
function flushData() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!db) return;
  try {
    const tmp = `${dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, dataFile);
  } catch (error) { console.error("❌ servers.json yazılamadı:", error.message); }
}
function saveData() { if (!saveTimer) saveTimer = setTimeout(flushData, 2000); }
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { flushData(); process.exit(0); });
process.on("exit", flushData);

function isPlain(v) { return v && typeof v === "object" && !Array.isArray(v); }
function applyDefaults(target, defaults) {
  for (const [key, value] of Object.entries(defaults)) {
    if (target[key] === undefined || target[key] === null) {
      target[key] = structuredClone(value);
    } else if (isPlain(value) && isPlain(target[key])) {
      applyDefaults(target[key], value);
    }
  }
  return target;
}

function defaultConfig() {
  return {
    configVersion: CONFIG_VERSION,
    setupCompleted: false, setupType: null, channelStyle: "emoji", categoryStyle: "emoji",
    selectedCategories: [], features: [], voiceCount: 4, setupDate: null,
    createdIds: { categories: [], channels: [], roles: [] },
    roles: { admin: null, staff: null, support: null, registration: null, streamer: null, member: null, unregistered: null, booster: null, bot: null, male: null, female: null, unspecified: null },
    channels: { log: null },
    welcome: { enabled: false, channelId: null, autoRoleId: null },
    ticket: { categoryId: null, staffRoleId: null, claimedBy: {}, records: {}, history: [], counter: 0 },
    registration: { unregisteredRoleId: null, registeredRoleId: null, staffRoleId: null, genderEnabled: true },
    rolePanel: { channelId: null, messageId: null, roles: [] },
    stats: { enabled: false, categoryId: null, channels: { members: null, bots: null, online: null, voice: null } },
    warnings: {}, tickets: {},
    levelSystem: { enabled: true, minXp: 15, maxXp: 25, cooldownSec: 60, announceChannelId: null, levelRoles: {}, users: {} },
    economy: { enabled: true, currency: "Endless Coin", dailyReward: 250, weeklyReward: 1500, workMin: 50, workMax: 150, slotsMinBet: 10, slotsMaxBet: 5000, users: {} },
    shop: { items: [], nextId: 1 },
    giveaways: { enabled: true, active: {} },
    ai: { enabled: false, channelId: null },
    antiRaid: { enabled: false, joinThreshold: 5, windowSec: 10, antiSpam: false, mentionSpam: false, channelDelete: false, roleDelete: false, webhook: false, punishment: "kick" },
    autoMod: { enabled: false, spam: false, flood: false, mentions: false, links: false, badWords: false, caps: false, punishment: "delete", timeoutMinutes: 10, maxMentions: 5, maxCapsPercent: 70, floodCount: 6, floodSec: 5, spamRepeat: 3, customWords: [] },
    toggles: { ticket: true, registration: true, streamer: true, rolePanel: true, tempVoice: true, fun: true },
    premium: { active: false, expiresAt: null },
    streamerPlus: { applications: { enabled: true, channelId: null, panelChannelId: null, reviewerRoleId: null, cooldownMin: 1440, counter: 0, records: {} }, adultRoleId: null, adultPanel: { channelId: null, messageId: null }, builds: {}, notifyRoleId: null, profiles: {}, announce: { channelId: null, cooldownMin: 30, last: {} } },
    tempVoice: { enabled: false, joinChannelId: null, categoryId: null, textChannelId: null, panelMessageId: null, rooms: {} }
  };
}

function getServerConfig(guildId) {
  const data = loadData();
  let config = data[guildId];
  if (!isPlain(config)) { config = data[guildId] = defaultConfig(); saveData(); return config; }
  if (config.configVersion !== CONFIG_VERSION) {
    applyDefaults(config, defaultConfig());
    config.configVersion = CONFIG_VERSION;
    saveData();
  }
  return config;
}
function saveServerConfig(guildId, config) { loadData()[guildId] = config; saveData(); }

// ======================================================
// SETUP SESSIONS
// ======================================================

const setupSessions = new Map();
const regSessions = new Map(); // staffId:targetId -> { gender, nick, ... }

function sessionKey(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function getSession(interaction) {
  return setupSessions.get(
    sessionKey(interaction)
  );
}

function setSession(interaction, data) {
  setupSessions.set(
    sessionKey(interaction),
    data
  );
}

function deleteSession(interaction) {
  setupSessions.delete(
    sessionKey(interaction)
  );
}

// ======================================================
// TEMPLATES
// ======================================================

const templates = {

  gaming: {
    name: "Gaming",
    emoji: "🎮",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          "kurallar",
          "duyurular",
          "bilgilendirme",
          "sunucu-istatistik"
        ]
      },
      {
        name: "KAYIT",
        emoji: "📝",
        channels: [
          "kayıt",
          "kayıt-bilgi",
          "kayıt-log",
          "rol-seçim"
        ]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: [
          "sohbet",
          "bot-komutları",
          "medya",
          "fotoğraf",
          "mizah",
          "öneriler",
          "anketler"
        ]
      },
      {
        name: "OYUN",
        emoji: "🎮",
        channels: [
          "oyun-sohbet",
          "oyuncu-arama",
          "etkinlikler",
          "turnuvalar",
          "çekilişler"
        ],
        voice: [
          "Genel",
          "Oyun 1",
          "Oyun 2"
        ]
      },
      {
        name: "DESTEK",
        emoji: "🆘",
        channels: [
          "ticket",
          "destek",
          "yardım",
          "sık-sorulanlar"
        ]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: [],
        voice: [
          "Genel",
          "Sohbet 1",
          "Sohbet 2",
          "Müzik",
          "AFK"
        ]
      },
      {
        name: "YÖNETİM",
        emoji: "🔒",
        channels: [
          "yetkili",
          "log",
          "ceza-log",
          "bot-log",
          "istatistik"
        ]
      }
    ],

    roles: [
      "👑 Yönetici",
      "🛡️ Yetkili",
      "🎫 Destek Ekibi",
      "📝 Kayıt Yetkilisi",
      "🏆 Şampiyon",
      "🎮 Oyuncu",
      "⭐ Booster",
      "👤 Üye",
      "🤖 Bot"
    ]
  },

  community: {
    name: "Community",
    emoji: "👥",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          "kurallar",
          "duyurular",
          "bilgilendirme",
          "hoşgeldin",
          "sunucu-istatistik"
        ]
      },
      {
        name: "KAYIT",
        emoji: "📝",
        channels: [
          "kayıt",
          "kayıt-bilgi",
          "kayıt-log",
          "rol-seçim"
        ]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: [
          "sohbet",
          "bot-komutları",
          "medya",
          "fotoğraf",
          "mizah",
          "öneriler",
          "anketler"
        ]
      },
      {
        name: "OYUN",
        emoji: "🎮",
        channels: [
          "oyun-sohbet",
          "oyuncu-arama",
          "etkinlikler",
          "çekilişler"
        ],
        voice: [
          "Genel",
          "Oyun 1",
          "Oyun 2"
        ]
      },
      {
        name: "DESTEK",
        emoji: "🆘",
        channels: [
          "ticket",
          "destek",
          "yardım",
          "sık-sorulanlar"
        ]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: [],
        voice: [
          "Genel",
          "Sohbet 1",
          "Sohbet 2",
          "Müzik",
          "AFK"
        ]
      },
      {
        name: "YÖNETİM",
        emoji: "🔒",
        channels: [
          "yetkili",
          "log",
          "ceza-log",
          "bot-log",
          "istatistik"
        ]
      }
    ],

    roles: [
      "👑 Yönetici",
      "🛡️ Yetkili",
      "🎫 Destek Ekibi",
      "📝 Kayıt Yetkilisi",
      "⭐ Booster",
      "👤 Üye",
      "🤖 Bot"
    ]
  },

  streamer: {
    name: "Streamer",
    emoji: "🎥",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          "kurallar",
          "duyurular",
          "bilgilendirme"
        ]
      },
      {
        name: "STREAMER",
        emoji: "🎥",
        channels: [
          "yayın-duyuruları",
          "yayıncı-sohbet",
          "streamer-başvuru",
          "içerik-paylaşım",
          "yayın-programı",
          "yayıncılar",
          "çekilişler"
        ]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: [
          "sohbet",
          "medya",
          "klipler",
          "bot-komutları",
          "öneriler"
        ]
      },
      {
        name: "DESTEK",
        emoji: "🆘",
        channels: [
          "ticket",
          "destek",
          "yardım"
        ]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: [],
        voice: [
          "Genel",
          "Yayın Odası",
          "Yayıncı Odası",
          "AFK"
        ]
      },
      {
        name: "YÖNETİM",
        emoji: "🔒",
        channels: [
          "yetkili",
          "log",
          "başvuru-log",
          "bot-log"
        ]
      }
    ],

    roles: [
      "👑 Yönetici",
      "🛡️ Yetkili",
      "🎫 Destek Ekibi",
      "🎥 Streamer",
      "⭐ İçerik Üreticisi",
      "⭐ Booster",
      "👤 Üye",
      "🤖 Bot"
    ]
  },

  public: {
    name: "Public",
    emoji: "🌐",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          "kurallar",
          "duyurular",
          "bilgilendirme",
          "hoşgeldin",
          "sunucu-istatistik"
        ]
      },
      {
        name: "KAYIT",
        emoji: "📝",
        channels: [
          "kayıt",
          "kayıt-bilgi",
          "kayıt-log",
          "rol-seçim"
        ]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: [
          "sohbet",
          "bot-komutları",
          "medya",
          "mizah",
          "fotoğraf",
          "öneriler"
        ]
      },
      {
        name: "OYUN",
        emoji: "🎮",
        channels: [
          "oyun-sohbet",
          "oyuncu-arama",
          "etkinlikler",
          "turnuvalar",
          "çekilişler"
        ],
        voice: [
          "Genel",
          "Oyun 1",
          "Oyun 2"
        ]
      },
      {
        name: "DESTEK",
        emoji: "🆘",
        channels: [
          "ticket",
          "destek",
          "yardım",
          "sık-sorulanlar"
        ]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: [],
        voice: [
          "Genel",
          "Sohbet 1",
          "Sohbet 2",
          "Oyun Odası",
          "AFK"
        ]
      },
      {
        name: "YÖNETİM",
        emoji: "🔒",
        channels: [
          "yetkili",
          "log",
          "ceza-log",
          "bot-log",
          "istatistik"
        ]
      }
    ],

    roles: [
      "👑 Yönetici",
      "🛡️ Yetkili",
      "🎫 Destek Ekibi",
      "📝 Kayıt Yetkilisi",
      "⭐ Booster",
      "👤 Üye",
      "🤖 Bot"
    ]
  },

  shop: {
    name: "Shop",
    emoji: "🛒",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          "kurallar",
          "duyurular",
          "bilgilendirme"
        ]
      },
      {
        name: "MAĞAZA",
        emoji: "🛒",
        channels: [
          "mağaza",
          "ürünler",
          "kampanyalar",
          "indirimler",
          "siparişler"
        ]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: [
          "sohbet",
          "medya",
          "öneriler"
        ]
      },
      {
        name: "DESTEK",
        emoji: "🆘",
        channels: [
          "ticket",
          "destek",
          "sipariş-destek",
          "yardım"
        ]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: [],
        voice: [
          "Genel",
          "Destek",
          "AFK"
        ]
      },
      {
        name: "YÖNETİM",
        emoji: "🔒",
        channels: [
          "yetkili",
          "log",
          "sipariş-log",
          "bot-log"
        ]
      }
    ],

    roles: [
      "👑 Yönetici",
      "🛡️ Yetkili",
      "🎫 Destek Ekibi",
      "💰 Satış Ekibi",
      "⭐ Booster",
      "👤 Müşteri",
      "🤖 Bot"
    ]
  },

  education: {
    name: "Education",
    emoji: "🎓",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          "kurallar",
          "duyurular",
          "bilgilendirme",
          "takvim"
        ]
      },
      {
        name: "DERSLER",
        emoji: "📚",
        channels: [
          "genel-ders",
          "matematik",
          "türkçe",
          "fen",
          "sosyal",
          "ödev-yardım"
        ]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: [
          "sohbet",
          "soru-cevap",
          "kaynaklar",
          "öneriler"
        ]
      },
      {
        name: "DESTEK",
        emoji: "🆘",
        channels: [
          "ticket",
          "yardım",
          "öğretmen-destek"
        ]
      },
      {
        name: "SES SINIFLARI",
        emoji: "🔊",
        channels: [],
        voice: [
          "Ders Odası 1",
          "Ders Odası 2",
          "Çalışma Odası",
          "AFK"
        ]
      },
      {
        name: "YÖNETİM",
        emoji: "🔒",
        channels: [
          "yetkili",
          "öğretmen",
          "log",
          "bot-log"
        ]
      }
    ],

    roles: [
      "👑 Yönetici",
      "🛡️ Yetkili",
      "👨‍🏫 Öğretmen",
      "📚 Öğrenci",
      "⭐ Booster",
      "👤 Üye",
      "🤖 Bot"
    ]
  },

  clan: {
    name: "Clan / Team",
    emoji: "🏆",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          "kurallar",
          "duyurular",
          "bilgilendirme"
        ]
      },
      {
        name: "TAKIM",
        emoji: "🏆",
        channels: [
          "takım-sohbet",
          "kadromuz",
          "antrenman",
          "maçlar",
          "turnuvalar",
          "sonuçlar"
        ]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: [
          "sohbet",
          "medya",
          "klipler",
          "öneriler"
        ]
      },
      {
        name: "BAŞVURU",
        emoji: "📝",
        channels: [
          "oyuncu-başvuru",
          "yetkili-başvuru",
          "başvuru-bilgi"
        ]
      },
      {
        name: "DESTEK",
        emoji: "🆘",
        channels: [
          "ticket",
          "destek",
          "yardım"
        ]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: [],
        voice: [
          "Genel",
          "Takım 1",
          "Takım 2",
          "Antrenman",
          "AFK"
        ]
      },
      {
        name: "YÖNETİM",
        emoji: "🔒",
        channels: [
          "yetkili",
          "log",
          "maç-log",
          "başvuru-log"
        ]
      }
    ],

    roles: [
      "👑 Yönetici",
      "🛡️ Yetkili",
      "🏆 Kaptan",
      "⭐ Takım Üyesi",
      "📝 Deneme Üyesi",
      "👤 Üye",
      "🤖 Bot"
    ]
  }
};

// ======================================================
// CHANNEL EMOJIS
// ======================================================

const channelEmojis = {
  "kurallar": "📜",
  "duyurular": "📢",
  "bilgilendirme": "📋",
  "hoşgeldin": "👋",
  "sunucu-istatistik": "📊",

  "kayıt": "📝",
  "kayıt-bilgi": "📋",
  "kayıt-log": "📑",
  "rol-seçim": "🎭",

  "sohbet": "💬",
  "bot-komutları": "🤖",
  "medya": "🎨",
  "fotoğraf": "📸",
  "mizah": "😂",
  "öneriler": "💡",
  "anketler": "📊",

  "oyun-sohbet": "🎮",
  "oyuncu-arama": "🔎",
  "etkinlikler": "🏆",
  "turnuvalar": "🏆",
  "çekilişler": "🎁",

  "ticket": "🎫",
  "destek": "📩",
  "yardım": "❓",
  "sık-sorulanlar": "📚",

  "yetkili": "🔒",
  "log": "📋",
  "ceza-log": "🚨",
  "bot-log": "🤖",
  "istatistik": "📊",

  "yayın-duyuruları": "📢",
  "yayıncı-sohbet": "🎥",
  "streamer-başvuru": "📺",
  "içerik-paylaşım": "🎬",
  "yayın-programı": "📅",
  "yayıncılar": "⭐",
  "klipler": "🎞️",

  "mağaza": "🛒",
  "ürünler": "📦",
  "kampanyalar": "📢",
  "indirimler": "🏷️",
  "siparişler": "🧾",
  "sipariş-destek": "📩",

  "takım-sohbet": "🏆",
  "kadromuz": "👥",
  "antrenman": "🏋️",
  "maçlar": "⚔️",
  "sonuçlar": "📊",

  "oyuncu-başvuru": "📝",
  "yetkili-başvuru": "📝",
  "başvuru-bilgi": "📋",

  "matematik": "➗",
  "türkçe": "📖",
  "fen": "🔬",
  "sosyal": "🌍",
  "ödev-yardım": "📝",
  "soru-cevap": "❓",
  "kaynaklar": "📚",
  "takvim": "📅",
  "genel-ders": "📚",
  "öğretmen-destek": "👨‍🏫"
};

// ======================================================
// FORMATTING
// ======================================================

function formatChannelName(
  name,
  style
) {
  if (style === "plain") {
    return name.toLowerCase();
  }

  const emoji =
    channelEmojis[name] || "📄";

  return `${emoji}・${name}`;
}

function formatCategoryName(
  category,
  style
) {
  if (style === "emoji") {
    return `${category.emoji} ${category.name}`;
  }

  if (style === "brackets") {
    return `「 ${category.name} 」`;
  }

  if (style === "lines") {
    return `━━ ${category.name} ━━`;
  }

  return category.name;
}

// ======================================================
// PERMISSIONS
// ======================================================

function isAdmin(interaction) {
  return (
    interaction.guild?.ownerId ===
      interaction.user.id ||
    interaction.memberPermissions?.has(
      PermissionsBitField.Flags.Administrator
    )
  );
}

function hasPermission(
  interaction,
  permission
) {
  return (
    isAdmin(interaction) ||
    interaction.memberPermissions?.has(
      permission
    )
  );
}

function hasRole(
  member,
  roleId
) {
  return Boolean(
    roleId &&
    member?.roles?.cache?.has(roleId)
  );
}

function canRegister(
  interaction,
  config
) {
  return (
    isAdmin(interaction) ||
    hasRole(
      interaction.member,
      config.registration
        ?.staffRoleId
    )
  );
}

// ======================================================
// LOG
// ======================================================

async function sendLog(
  guild,
  message
) {
  try {
    const config =
      getServerConfig(guild.id);

    if (!config.channels?.log) {
      return;
    }

    const channel =
      await guild.channels
        .fetch(config.channels.log)
        .catch(() => null);

    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setDescription(message)
          .setTimestamp()
      ]
    });
  } catch {}
}

// ======================================================
// SETUP MENUS
// ======================================================

function createSetupMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("setup_type")
        .setPlaceholder(
          "Sunucu türünü seç"
        )
        .addOptions(
          {
            label: "Gaming",
            description:
              "Oyun sunucusu",
            value: "gaming",
            emoji: "🎮"
          },
          {
            label: "Community",
            description:
              "Topluluk sunucusu",
            value: "community",
            emoji: "👥"
          },
          {
            label: "Streamer",
            description:
              "Yayıncı sunucusu",
            value: "streamer",
            emoji: "🎥"
          },
          {
            label: "Public",
            description:
              "Genel public sunucu",
            value: "public",
            emoji: "🌐"
          },
          {
            label: "Shop",
            description:
              "Mağaza sunucusu",
            value: "shop",
            emoji: "🛒"
          },
          {
            label: "Education",
            description:
              "Eğitim sunucusu",
            value: "education",
            emoji: "🎓"
          },
          {
            label: "Clan / Team",
            description:
              "Takım ve clan sunucusu",
            value: "clan",
            emoji: "🏆"
          }
        )
    );
}

function createChannelStyleMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "setup_channel_style"
        )
        .setPlaceholder(
          "Kanal stilini seç"
        )
        .addOptions(
          {
            label: "Emoji'li",
            description:
              "💬・sohbet",
            value: "emoji",
            emoji: "💬"
          },
          {
            label: "Emojisiz",
            description:
              "sohbet",
            value: "plain",
            emoji: "⚪"
          }
        )
    );
}

function createCategoryStyleMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "setup_category_style"
        )
        .setPlaceholder(
          "Kategori stilini seç"
        )
        .addOptions(
          {
            label:
              "Emoji + Büyük Harf",
            description:
              "📌 BİLGİ",
            value: "emoji",
            emoji: "📁"
          },
          {
            label: "Köşeli",
            description:
              "「 BİLGİ 」",
            value: "brackets",
            emoji: "🔲"
          },
          {
            label: "Çizgili",
            description:
              "━━ BİLGİ ━━",
            value: "lines",
            emoji: "📏"
          },
          {
            label: "Sade",
            description:
              "BİLGİ",
            value: "plain",
            emoji: "⚪"
          }
        )
    );
}

function createCategorySelectMenu(
  session
) {
  const template =
    templates[session.type];

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "setup_categories"
        )
        .setPlaceholder(
          "Oluşturulacak kategorileri seç"
        )
        .setMinValues(1)
        .setMaxValues(
          Math.min(
            template.categories.length,
            7
          )
        )
        .addOptions(
          template.categories.map(
            category => ({
              label:
                category.name,
              description:
                `${category.channels.length} yazı kanalı`,
              value:
                category.name,
              emoji:
                category.emoji
            })
          )
        )
    );
}

function createFeatureMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "setup_features"
        )
        .setPlaceholder(
          "Ek sistemleri seç"
        )
        .setMinValues(0)
        .setMaxValues(4)
        .addOptions(
          {
            label: "Ticket",
            description:
              "Gelişmiş ticket sistemi",
            value: "ticket",
            emoji: "🎫"
          },
          {
            label: "Kayıt",
            description:
              "Yetkili kayıt sistemi",
            value: "registration",
            emoji: "📝"
          },
          {
            label: "Hoş Geldin",
            description:
              "Hoş geldin sistemi",
            value: "welcome",
            emoji: "👋"
          },
          {
            label: "Roller",
            description:
              "Builder rollerini oluştur",
            value: "roles",
            emoji: "🎭"
          }
        )
    );
}

function createVoiceCountMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "setup_voice_count"
        )
        .setPlaceholder(
          "Ses kanalı sayısını seç"
        )
        .addOptions(
          {
            label: "2 Ses",
            value: "2",
            emoji: "🔊"
          },
          {
            label: "4 Ses",
            value: "4",
            emoji: "🔊"
          },
          {
            label: "6 Ses",
            value: "6",
            emoji: "🔊"
          },
          {
            label: "8 Ses",
            value: "8",
            emoji: "🔊"
          }
        )
    );
}

// ======================================================
// SUMMARY
// ======================================================

function createSetupSummary(
  session
) {
  const template =
    templates[session.type];

  let channels = 0;

  for (
    const category
    of template.categories
  ) {

    if (
      !session.selectedCategories.includes(
        category.name
      )
    ) {
      continue;
    }

    for (
      const channel
      of category.channels
    ) {

      if (
        channel === "ticket" &&
        !session.features.includes(
          "ticket"
        )
      ) {
        continue;
      }

      if (
        [
          "kayıt",
          "kayıt-bilgi",
          "kayıt-log",
          "rol-seçim"
        ].includes(channel) &&
        !session.features.includes(
          "registration"
        )
      ) {
        continue;
      }

      if (
        channel === "hoşgeldin" &&
        !session.features.includes(
          "welcome"
        )
      ) {
        continue;
      }

      channels++;
    }

    if (category.voice) {
      channels += Math.min(
        category.voice.length,
        session.voiceCount || 4
      );
    }
  }

  const roles =
    session.features.includes("roles")
      ? template.roles.length
      : 0;

  return [
    "## 🏗️ Endless Builder",
    "",
    `> **Sunucu türü:** ${template.emoji} ${template.name}`,
    `> **Kategori:** ${session.selectedCategories.length}`,
    `> **Kanal:** ${channels}`,
    `> **Rol:** ${roles}`,
    `> **Ticket:** ${
      session.features.includes("ticket")
        ? "Açık"
        : "Kapalı"
    }`,
    `> **Kayıt:** ${
      session.features.includes("registration")
        ? "Açık"
        : "Kapalı"
    }`,
    `> **Hoş Geldin:** ${
      session.features.includes("welcome")
        ? "Açık"
        : "Kapalı"
    }`,
    `> **Ses:** ${session.voiceCount || 4}`,
    `> **Kanal stili:** ${session.channelStyle}`,
    `> **Kategori stili:** ${session.categoryStyle}`,
    "",
    "Ayarlar doğruysa **Oluştur** butonuna bas."
  ].join("\n");
}

// ======================================================
// SETUP BUTTONS
// ======================================================

function createSetupButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          "setup_create"
        )
        .setLabel("Oluştur")
        .setStyle(
          ButtonStyle.Success
        )
        .setEmoji("🚀"),

      new ButtonBuilder()
        .setCustomId(
          "setup_cancel"
        )
        .setLabel("İptal")
        .setStyle(
          ButtonStyle.Danger
        )
        .setEmoji("❌")
    );
}

// ======================================================
// BUILDER CLEANUP
// ======================================================

async function removeBuilderStructure(
  guild
) {
  const config =
    getServerConfig(guild.id);

  const ids =
    config.createdIds || {
      categories: [],
      channels: [],
      roles: []
    };

  let deleted = 0;

  for (
    const channelId of [
      ...(ids.channels || []),
      ...(ids.categories || [])
    ]
  ) {

    const channel =
      await guild.channels
        .fetch(channelId)
        .catch(() => null);

    if (!channel) continue;

    await channel
      .delete(
        "Endless Builder setup değiştirildi"
      )
      .then(() => {
        deleted++;
      })
      .catch(() => {});
  }

  for (
    const roleId
    of ids.roles || []
  ) {

    const role =
      await guild.roles
        .fetch(roleId)
        .catch(() => null);

    if (!role || role.managed) {
      continue;
    }

    await role
      .delete(
        "Endless Builder setup değiştirildi"
      )
      .then(() => {
        deleted++;
      })
      .catch(() => {});
  }

  return deleted;
}

// ======================================================
// BUILD SERVER
// ======================================================

async function buildServer(
  guild,
  type,
  settings
) {
  const template =
    templates[type];

  if (!template) {
    throw new Error(
      "Geçersiz sunucu türü."
    );
  }

  const config =
    getServerConfig(guild.id);

  config.createdIds = {
    categories: [],
    channels: [],
    roles: []
  };

  config.roles ??= {};

  let categoriesCreated = 0;
  let channelsCreated = 0;
  let rolesCreated = 0;

  // --------------------------------------------------
  // ROLES
  // --------------------------------------------------

  if (
    settings.features.includes("roles")
  ) {

    for (
      const roleName
      of template.roles
    ) {

      let permissions = [];

      if (
        roleName.includes(
          "Yönetici"
        )
      ) {
        permissions = [
          PermissionsBitField.Flags.ManageGuild,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ManageRoles,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.BanMembers,
          PermissionsBitField.Flags.ModerateMembers,
          PermissionsBitField.Flags.ViewAuditLog
        ];
      }

      if (
        roleName.includes(
          "Yetkili"
        )
      ) {
        permissions = [
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.ModerateMembers,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.ViewAuditLog
        ];
      }

      const existing =
        guild.roles.cache.find(
          role =>
            role.name === roleName
        );

      if (existing) {

        if (
          roleName.includes(
            "Yönetici"
          )
        ) {
          config.roles.admin =
            existing.id;
        }

        if (
          roleName.includes(
            "Yetkili"
          )
        ) {
          config.roles.staff =
            existing.id;
        }

        if (
          roleName.includes(
            "Destek"
          )
        ) {
          config.roles.support =
            existing.id;
        }

        if (
          roleName.includes(
            "Kayıt"
          )
        ) {
          config.roles.registration =
            existing.id;
        }

        if (
          roleName.includes(
            "Streamer"
          )
        ) {
          config.roles.streamer =
            existing.id;
        }

        if (
          roleName === "👤 Üye" ||
          roleName === "👤 Müşteri" ||
          roleName === "📚 Öğrenci"
        ) {
          config.roles.member =
            existing.id;
        }

        if (
          roleName === "🤖 Bot"
        ) {
          config.roles.bot =
            existing.id;
        }

        continue;
      }

      const role =
        await guild.roles.create({
          name: roleName,
          permissions
        });

      config.createdIds.roles.push(
        role.id
      );

      rolesCreated++;

      if (
        roleName.includes(
          "Yönetici"
        )
      ) {
        config.roles.admin =
          role.id;
      }

      if (
        roleName.includes(
          "Yetkili"
        )
      ) {
        config.roles.staff =
          role.id;
      }

      if (
        roleName.includes(
          "Destek"
        )
      ) {
        config.roles.support =
          role.id;
      }

      if (
        roleName.includes(
          "Kayıt"
        )
      ) {
        config.roles.registration =
          role.id;
      }

      if (
        roleName.includes(
          "Streamer"
        )
      ) {
        config.roles.streamer =
          role.id;
      }

      if (
        roleName === "👤 Üye" ||
        roleName === "👤 Müşteri" ||
        roleName === "📚 Öğrenci"
      ) {
        config.roles.member =
          role.id;
      }

      if (
        roleName === "🤖 Bot"
      ) {
        config.roles.bot =
          role.id;
      }
    }
  }

  // --------------------------------------------------
  // UNREGISTERED ROLE
  // --------------------------------------------------

  if (
    settings.features.includes(
      "registration"
    )
  ) {

    let unregistered =
      guild.roles.cache.find(
        role =>
          role.name ===
          "🔒 Kayıtsız"
      );

    if (!unregistered) {

      unregistered =
        await guild.roles.create({
          name: "🔒 Kayıtsız",
          permissions: []
        });

      config.createdIds.roles.push(
        unregistered.id
      );

      rolesCreated++;
    }

    config.roles.unregistered =
      unregistered.id;

    config.registration = {
      unregisteredRoleId:
        unregistered.id,

      registeredRoleId:
        config.roles.member,

      staffRoleId:
        config.roles.registration ||
        config.roles.staff
    };
  }

  // --------------------------------------------------
  // CATEGORIES + CHANNELS
  // --------------------------------------------------

  for (
    const category
    of template.categories
  ) {

    if (
      !settings.selectedCategories.includes(
        category.name
      )
    ) {
      continue;
    }

    const categoryName =
      formatCategoryName(
        category,
        settings.categoryStyle
      );

    const discordCategory =
      await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });

    config.createdIds.categories.push(
      discordCategory.id
    );

    categoriesCreated++;

    // TEXT CHANNELS

    for (
      const channelName
      of category.channels
    ) {

      if (
        channelName === "ticket" &&
        !settings.features.includes(
          "ticket"
        )
      ) {
        continue;
      }

      if (
        [
          "kayıt",
          "kayıt-bilgi",
          "kayıt-log",
          "rol-seçim"
        ].includes(channelName) &&
        !settings.features.includes(
          "registration"
        )
      ) {
        continue;
      }

      if (
        channelName === "hoşgeldin" &&
        !settings.features.includes(
          "welcome"
        )
      ) {
        continue;
      }

      const finalName =
        formatChannelName(
          channelName,
          settings.channelStyle
        );

      const channel =
        await guild.channels.create({
          name: finalName,
          type: ChannelType.GuildText,
          parent:
            discordCategory.id
        });

      config.createdIds.channels.push(
        channel.id
      );

      channelsCreated++;

      if (
        channelName === "log"
      ) {
        config.channels.log =
          channel.id;
      }

      if (
        channelName === "kayıt"
      ) {
        config.registrationPanelChannel =
          channel.id;
      }

      if (
        channelName === "hoşgeldin"
      ) {
        config.welcome.channelId =
          channel.id;
      }

      if (
        channelName === "ticket"
      ) {
        config.ticketPanelChannel =
          channel.id;
      }
    }

    // VOICE

    if (category.voice) {

      const voiceLimit =
        Math.min(
          category.voice.length,
          settings.voiceCount || 4
        );

      for (
        let i = 0;
        i < voiceLimit;
        i++
      ) {

        const voiceName =
          category.voice[i];

        const channel =
          await guild.channels.create({
            name: voiceName,
            type:
              ChannelType.GuildVoice,
            parent:
              discordCategory.id
          });

        config.createdIds.channels.push(
          channel.id
        );

        channelsCreated++;
      }
    }
  }

  // --------------------------------------------------
  // TICKET CONFIG
  // --------------------------------------------------

  if (
    settings.features.includes(
      "ticket"
    )
  ) {

    const ticketCategory =
      guild.channels.cache.find(
        channel =>
          channel.type ===
            ChannelType.GuildCategory &&
          channel.name.includes(
            "DESTEK"
          )
      );

    if (ticketCategory) {
      config.ticket.categoryId =
        ticketCategory.id;
    }

    config.ticket.staffRoleId =
      config.roles.support ||
      config.roles.staff;

    config.ticket.claimedBy ??= {};
  }

  // --------------------------------------------------
  // WELCOME CONFIG
  // --------------------------------------------------

  if (
    settings.features.includes(
      "welcome"
    )
  ) {
    config.welcome.enabled =
      true;
  }

  saveServerConfig(
    guild.id,
    config
  );

  return {
    categoriesCreated,
    channelsCreated,
    rolesCreated
  };
}

// ======================================================
// ENDLESS EMOJI SETİ + PANEL YARDIMCISI
// ======================================================

const EMOJI = {
  brand: "∞",
  dot: "・",
  coin: "♾️",
  spin: "🎰",
  ok: "✅",
  no: "❌",
  streamer: "🎥",
  ticket: "🎫",
  register: "📝",
  role: "🎭",
  gift: "🎁",
  star: "⭐",
  crown: "👑",
  fire: "🔥",
  shield: "🛡️",
  spark: "✨",
  hug: "🤗",
  kiss: "💋",
  slap: "👋",
  pat: "🫂",
  ship: "💘",
  dice: "🎲",
  coinFlip: "🪙",
  eightBall: "🎱",
  room: "🔒",
  male: "♂️",
  female: "♀️",
  unspecified: "⚪"
};

const BRAND_FOOTER = `${EMOJI.brand} Endless Builder ${EMOJI.dot} Sınırsız Sunucu Deneyimi`;

// Slash komutu cevabı olarak değil, kanala normal mesaj olarak gönderir.
// Böylece "X /komut kullandı" satırı görünmez; yönetici sadece kendine özel onay görür.
async function postPanel(interaction, payload, okText) {
  const channel = interaction.channel;
  const me = interaction.guild?.members?.me;

  if (
    !channel?.isTextBased() ||
    !me ||
    !channel.permissionsFor(me)?.has([
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks
    ])
  ) {
    return interaction.reply({
      content: `${EMOJI.no} Bu kanalda mesaj gönderme ve bağlantı yerleştirme yetkim yok.`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await channel.send(payload);
    return await interaction.editReply({
      content: okText || `${EMOJI.ok} Panel bu kanala gönderildi.`
    });
  } catch (error) {
    console.error("❌ Panel gönderilemedi:", error.message);
    return interaction.editReply({
      content: `${EMOJI.no} İşlem başarısız oldu.`
    }).catch(() => {});
  }
}

// ======================================================
// ROLE PANEL
// ======================================================

async function createRolePanel(
  channel,
  roles
) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("eb_rolesel")
    .setPlaceholder("🎭 Rollerini seç")
    .setMinValues(0)
    .setMaxValues(roles.length)
    .addOptions(
      roles.map(role => ({
        label: role.name.slice(0, 100) || "Rol",
        value: role.id,
        description: "Seçersen rol verilir, seçimi kaldırırsan alınır"
      }))
    );

  return channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`${EMOJI.role} ${EMOJI.dot} Rol Seçim Paneli`)
        .setDescription(
          `${EMOJI.spark} Menüden istediğin rolleri **birden fazla** seçebilirsin.\n\n` +
          "➕ Seçtiklerin verilir\n" +
          "➖ Panelde olup seçmediklerin alınır\n" +
          "🔒 Paneldeki dışındaki rollerine dokunulmaz."
        )
        .setColor(0x5865f2)
        .setFooter({ text: BRAND_FOOTER })
    ],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
}

// ======================================================
// SERVER STATISTICS
// ======================================================

const statsLast = new Map();
const memberFetchLast = new Map();

async function updateServerStats(
  guild,
  force = false
) {
  try {

    const config =
      getServerConfig(guild.id);

    if (
      !config.stats?.enabled
    ) {
      return;
    }

    const nowTs = Date.now();

    // Gereksiz API isteğini engelle: en fazla 2 dakikada bir güncelle
    if (!force && nowTs - (statsLast.get(guild.id) || 0) < 45 * 1000) {
      return;
    }
    statsLast.set(guild.id, nowTs);

    // Üyeleri sadece cache eksikse ve en fazla 30 dakikada bir çek
    if (
      nowTs - (memberFetchLast.get(guild.id) || 0) > 30 * 60 * 1000 &&
      guild.members.cache.size < (guild.memberCount || 0)
    ) {
      memberFetchLast.set(guild.id, nowTs);
      await guild.members
        .fetch()
        .catch(() => {});
    }

    const members =
      guild.members.cache;

    const totalMembers =
      guild.memberCount ||
      members.size;

    const botCount =
      members.filter(
        member =>
          member.user.bot
      ).size;

    const onlineCount =
      members.filter(
        member =>
          !member.user.bot &&
          member.presence?.status &&
          member.presence.status !==
            "offline"
      ).size;

    const voiceCount =
      members.filter(
        member =>
          member.voice?.channel
      ).size;

    const channels =
      config.stats.channels;

    async function updateChannel(
      channelId,
      name
    ) {

      if (!channelId) return;

      const channel =
        guild.channels.cache.get(
          channelId
        );

      if (!channel) return;

      // İsim aynıysa istek atma (kanal adı rate limit'i sıkıdır)
      if (channel.name === name) return;

      await channel
        .setName(name)
        .catch(() => {});
    }

    await updateChannel(
      channels.members,
      `👥・Üye: ${totalMembers}`
    );

    await updateChannel(
      channels.bots,
      `🤖・Bot: ${botCount}`
    );

    await updateChannel(
      channels.online,
      `🟢・Online: ${onlineCount}`
    );

    await updateChannel(
      channels.voice,
      `🔊・Ses: ${voiceCount}`
    );

  } catch (error) {

    console.error(
      "STATS UPDATE ERROR:",
      error
    );
  }
}

async function setupServerStats(
  guild
) {

  const config =
    getServerConfig(guild.id);

  if (
    config.stats?.enabled
  ) {
    return false;
  }

  const category =
    await guild.channels.create({
      name:
        "📊 SUNUCU İSTATİSTİK",
      type:
        ChannelType.GuildCategory
    });

  const members =
    await guild.channels.create({
      name: "👥・Üye: 0",
      type:
        ChannelType.GuildVoice,
      parent: category.id
    });

  const bots =
    await guild.channels.create({
      name: "🤖・Bot: 0",
      type:
        ChannelType.GuildVoice,
      parent: category.id
    });

  const online =
    await guild.channels.create({
      name: "🟢・Online: 0",
      type:
        ChannelType.GuildVoice,
      parent: category.id
    });

  const voice =
    await guild.channels.create({
      name: "🔊・Ses: 0",
      type:
        ChannelType.GuildVoice,
      parent: category.id
    });

  config.stats = {
    enabled: true,

    categoryId:
      category.id,

    channels: {
      members:
        members.id,
      bots:
        bots.id,
      online:
        online.id,
      voice:
        voice.id
    }
  };

  saveServerConfig(
    guild.id,
    config
  );

  await updateServerStats(
    guild,
    true
  );

  return true;
}

// ======================================================
// SLASH COMMANDS
// ======================================================

const commands = [

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription(
      "Endless Builder ile sunucunu oluştur"
    ),

  new SlashCommandBuilder()
    .setName("setup-degistir")
    .setDescription(
      "Mevcut Builder yapısını değiştir"
    ),

  new SlashCommandBuilder()
    .setName("setup-durum")
    .setDescription(
      "Builder kurulum durumunu göster"
    ),

  new SlashCommandBuilder()
    .setName("sunucu-temizle")
    .setDescription(
      "Sunucudaki tüm kanalları sil"
    ),

  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription(
      "Ticket paneli gönder"
    ),

  new SlashCommandBuilder()
    .setName("ticket-devral")
    .setDescription(
      "Mevcut ticketı devral"
    ),

  new SlashCommandBuilder()
    .setName("ticket-kapat")
    .setDescription(
      "Mevcut ticketı kapat"
    ),

  new SlashCommandBuilder()
    .setName("kayit-panel")
    .setDescription(
      "Kayıt paneli gönder"
    ),

  new SlashCommandBuilder()
    .setName("kayit")
    .setDescription(
      "Bir kullanıcıyı kayıt et"
    )
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription(
          "Kayıt edilecek kullanıcı"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("streamer-panel")
    .setDescription(
      "Streamer başvuru paneli gönder"
    ),

  new SlashCommandBuilder()
    .setName("hosgeldin-ayarla")
    .setDescription(
      "Hoş geldin sistemini ayarla"
    )
    .addChannelOption(option =>
      option
        .setName("kanal")
        .setDescription(
          "Hoş geldin kanalı"
        )
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("rol")
        .setDescription(
          "Yeni üyeye verilecek rol"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("log-kanal")
    .setDescription(
      "Log kanalını ayarla"
    )
    .addChannelOption(option =>
      option
        .setName("kanal")
        .setDescription(
          "Log kanalı"
        )
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rol-panel")
    .setDescription(
      "Butonlu rol paneli oluştur"
    )
    .addChannelOption(option =>
      option
        .setName("kanal")
        .setDescription(
          "Rol panelinin gönderileceği kanal"
        )
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("rol1")
        .setDescription(
          "1. rol"
        )
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("rol2")
        .setDescription(
          "2. rol"
        )
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName("rol3")
        .setDescription(
          "3. rol"
        )
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName("rol4")
        .setDescription(
          "4. rol"
        )
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName("rol5")
        .setDescription(
          "5. rol"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("istatistik-kur")
    .setDescription(
      "Sunucu istatistik sistemini kur"
    ),

  new SlashCommandBuilder()
    .setName("istatistik-kapat")
    .setDescription(
      "Sunucu istatistik sistemini kapat"
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription(
      "Kullanıcıyı sunucudan yasakla"
    )
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription(
          "Kullanıcı"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription(
          "Sebep"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription(
      "Kullanıcıyı sunucudan at"
    )
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription(
          "Kullanıcı"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription(
          "Sebep"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription(
      "Kullanıcıya timeout uygula"
    )
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription(
          "Kullanıcı"
        )
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("dakika")
        .setDescription(
          "Dakika"
        )
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription(
          "Sebep"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription(
      "Kullanıcıya uyarı ver"
    )
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription(
          "Kullanıcı"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription(
          "Sebep"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription(
      "Mesajları temizle"
    )
    .addIntegerOption(option =>
      option
        .setName("miktar")
        .setDescription(
          "1-100"
        )
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Level ve XP durumunu göster")
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription("Bakılacak kullanıcı")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("XP sıralamasında ilk 10 kişiyi göster"),

  new SlashCommandBuilder()
    .setName("level-sistem")
    .setDescription("Level sistemi ayarları (yetkili)")
    .addStringOption(option =>
      option
        .setName("islem")
        .setDescription("Yapılacak işlem")
        .setRequired(false)
        .addChoices(
          { name: "Durumu göster", value: "durum" },
          { name: "Sistemi aç", value: "ac" },
          { name: "Sistemi kapat", value: "kapat" },
          { name: "Duyuru kanalını ayarla", value: "kanal" },
          { name: "Duyuru kanalını sıfırla", value: "kanal-sifirla" }
        )
    )
    .addChannelOption(option =>
      option
        .setName("kanal")
        .setDescription("Level duyuru kanalı")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("cekilis")
    .setDescription("Çekiliş başlat (yetkili)")
    .addStringOption(option =>
      option
        .setName("ödül")
        .setDescription("Çekiliş ödülü")
        .setMaxLength(100)
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("süre")
        .setDescription("Süre (dakika, en fazla 10080 = 7 gün)")
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("kazanan")
        .setDescription("Kazanan sayısı (varsayılan 1)")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("cekilis-bitir")
    .setDescription("Aktif bir çekilişi hemen bitir")
    .addStringOption(option =>
      option
        .setName("mesaj")
        .setDescription("Çekiliş mesajının ID'si (boşsa en yeni çekiliş)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("bakiye")
    .setDescription("Endless Coin bakiyeni göster")
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription("Bakiyesine bakılacak kullanıcı")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("günlük")
    .setDescription("Günlük ödülünü al"),

  new SlashCommandBuilder()
    .setName("haftalık")
    .setDescription("Haftalık ödülünü al"),

  new SlashCommandBuilder()
    .setName("öde")
    .setDescription("Başka bir kullanıcıya Endless Coin gönder")
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription("Para gönderilecek kullanıcı")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("miktar")
        .setDescription("Gönderilecek miktar")
        .setMinValue(1)
        .setMaxValue(1000000)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("çalış")
    .setDescription("Çalışarak Endless Coin kazan"),

  new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Slot makinesi oyna")
    .addIntegerOption(option =>
      option
        .setName("bahis")
        .setDescription("Bahis miktarı")
        .setMinValue(1)
        .setMaxValue(1000000)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("leaderboard-para")
    .setDescription("En zengin 10 kişiyi göster"),

  new SlashCommandBuilder()
    .setName("mağaza")
    .setDescription("Mağazadaki ürünleri göster"),

  new SlashCommandBuilder()
    .setName("mağaza-ekle")
    .setDescription("Mağazaya ürün ekle (yetkili)")
    .addStringOption(option =>
      option
        .setName("ad")
        .setDescription("Ürün adı (örn: VIP)")
        .setMaxLength(50)
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("fiyat")
        .setDescription("Fiyat (Endless Coin)")
        .setMinValue(1)
        .setMaxValue(1000000000)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("tur")
        .setDescription("Ürün türü")
        .setRequired(true)
        .addChoices(
          { name: "Rol (VIP, Özel Rol, Renk Rolü)", value: "rol" },
          { name: "XP Boost", value: "xp-boost" },
          { name: "Coin Boost", value: "coin-boost" },
          { name: "Özel Ürün", value: "ozel" }
        )
    )
    .addStringOption(option =>
      option
        .setName("aciklama")
        .setDescription("Kısa açıklama")
        .setMaxLength(80)
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName("rol")
        .setDescription("Satın alınca verilecek rol (Rol türü için)")
        .setRequired(false)
    )
    .addNumberOption(option =>
      option
        .setName("carpan")
        .setDescription("Boost çarpanı (1.1 - 5, varsayılan 2)")
        .setMinValue(1.1)
        .setMaxValue(5)
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName("sure")
        .setDescription("Boost süresi (dakika, 1 - 10080, varsayılan 60)")
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName("stok")
        .setDescription("Stok adedi (boşsa sınırsız)")
        .setMinValue(1)
        .setMaxValue(1000000)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("mağaza-sil")
    .setDescription("Mağazadan ürün sil (yetkili)")
    .addStringOption(option =>
      option
        .setName("urun")
        .setDescription("Silinecek ürün")
        .setAutocomplete(true)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("satın-al")
    .setDescription("Mağazadan ürün satın al")
    .addStringOption(option =>
      option
        .setName("urun")
        .setDescription("Satın alınacak ürün")
        .setAutocomplete(true)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("eksik")
    .setDescription("🛠️ Sunucunun eksik kanallarını ve sistemlerini analiz et"),

  new SlashCommandBuilder()
    .setName("eksikkur")
    .setDescription("⚙️ Tespit edilen eksikleri onay ile otomatik kur"),


];
// NOT: toJSON burada yapılmaz — sonra commands.push ile eklenen builder'lar bozulur.
// Kayıt anında normalizeCommands() ile JSON'a çevrilir.


// ======================================================
// LEVEL SYSTEM
// ======================================================

const xpCooldowns = new Map();

// Level n'e ulaşmak için gereken toplam XP
// Level n için gereken artış: 100 + (n - 1) * 75
function totalXpForLevel(level) {
  return 100 * level + (75 * level * (level - 1)) / 2;
}

// Bulunulan leveldan bir sonrakine geçmek için gereken XP
function xpNeededForNext(level) {
  return 100 + level * 75;
}

function calcLevel(totalXp) {
  let level = 0;
  while (totalXp >= totalXpForLevel(level + 1)) level++;
  return level;
}

function progressBar(current, needed, size = 12) {
  const ratio = needed > 0 ? Math.min(1, Math.max(0, current / needed)) : 0;
  const filled = Math.round(ratio * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

async function applyLevelRoles(member, config, level) {
  try {
    const map = config.levelSystem?.levelRoles || {};
    if (!Object.keys(map).length) return;

    const me = member.guild.members.me;
    if (!me?.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

    for (const [lvl, roleId] of Object.entries(map)) {
      if (Number(lvl) > level) continue;
      const role = member.guild.roles.cache.get(roleId);
      if (!role || role.managed) continue;
      if (role.position >= me.roles.highest.position) continue;
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, "Level rolü").catch(() => {});
      }
    }
  } catch (error) {
    console.error("LEVEL ROLE ERROR:", error);
  }
}

async function handleXp(message) {
  if (!message.guild || message.author.bot || message.webhookId) return;
  if (!message.content || message.content.trim().length < 3) return;

  const config = getServerConfig(message.guild.id);
  const ls = config.levelSystem;
  if (!ls?.enabled) return;

  ls.users ??= {};
  const user = (ls.users[message.author.id] ??= { xp: 0, level: 0, messages: 0 });
  user.messages++;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const cooldown = Math.max(30, Number(ls.cooldownSec) || 60) * 1000;

  if (now - (xpCooldowns.get(key) || 0) < cooldown) return;
  xpCooldowns.set(key, now);

  const min = Math.max(1, Number(ls.minXp) || 15);
  const max = Math.max(min, Number(ls.maxXp) || 25);
  const xpMultiplier = getBoostMultiplier(config.economy?.users?.[message.author.id], "xp");
  user.xp += Math.floor((Math.floor(Math.random() * (max - min + 1)) + min) * xpMultiplier);

  const newLevel = calcLevel(user.xp);
  const leveledUp = newLevel > user.level;
  user.level = newLevel;

  saveServerConfig(message.guild.id, config);

  if (!leveledUp) return;

  const me = message.guild.members.me;
  let channel = ls.announceChannelId
    ? message.guild.channels.cache.get(ls.announceChannelId)
    : null;
  if (!channel || !channel.isTextBased()) channel = message.channel;

  if (me && channel.permissionsFor(me)?.has(PermissionsBitField.Flags.SendMessages)) {
    await channel
      .send({
        content: `🎉 Tebrikler ${message.author}!\n⭐ Level ${newLevel} oldun!`,
        allowedMentions: { users: [message.author.id] }
      })
      .catch(() => {});
  }

  await sendLog(message.guild, `⭐ ${message.author} **Level ${newLevel}** oldu.`);

  if (message.member) await applyLevelRoles(message.member, config, newLevel);
}

async function handleLevelCommand(interaction) {
  const { commandName } = interaction;

  if (!interaction.guild) {
    return interaction.reply({
      content: "❌ Bu komut sadece sunucuda kullanılabilir.",
      ephemeral: true
    });
  }

  const config = getServerConfig(interaction.guildId);
  const ls = config.levelSystem;

  // ---------------- /level ayarla ----------------
  if (commandName === "level-sistem") {
    if (!hasPermission(interaction, PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({
        content: "❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisi gerekir.",
        ephemeral: true
      });
    }

    const action = interaction.options.getString("islem") ?? "durum";
    const channel = interaction.options.getChannel("kanal");

    if (action === "ac") {
      ls.enabled = true;
    } else if (action === "kapat") {
      ls.enabled = false;
    } else if (action === "kanal") {
      if (!channel) {
        return interaction.reply({
          content: "❌ Duyuru kanalını ayarlamak için `kanal` seçeneğini de doldur.",
          ephemeral: true
        });
      }
      ls.announceChannelId = channel.id;
    } else if (action === "kanal-sifirla") {
      ls.announceChannelId = null;
    }

    if (action !== "durum") saveServerConfig(interaction.guildId, config);

    const embed = new EmbedBuilder()
      .setTitle("⭐ Level Sistemi")
      .setColor(ls.enabled ? 0x57f287 : 0xed4245)
      .addFields(
        { name: "Durum", value: ls.enabled ? "✅ Açık" : "❌ Kapalı", inline: true },
        {
          name: "Duyuru Kanalı",
          value: ls.announceChannelId ? `<#${ls.announceChannelId}>` : "Mesajın atıldığı kanal",
          inline: true
        },
        { name: "XP / Mesaj", value: `${ls.minXp}-${ls.maxXp} XP`, inline: true },
        { name: "Bekleme", value: `${ls.cooldownSec} saniye`, inline: true },
        { name: "Kayıtlı Kullanıcı", value: String(Object.keys(ls.users || {}).length), inline: true },
        { name: "Level Rolleri", value: String(Object.keys(ls.levelRoles || {}).length), inline: true }
      )
      .setTimestamp();

    if (action !== "durum") {
      await sendLog(interaction.guild, `⚙️ ${interaction.user} level sistemi ayarını değiştirdi: \`${action}\``);
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ---------------- /level rank & /level siralama ----------------
  if (!ls.enabled) {
    return interaction.reply({
      content: "❌ Level sistemi bu sunucuda kapalı.",
      ephemeral: true
    });
  }

  const sorted = Object.entries(ls.users || {}).sort((a, b) => b[1].xp - a[1].xp);

  if (commandName === "rank") {
    const target = interaction.options.getUser("kullanici") ?? interaction.user;

    if (target.bot) {
      return interaction.reply({
        content: "❌ Botların leveli yoktur.",
        ephemeral: true
      });
    }

    const data = ls.users?.[target.id] || { xp: 0, level: 0, messages: 0 };
    const current = data.xp - totalXpForLevel(data.level);
    const needed = xpNeededForNext(data.level);
    const position = sorted.findIndex(([id]) => id === target.id) + 1;

    const embed = new EmbedBuilder()
      .setTitle(`⭐ ${target.username} • Rank`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0xfee75c)
      .setDescription(`${progressBar(current, needed)}\n**${current} / ${needed} XP**`)
      .addFields(
        { name: "Level", value: String(data.level), inline: true },
        { name: "Sıralama", value: position ? `#${position}` : "—", inline: true },
        { name: "Toplam XP", value: String(data.xp), inline: true },
        { name: "Sonraki Level İçin", value: `${Math.max(0, needed - current)} XP`, inline: true },
        { name: "Mesaj", value: String(data.messages), inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "leaderboard") {
    const top = sorted.slice(0, 10);

    if (!top.length) {
      return interaction.reply({
        content: "📭 Henüz kimse XP kazanmadı.",
        ephemeral: true
      });
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = top.map(([id, d], i) =>
      `${medals[i] || `**${i + 1}.**`} <@${id}> — Level **${d.level}** • ${d.xp} XP`
    );

    const embed = new EmbedBuilder()
      .setTitle("🏆 Level Sıralaması")
      .setDescription(lines.join("\n"))
      .setColor(0xfee75c)
      .setFooter({ text: `${interaction.guild.name} • İlk ${top.length}` })
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] }
    });
  }
}

// Bellekte biriken cooldown kayıtlarını temizle
setInterval(() => {
  const limit = Date.now() - 10 * 60 * 1000;
  for (const [key, time] of xpCooldowns) {
    if (time < limit) xpCooldowns.delete(key);
  }
}, 10 * 60 * 1000).unref();

// ======================================================
// GIVEAWAY SYSTEM
// ======================================================

const { randomInt: secureRandomInt } = require("crypto");

const MAX_ACTIVE_GIVEAWAYS = 5;
let giveawayChecking = false;

function giveawayRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("eb_giveaway_join")
      .setLabel("Katıl")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

function giveawayEmbed(g) {
  const unix = Math.floor(g.endsAt / 1000);

  return new EmbedBuilder()
    .setTitle("🎁 ÇEKİLİŞ")
    .setColor(0x5865f2)
    .addFields(
      { name: "🎁 Ödül", value: g.prize },
      { name: "⏰ Bitiş", value: `<t:${unix}:R>\n<t:${unix}:f>`, inline: true },
      { name: "🏆 Kazanan", value: String(g.winnerCount), inline: true },
      { name: "👤 Düzenleyen", value: `<@${g.hostId}>`, inline: true }
    )
    .setFooter({ text: "Katılmak için butona bas. Tekrar basarsan çekilişten çıkarsın." });
}

function giveawayEndedEmbed(g, winners) {
  return new EmbedBuilder()
    .setTitle("🎁 ÇEKİLİŞ BİTTİ")
    .setColor(0x99aab5)
    .addFields(
      { name: "🎁 Ödül", value: g.prize },
      {
        name: "🏆 Kazanan",
        value: winners.length ? winners.map(id => `<@${id}>`).join(", ") : "Kazanan seçilemedi",
        inline: true
      },
      { name: "👥 Katılımcı", value: String((g.participants || []).length), inline: true },
      { name: "👤 Düzenleyen", value: `<@${g.hostId}>`, inline: true }
    );
}

// Katılımcılar arasından, hâlâ sunucuda olan kazananları seç
async function pickGiveawayWinners(guild, participants, count) {
  const pool = [...participants];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const winners = [];
  let tries = 0;

  for (const id of pool) {
    if (winners.length >= count || tries >= 60) break;
    tries++;

    const member =
      guild.members.cache.get(id) ||
      (await guild.members.fetch(id).catch(() => null));

    if (member) winners.push(id);
  }

  return winners;
}

async function endGiveaway(guild, messageId) {
  const config = getServerConfig(guild.id);
  const g = config.giveaways?.active?.[messageId];
  if (!g) return null;

  // Aynı çekilişin iki kez bitmesini engellemek için önce listeden çıkar
  delete config.giveaways.active[messageId];

  const winners = await pickGiveawayWinners(guild, g.participants || [], g.winnerCount);

  config.giveaways.history ??= [];
  config.giveaways.history.push({
    messageId,
    channelId: g.channelId,
    prize: g.prize,
    winners,
    participants: (g.participants || []).length,
    endedAt: Date.now()
  });
  while (config.giveaways.history.length > 25) config.giveaways.history.shift();

  saveServerConfig(guild.id, config);

  try {
    const channel = await guild.channels.fetch(g.channelId).catch(() => null);

    if (channel?.isTextBased()) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);

      if (msg) {
        await msg
          .edit({
            embeds: [giveawayEndedEmbed(g, winners)],
            components: [giveawayRow(true)]
          })
          .catch(() => {});
      }

      const payload = {
        content: winners.length
          ? `🎉 Tebrikler ${winners.map(id => `<@${id}>`).join(", ")}! **${g.prize}** kazandınız!`
          : `😢 **${g.prize}** çekilişinde yeterli katılım olmadığı için kazanan seçilemedi.`,
        allowedMentions: { users: winners }
      };

      if (msg) {
        await msg.reply(payload).catch(() => channel.send(payload).catch(() => {}));
      } else {
        await channel.send(payload).catch(() => {});
      }
    }
  } catch (error) {
    console.error("GIVEAWAY END ERROR:", error);
  }

  await sendLog(
    guild,
    `🎁 Çekiliş bitti: **${g.prize}** — Kazanan: ${
      winners.length ? winners.map(id => `<@${id}>`).join(", ") : "yok"
    }`
  );

  return { prize: g.prize, winners };
}

async function handleGiveawayButton(interaction) {
  const config = getServerConfig(interaction.guildId);
  const g = config.giveaways?.active?.[interaction.message.id];

  if (!g) {
    return interaction.reply({
      content: "❌ Bu çekiliş sona ermiş veya bulunamadı.",
      ephemeral: true
    });
  }

  if (Date.now() >= g.endsAt) {
    return interaction.reply({
      content: "⏰ Bu çekilişin süresi doldu, kazanan birazdan seçilecek.",
      ephemeral: true
    });
  }

  g.participants ??= [];
  const index = g.participants.indexOf(interaction.user.id);
  let joined;

  if (index === -1) {
    g.participants.push(interaction.user.id);
    joined = true;
  } else {
    g.participants.splice(index, 1);
    joined = false;
  }

  saveServerConfig(interaction.guildId, config);

  return interaction.reply({
    content: joined
      ? `✅ Çekilişe katıldın! Toplam katılımcı: **${g.participants.length}**`
      : `↩️ Çekilişten ayrıldın. Toplam katılımcı: **${g.participants.length}**`,
    ephemeral: true
  });
}

async function handleGiveawayCommand(interaction) {
  const { commandName } = interaction;

  if (!interaction.guild) {
    return interaction.reply({
      content: "❌ Bu komut sadece sunucuda kullanılabilir.",
      ephemeral: true
    });
  }

  const config = getServerConfig(interaction.guildId);
  config.giveaways ??= { enabled: true, active: {} };
  config.giveaways.active ??= {};

  const canManage = hasPermission(interaction, PermissionsBitField.Flags.ManageGuild);

  // ---------------- /cekilis baslat ----------------
  if (commandName === "cekilis") {
    if (!canManage) {
      return interaction.reply({
        content: "❌ Çekiliş başlatmak için **Sunucuyu Yönet** yetkisi gerekir.",
        ephemeral: true
      });
    }

    if (!config.giveaways.enabled) {
      return interaction.reply({
        content: "❌ Çekiliş sistemi bu sunucuda kapalı.",
        ephemeral: true
      });
    }

    if (Object.keys(config.giveaways.active).length >= MAX_ACTIVE_GIVEAWAYS) {
      return interaction.reply({
        content: `❌ Aynı anda en fazla **${MAX_ACTIVE_GIVEAWAYS}** aktif çekiliş olabilir.`,
        ephemeral: true
      });
    }

    const channel = interaction.channel;
    const me = interaction.guild.members.me;

    if (
      !channel?.isTextBased() ||
      !me ||
      !channel.permissionsFor(me)?.has([
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.EmbedLinks
      ])
    ) {
      return interaction.reply({
        content: "❌ Bu kanalda mesaj gönderme ve bağlantı yerleştirme yetkim yok.",
        ephemeral: true
      });
    }

    const prize = interaction.options.getString("ödül").trim();
    const minutes = interaction.options.getInteger("süre");
    const winnerCount = interaction.options.getInteger("kazanan") ?? 1;

    if (!prize) {
      return interaction.reply({ content: "❌ Ödül boş olamaz.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const g = {
      messageId: null,
      channelId: channel.id,
      prize,
      hostId: interaction.user.id,
      winnerCount,
      createdAt: Date.now(),
      endsAt: Date.now() + minutes * 60 * 1000,
      participants: []
    };

    const msg = await channel.send({
      embeds: [giveawayEmbed(g)],
      components: [giveawayRow()]
    });

    g.messageId = msg.id;
    config.giveaways.active[msg.id] = g;
    saveServerConfig(interaction.guildId, config);

    await sendLog(
      interaction.guild,
      `🎁 ${interaction.user} çekiliş başlattı: **${prize}** (${minutes} dk, ${winnerCount} kazanan)`
    );

    return interaction.editReply({
      content: `✅ Çekiliş başlatıldı: ${msg.url}`
    });
  }

  // ---------------- /cekilis bitir ----------------
  if (commandName === "cekilis-bitir") {
    const list = Object.values(config.giveaways.active);

    if (!list.length) {
      return interaction.reply({
        content: "❌ Aktif çekiliş yok.",
        ephemeral: true
      });
    }

    let target;
    const idInput = interaction.options.getString("mesaj")?.trim();

    if (idInput) {
      target = config.giveaways.active[idInput];
    } else {
      // Mesaj verilmediyse: bu kanaldaki, yoksa sunucudaki en yeni çekiliş
      const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
      target = sorted.find(x => x.channelId === interaction.channelId) || sorted[0];
    }

    if (!target) {
      return interaction.reply({
        content: "❌ Bu mesaj ID'sine ait aktif çekiliş bulunamadı.",
        ephemeral: true
      });
    }

    if (!canManage && target.hostId !== interaction.user.id) {
      return interaction.reply({
        content: "❌ Bu çekilişi bitirmek için **Sunucuyu Yönet** yetkisi gerekir veya çekilişi başlatan kişi olmalısın.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await endGiveaway(interaction.guild, target.messageId);

    return interaction.editReply({
      content: result
        ? `✅ **${result.prize}** çekilişi bitirildi.`
        : "❌ Çekiliş zaten bitmiş."
    });
  }
}

// Süresi dolan çekilişleri bitir (restart sonrası kalan çekilişleri de yakalar)
async function checkGiveaways() {
  if (giveawayChecking || !client.isReady()) return;
  giveawayChecking = true;

  try {
    const now = Date.now();

    for (const [guildId, cfg] of Object.entries(loadData())) {
      const active = cfg?.giveaways?.active;
      if (!active) continue;

      for (const g of Object.values(active)) {
        if (g.endsAt > now) continue;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;

        await endGiveaway(guild, g.messageId).catch(error =>
          console.error("GIVEAWAY CHECK ERROR:", error)
        );
      }
    }
  } catch (error) {
    console.error("GIVEAWAY LOOP ERROR:", error);
  } finally {
    giveawayChecking = false;
  }
}

setInterval(checkGiveaways, 10 * 1000);

// ======================================================
// ECONOMY SYSTEM
// ======================================================

const MAX_BALANCE = 1_000_000_000_000;
const MAX_PAY_AMOUNT = 1_000_000;
const DAILY_MS = 24 * 60 * 60 * 1000;
const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
const WORK_MS = 60 * 60 * 1000;
const SLOTS_COOLDOWN_MS = 5 * 1000;

// [sembol, ağırlık, 3'lü eşleşme çarpanı]
const SLOT_SYMBOLS = [
  ["🍒", 30, 3],
  ["🍋", 25, 4],
  ["🍇", 20, 6],
  ["🔔", 12, 10],
  ["⭐", 8, 20],
  ["💎", 5, 50]
];

const WORK_JOBS = [
  "Bir kafede garsonluk yaptın",
  "Kurye olarak paket dağıttın",
  "Sunucu için bir bot kodladın",
  "Bir oyunda takım arkadaşlarına koçluk yaptın",
  "Sunucu etkinliğini sen yönettin",
  "Bir tasarım siparişini teslim ettin",
  "Depoda vardiya yaptın",
  "Bir turnuvada hakemlik yaptın"
];

const slotsCooldowns = new Map();

function coin(config, amount) {
  const name = config.economy?.currency || "Endless Coin";
  return `${EMOJI.coin} **${Number(amount).toLocaleString("tr-TR")}** ${name}`;
}

// Kullanıcının ekonomi kaydını getir; bozuk/eksik alanları düzelt
function ecoUser(eco, userId) {
  eco.users ??= {};
  const u = (eco.users[userId] ??= {});

  if (!Number.isFinite(u.balance) || u.balance < 0) u.balance = 0;
  u.balance = Math.min(MAX_BALANCE, Math.floor(u.balance));

  for (const key of ["dailyCooldown", "weeklyCooldown", "workCooldown"]) {
    if (!Number.isFinite(u[key]) || u[key] < 0) u[key] = 0;
  }

  if (!u.inventory || typeof u.inventory !== "object" || Array.isArray(u.inventory)) {
    u.inventory = {};
  }

  if (!u.boosts || typeof u.boosts !== "object" || Array.isArray(u.boosts)) {
    u.boosts = {};
  }

  return u;
}

// Aktif boost çarpanı (süresi dolmuşsa veya yoksa 1)
function getBoostMultiplier(u, type) {
  const b = u?.boosts?.[type];
  if (!b || !Number.isFinite(b.expiresAt) || b.expiresAt <= Date.now()) return 1;
  const m = Number(b.multiplier);
  return Number.isFinite(m) && m >= 1 ? Math.min(m, 10) : 1;
}

function creditCoins(u, amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;
  u.balance = Math.min(MAX_BALANCE, u.balance + amount);
  return true;
}

// Yetersiz bakiyede işlem yapmaz; bakiye asla negatif olmaz
function spendCoins(u, amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;
  if (u.balance < amount) return false;
  u.balance -= amount;
  return true;
}

function cooldownText(ts, now = Date.now()) {
  return ts > now ? `⏳ <t:${Math.floor(ts / 1000)}:R>` : "✅ Hazır";
}

function spinSlotSymbol() {
  let r = secureRandomInt(100);
  for (const s of SLOT_SYMBOLS) {
    if (r < s[1]) return s;
    r -= s[1];
  }
  return SLOT_SYMBOLS[0];
}

// Sonuç: 3 aynı = sembol çarpanı, 2 aynı = 1.5x, aksi halde kayıp
function rollSlots(bet) {
  const reels = [spinSlotSymbol(), spinSlotSymbol(), spinSlotSymbol()];
  const symbols = reels.map(r => r[0]);
  let payout = 0;
  let kind = "lose";

  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
    payout = bet * reels[0][2];
    kind = "jackpot";
  } else if (
    symbols[0] === symbols[1] ||
    symbols[1] === symbols[2] ||
    symbols[0] === symbols[2]
  ) {
    payout = Math.floor(bet * 1.5);
    kind = "pair";
  }

  return { symbols, payout, kind };
}

async function handleEconomyCommand(interaction) {
  const { commandName } = interaction;

  if (!interaction.guild) {
    return interaction.reply({
      content: "❌ Bu komut sadece sunucuda kullanılabilir.",
      ephemeral: true
    });
  }

  const config = getServerConfig(interaction.guildId);
  const eco = config.economy;

  if (!eco?.enabled) {
    return interaction.reply({
      content: "❌ Ekonomi sistemi bu sunucuda kapalı.",
      ephemeral: true
    });
  }

  // NOT: Aşağıdaki işlemlerde kontrol ile bakiye değişikliği arasında
  // await bulunmaz; böylece aynı anda gelen komutlar hile yapamaz.
  const now = Date.now();
  const me = ecoUser(eco, interaction.user.id);

  // ---------------- /ekonomi bakiye ----------------
  if (commandName === "bakiye") {
    const target = interaction.options.getUser("kullanici") ?? interaction.user;

    if (target.bot) {
      return interaction.reply({
        content: "❌ Botların bakiyesi yoktur.",
        ephemeral: true
      });
    }

    const isSelf = target.id === interaction.user.id;
    const u = isSelf ? me : ecoUser(eco, target.id);

    const embed = new EmbedBuilder()
      .setTitle(`💰 ${target.username} • Bakiye`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0xfee75c)
      .setDescription(coin(config, u.balance))
      .setTimestamp();

    if (isSelf) {
      const items = Object.values(u.inventory).reduce((a, b) => a + (Number(b) || 0), 0);
      embed.addFields(
        { name: "Günlük", value: cooldownText(u.dailyCooldown, now), inline: true },
        { name: "Haftalık", value: cooldownText(u.weeklyCooldown, now), inline: true },
        { name: "Çalış", value: cooldownText(u.workCooldown, now), inline: true },
        { name: "Envanter", value: `${items} ürün`, inline: true }
      );

      const boostLines = [];
      for (const [kind, label] of [["xp", "⚡ XP"], ["coin", "💸 Coin"]]) {
        const mult = getBoostMultiplier(u, kind);
        if (mult > 1) {
          boostLines.push(`${label} x${mult} • <t:${Math.floor(u.boosts[kind].expiresAt / 1000)}:R>`);
        }
      }
      if (boostLines.length) {
        embed.addFields({ name: "Aktif Boost", value: boostLines.join("\n") });
      }
    }

    return interaction.reply({ embeds: [embed] });
  }

  // ---------------- /ekonomi gunluk & /ekonomi haftalik ----------------
  if (commandName === "günlük" || commandName === "haftalık") {
    const daily = commandName === "günlük";
    const key = daily ? "dailyCooldown" : "weeklyCooldown";
    const baseReward = Math.max(
      1,
      Math.floor(Number(daily ? eco.dailyReward : eco.weeklyReward)) || (daily ? 250 : 1500)
    );
    const coinMult = getBoostMultiplier(me, "coin");
    const reward = Math.floor(baseReward * coinMult);
    const boostNote = coinMult > 1 ? ` 🚀 (x${coinMult} Coin Boost)` : "";

    if (me[key] > now) {
      return interaction.reply({
        content: `⏳ ${daily ? "Günlük" : "Haftalık"} ödülünü zaten aldın. Tekrar alabilirsin: <t:${Math.floor(me[key] / 1000)}:R>`,
        ephemeral: true
      });
    }

    me[key] = now + (daily ? DAILY_MS : WEEKLY_MS);
    creditCoins(me, reward);
    saveServerConfig(interaction.guildId, config);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(daily ? "🎁 Günlük Ödül" : "🎁 Haftalık Ödül")
          .setColor(0x57f287)
          .setDescription(`${coin(config, reward)} kazandın!${boostNote}\nYeni bakiye: ${coin(config, me.balance)}`)
          .setTimestamp()
      ]
    });
  }

  // ---------------- /ekonomi calis ----------------
  if (commandName === "çalış") {
    if (me.workCooldown > now) {
      return interaction.reply({
        content: `⏳ Şu an yorgunsun. Tekrar çalışabilirsin: <t:${Math.floor(me.workCooldown / 1000)}:R>`,
        ephemeral: true
      });
    }

    const min = Math.max(1, Math.floor(Number(eco.workMin)) || 50);
    const max = Math.max(min, Math.floor(Number(eco.workMax)) || 150);
    const coinMult = getBoostMultiplier(me, "coin");
    const reward = Math.floor(secureRandomInt(min, max + 1) * coinMult);
    const boostNote = coinMult > 1 ? ` 🚀 (x${coinMult} Coin Boost)` : "";
    const job = WORK_JOBS[secureRandomInt(WORK_JOBS.length)];

    me.workCooldown = now + WORK_MS;
    creditCoins(me, reward);
    saveServerConfig(interaction.guildId, config);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("💼 Çalış")
          .setColor(0x5865f2)
          .setDescription(`${job} ve ${coin(config, reward)} kazandın!${boostNote}\nYeni bakiye: ${coin(config, me.balance)}`)
          .setTimestamp()
      ]
    });
  }

  // ---------------- /ekonomi ode ----------------
  if (commandName === "öde") {
    const target = interaction.options.getUser("kullanici");
    const amount = interaction.options.getInteger("miktar");
    const targetMember = interaction.options.getMember("kullanici");

    if (!target || target.bot) {
      return interaction.reply({ content: "❌ Botlara para gönderemezsin.", ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: "❌ Kendine para gönderemezsin.", ephemeral: true });
    }
    if (!targetMember) {
      return interaction.reply({ content: "❌ Bu kullanıcı sunucuda değil.", ephemeral: true });
    }
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_PAY_AMOUNT) {
      return interaction.reply({
        content: `❌ Miktar 1 ile ${MAX_PAY_AMOUNT.toLocaleString("tr-TR")} arasında olmalı.`,
        ephemeral: true
      });
    }

    const to = ecoUser(eco, target.id);

    if (to.balance + amount > MAX_BALANCE) {
      return interaction.reply({
        content: "❌ Alıcının bakiyesi bu miktarı alamayacak kadar yüksek.",
        ephemeral: true
      });
    }
    if (!spendCoins(me, amount)) {
      return interaction.reply({
        content: `❌ Yetersiz bakiye. Bakiyen: ${coin(config, me.balance)}`,
        ephemeral: true
      });
    }

    creditCoins(to, amount);
    saveServerConfig(interaction.guildId, config);

    return interaction.reply({
      content: `✅ ${interaction.user} → ${target}: ${coin(config, amount)} gönderdi.`,
      allowedMentions: { users: [target.id] }
    });
  }

  // ---------------- /ekonomi slots ----------------
  if (commandName === "slots") {
    const minBet = Math.max(1, Math.floor(Number(eco.slotsMinBet)) || 10);
    const maxBet = Math.max(minBet, Math.floor(Number(eco.slotsMaxBet)) || 5000);
    const bet = interaction.options.getInteger("bahis");

    if (!Number.isSafeInteger(bet) || bet < minBet || bet > maxBet) {
      return interaction.reply({
        content: `❌ Bahis ${minBet} ile ${maxBet} arasında olmalı.`,
        ephemeral: true
      });
    }

    const key = `${interaction.guildId}:${interaction.user.id}`;
    const wait = (slotsCooldowns.get(key) || 0) + SLOTS_COOLDOWN_MS - now;

    if (wait > 0) {
      return interaction.reply({
        content: `⏳ Biraz yavaş! ${Math.ceil(wait / 1000)} saniye sonra tekrar dene.`,
        ephemeral: true
      });
    }

    if (!spendCoins(me, bet)) {
      return interaction.reply({
        content: `❌ Yetersiz bakiye. Bakiyen: ${coin(config, me.balance)}`,
        ephemeral: true
      });
    }

    slotsCooldowns.set(key, now);

    // Sonuç ve bakiye animasyondan ÖNCE kesinleşir (animasyon sırasında restart olsa bile kayıp yok)
    const result = rollSlots(bet);
    if (result.payout > 0) creditCoins(me, result.payout);
    saveServerConfig(interaction.guildId, config);

    const net = result.payout - bet;
    const randSym = () => SLOT_SYMBOLS[secureRandomInt(SLOT_SYMBOLS.length)][0];
    const SPIN = "🌀";

    const board = (a, b2, c) => `## 🎰 ┃ ${a} ┃ ${b2} ┃ ${c} ┃ 🎰`;
    const frame = (text, symbols, color) =>
      new EmbedBuilder()
        .setTitle(`${EMOJI.spin} ${EMOJI.dot} Endless Slots`)
        .setColor(color)
        .setDescription(`${board(...symbols)}\n${text}`)
        .setFooter({ text: `${interaction.user.username} ${EMOJI.dot} Bahis: ${Number(bet).toLocaleString("tr-TR")}` });

    const s1 = result.symbols[0];
    const s2 = result.symbols[1];
    const s3 = result.symbols[2];

    try {
      await interaction.reply({
        embeds: [frame("🌀 *Makara dönüyor...*", [SPIN, SPIN, SPIN], 0x5865f2)]
      });

      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const steps = [
        { t: 700, sym: [randSym(), randSym(), randSym()], txt: "🎲 *Şansını zorluyorsun...*" },
        { t: 800, sym: [s1, randSym(), randSym()], txt: "✨ *İlk makara durdu!*" },
        { t: 900, sym: [s1, s2, randSym()], txt: result.symbols[0] === result.symbols[1] ? "🔥 *İkisi aynı! Heyecan artıyor...*" : "😬 *Son makara...*" }
      ];

      for (const step of steps) {
        await sleep(step.t);
        await interaction.editReply({
          embeds: [frame(step.txt, step.sym, 0xfaa61a)]
        });
      }

      await sleep(900);

      const title =
        result.kind === "jackpot"
          ? "💎 JACKPOT!"
          : result.kind === "pair"
            ? "✨ İkili Eşleşme"
            : "💀 Kaybettin";
      const color =
        result.kind === "jackpot" ? 0xfee75c : result.kind === "pair" ? 0x57f287 : 0xed4245;
      const line =
        result.kind === "jackpot"
          ? "🎉 **Efsane! Üçü de aynı geldi!**"
          : result.kind === "pair"
            ? "👏 **İyi iş! İki sembol eşleşti.**"
            : "🍀 **Bu sefer olmadı, bir daha dene!**";

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${EMOJI.spin} ${EMOJI.dot} ${title}`)
            .setColor(color)
            .setDescription(`${board(s1, s2, s3)}\n${line}`)
            .addFields(
              { name: "🎟️ Bahis", value: coin(config, bet), inline: true },
              {
                name: net >= 0 ? "🏆 Kazanç" : "📉 Kayıp",
                value: coin(config, Math.abs(net)),
                inline: true
              },
              { name: "👛 Bakiye", value: coin(config, me.balance), inline: true }
            )
            .setFooter({ text: BRAND_FOOTER })
            .setTimestamp()
        ]
      });
    } catch (error) {
      console.error("❌ Slots animasyon hatası:", error.message);
      // Animasyon bozulsa da sonuç kullanıcıya iletilsin
      const text =
        `${EMOJI.spin} **[ ${result.symbols.join(" | ")} ]** — ` +
        (net >= 0 ? `Kazanç: ${coin(config, net)}` : `Kayıp: ${coin(config, Math.abs(net))}`) +
        `\n👛 Bakiye: ${coin(config, me.balance)}`;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: text }).catch(() => {});
      } else {
        await interaction.reply({ content: text }).catch(() => {});
      }
    }

    return;
  }

  // ---------------- /ekonomi siralama ----------------
  if (commandName === "leaderboard-para") {
    const top = Object.entries(eco.users || {})
      .filter(([, d]) => Number(d?.balance) > 0)
      .sort((a, b) => b[1].balance - a[1].balance)
      .slice(0, 10);

    if (!top.length) {
      return interaction.reply({
        content: "📭 Henüz kimsenin parası yok.",
        ephemeral: true
      });
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = top.map(
      ([id, d], i) =>
        `${medals[i] || `**${i + 1}.**`} <@${id}> — ${coin(config, d.balance)}`
    );

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("👑 ・ Zenginler Listesi")
          .setDescription(lines.join("\n"))
          .setColor(0xfee75c)
          .setFooter({ text: `${interaction.guild.name} • İlk ${top.length}` })
          .setTimestamp()
      ],
      allowedMentions: { parse: [] }
    });
  }
}

setInterval(() => {
  const limit = Date.now() - 60 * 1000;
  for (const [key, time] of slotsCooldowns) {
    if (time < limit) slotsCooldowns.delete(key);
  }
}, 10 * 60 * 1000).unref();

// ======================================================
// SHOP SYSTEM
// ======================================================

const MAX_SHOP_ITEMS = 25;

const SHOP_TYPES = {
  rol: "🎭 Rol",
  "xp-boost": "⚡ XP Boost",
  "coin-boost": "💸 Coin Boost",
  ozel: "🎁 Özel Ürün"
};

function shopData(config) {
  config.shop ??= { items: [], nextId: 1 };
  config.shop.items ??= [];
  config.shop.nextId ??= 1;
  return config.shop;
}

function findShopItem(shop, input) {
  const q = String(input ?? "").trim().toLowerCase();
  if (!q) return null;
  return (
    shop.items.find(i => i.id === q) ||
    shop.items.find(i => i.name.toLowerCase() === q) ||
    null
  );
}

function describeShopItem(item) {
  const parts = [SHOP_TYPES[item.type] || "🎁 Ürün"];

  if (item.type === "rol" && item.roleId) parts.push(`<@&${item.roleId}>`);
  if (item.type === "xp-boost" || item.type === "coin-boost") {
    parts.push(`x${item.multiplier} • ${item.durationMin} dk`);
  }

  const stock = item.stock ?? null;
  parts.push(stock === null ? "Stok: ∞" : stock <= 0 ? "❌ Tükendi" : `Stok: ${stock}`);

  return parts.join(" • ");
}

async function handleShopAutocomplete(interaction) {
  try {
    if (!interaction.guildId) return await interaction.respond([]);

    const config = getServerConfig(interaction.guildId);
    const shop = shopData(config);
    const focused = String(interaction.options.getFocused() ?? "").toLowerCase();

    const choices = shop.items
      .filter(i => !focused || i.name.toLowerCase().includes(focused) || i.id === focused)
      .slice(0, 25)
      .map(i => ({
        name: `#${i.id} ${i.name} • ${i.price.toLocaleString("tr-TR")}`.slice(0, 100),
        value: i.id
      }));

    await interaction.respond(choices);
  } catch {
    await interaction.respond([]).catch(() => {});
  }
}

async function handleShopCommand(interaction) {
  const { commandName } = interaction;

  if (!interaction.guild) {
    return interaction.reply({
      content: "❌ Bu komut sadece sunucuda kullanılabilir.",
      ephemeral: true
    });
  }

  const config = getServerConfig(interaction.guildId);
  const shop = shopData(config);
  const canManage = hasPermission(interaction, PermissionsBitField.Flags.ManageGuild);

  // ---------------- /magaza liste ----------------
  if (commandName === "mağaza") {
    if (!shop.items.length) {
      return interaction.reply({
        content: "🛒 Mağazada henüz ürün yok. Yetkililer `/magaza ekle` ile ürün ekleyebilir.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🛒 Mağaza")
      .setColor(0x5865f2)
      .setDescription("Satın almak için `/magaza satin-al` komutunu kullan.")
      .addFields(
        shop.items.slice(0, 25).map(item => ({
          name: `#${item.id} ${item.name} — ${item.price.toLocaleString("tr-TR")} 💰`.slice(0, 256),
          value: `${item.description ? `${item.description}\n` : ""}${describeShopItem(item)}`.slice(0, 1024)
        }))
      )
      .setFooter({ text: config.economy?.currency || "Endless Coin" });

    return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }

  // ---------------- /magaza ekle ----------------
  if (commandName === "mağaza-ekle") {
    if (!canManage) {
      return interaction.reply({
        content: "❌ Ürün eklemek için **Sunucuyu Yönet** yetkisi gerekir.",
        ephemeral: true
      });
    }

    if (shop.items.length >= MAX_SHOP_ITEMS) {
      return interaction.reply({
        content: `❌ Mağazada en fazla **${MAX_SHOP_ITEMS}** ürün olabilir.`,
        ephemeral: true
      });
    }

    const name = interaction.options.getString("ad").trim();
    const price = interaction.options.getInteger("fiyat");
    const type = interaction.options.getString("tur");
    const description = (interaction.options.getString("aciklama") ?? "").trim();
    const role = interaction.options.getRole("rol");
    const stockInput = interaction.options.getInteger("stok");

    if (!name) {
      return interaction.reply({ content: "❌ Ürün adı boş olamaz.", ephemeral: true });
    }
    if (!Number.isSafeInteger(price) || price < 1 || price > 1_000_000_000) {
      return interaction.reply({ content: "❌ Fiyat 1 ile 1.000.000.000 arasında olmalı.", ephemeral: true });
    }
    if (!SHOP_TYPES[type]) {
      return interaction.reply({ content: "❌ Geçersiz ürün türü.", ephemeral: true });
    }
    if (shop.items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
      return interaction.reply({ content: "❌ Bu isimde bir ürün zaten var.", ephemeral: true });
    }

    const item = {
      id: String(shop.nextId),
      name,
      price,
      description,
      type,
      roleId: null,
      multiplier: null,
      durationMin: null,
      stock: stockInput ?? null,
      createdAt: Date.now()
    };

    if (type === "rol") {
      if (!role) {
        return interaction.reply({
          content: "❌ Rol ürünleri için `rol` seçeneğini doldur.",
          ephemeral: true
        });
      }

      const botMember = interaction.guild.members.me;
      const isOwner = interaction.guild.ownerId === interaction.user.id;

      if (role.id === interaction.guild.id || role.managed) {
        return interaction.reply({
          content: "❌ Bu rol mağazada satılamaz (@everyone veya bot/entegrasyon rolü).",
          ephemeral: true
        });
      }
      if (
        !botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
        role.position >= botMember.roles.highest.position
      ) {
        return interaction.reply({
          content: "❌ Bu rolü veremem. Botun rolü satılacak rolün **üstünde** olmalı ve **Rolleri Yönet** yetkisi olmalı.",
          ephemeral: true
        });
      }
      // Yetki yükseltmeyi engelle: kendi rolünün üstündeki rolü satamazsın
      if (!isOwner && interaction.member.roles.highest.position <= role.position) {
        return interaction.reply({
          content: "❌ Kendi en yüksek rolünün üstündeki veya eşitindeki bir rolü satamazsın.",
          ephemeral: true
        });
      }
      if (role.permissions.has(PermissionsBitField.Flags.Administrator) && !isAdmin(interaction)) {
        return interaction.reply({
          content: "❌ Yönetici yetkisi olan bir rolü sadece yöneticiler satabilir.",
          ephemeral: true
        });
      }

      item.roleId = role.id;
    }

    if (type === "xp-boost" || type === "coin-boost") {
      item.multiplier =
        Math.round((interaction.options.getNumber("carpan") ?? 2) * 100) / 100;
      item.durationMin = interaction.options.getInteger("sure") ?? 60;
    }

    shop.nextId++;
    shop.items.push(item);
    saveServerConfig(interaction.guildId, config);

    await sendLog(
      interaction.guild,
      `🛒 ${interaction.user} mağazaya ürün ekledi: **${name}** (${price} 💰)`
    );

    return interaction.reply({
      content: `✅ Ürün eklendi: **#${item.id} ${name}**\n${describeShopItem(item)}`,
      ephemeral: true,
      allowedMentions: { parse: [] }
    });
  }

  // ---------------- /magaza sil ----------------
  if (commandName === "mağaza-sil") {
    if (!canManage) {
      return interaction.reply({
        content: "❌ Ürün silmek için **Sunucuyu Yönet** yetkisi gerekir.",
        ephemeral: true
      });
    }

    const item = findShopItem(shop, interaction.options.getString("urun"));

    if (!item) {
      return interaction.reply({ content: "❌ Ürün bulunamadı.", ephemeral: true });
    }

    shop.items = shop.items.filter(i => i.id !== item.id);
    saveServerConfig(interaction.guildId, config);

    await sendLog(
      interaction.guild,
      `🛒 ${interaction.user} mağazadan ürün sildi: **${item.name}**`
    );

    return interaction.reply({
      content: `🗑️ **${item.name}** mağazadan silindi.`,
      ephemeral: true
    });
  }

  // ---------------- /magaza satin-al ----------------
  if (commandName === "satın-al") {
    // deferReply'dan sonraki kontrol + bakiye düşme adımlarında await yok
    await interaction.deferReply({ ephemeral: true });

    const eco = config.economy;

    if (!eco?.enabled) {
      return interaction.editReply({ content: "❌ Ekonomi sistemi bu sunucuda kapalı." });
    }

    const item = findShopItem(shop, interaction.options.getString("urun"));

    if (!item) {
      return interaction.editReply({ content: "❌ Ürün bulunamadı. `/magaza liste` ile listeye bakabilirsin." });
    }

    const hasStock = item.stock !== null && item.stock !== undefined;

    if (hasStock && item.stock <= 0) {
      return interaction.editReply({ content: "❌ Bu ürün tükendi." });
    }

    const me = ecoUser(eco, interaction.user.id);
    const now = Date.now();
    let role = null;
    let boostKind = null;

    if (item.type === "rol") {
      role = interaction.guild.roles.cache.get(item.roleId);
      const botMember = interaction.guild.members.me;

      if (!role) {
        return interaction.editReply({ content: "❌ Bu ürünün rolü silinmiş. Yetkililere haber ver." });
      }
      if (
        !botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
        role.managed ||
        role.position >= botMember.roles.highest.position
      ) {
        return interaction.editReply({ content: "❌ Bu rolü şu an veremiyorum. Yetkililere haber ver." });
      }
      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.editReply({ content: "❌ Bu role zaten sahipsin." });
      }
    }

    if (item.type === "xp-boost" || item.type === "coin-boost") {
      boostKind = item.type === "xp-boost" ? "xp" : "coin";

      if (getBoostMultiplier(me, boostKind) > 1) {
        return interaction.editReply({
          content: `❌ Zaten aktif bir ${boostKind === "xp" ? "XP" : "Coin"} boostun var. Bitiş: <t:${Math.floor(me.boosts[boostKind].expiresAt / 1000)}:R>`
        });
      }
    }

    if (!spendCoins(me, item.price)) {
      return interaction.editReply({
        content: `❌ Yetersiz bakiye. Bakiyen: ${coin(config, me.balance)}`
      });
    }

    // --- Satın alma (senkron) ---
    if (hasStock) item.stock--;

    const previousQty = me.inventory[item.id] || 0;
    me.inventory[item.id] = item.type === "rol" ? 1 : previousQty + 1;

    if (boostKind) {
      me.boosts[boostKind] = {
        multiplier: item.multiplier,
        expiresAt: now + item.durationMin * 60 * 1000,
        itemId: item.id
      };
    }

    saveServerConfig(interaction.guildId, config);

    // --- Rol verme (async); başarısız olursa geri al ---
    if (role) {
      try {
        await interaction.member.roles.add(role, "Mağaza satın alma");
      } catch (error) {
        console.error("SHOP ROLE ERROR:", error);

        creditCoins(me, item.price);
        if (hasStock) item.stock++;
        if (previousQty > 0) me.inventory[item.id] = previousQty;
        else delete me.inventory[item.id];
        saveServerConfig(interaction.guildId, config);

        return interaction.editReply({
          content: "❌ Rol verilemedi, paran iade edildi."
        });
      }
    }

    await sendLog(
      interaction.guild,
      `🛒 ${interaction.user} **${item.name}** ürününü satın aldı (${item.price} 💰).${role ? ` Verilen rol: ${role}` : ""}`
    );

    const embed = new EmbedBuilder()
      .setTitle("✅ Satın Alma Başarılı")
      .setColor(0x57f287)
      .addFields(
        { name: "Ürün", value: item.name, inline: true },
        { name: "Fiyat", value: coin(config, item.price), inline: true },
        { name: "Yeni Bakiye", value: coin(config, me.balance), inline: true }
      )
      .setTimestamp();

    if (role) embed.addFields({ name: "Rol", value: `${role}`, inline: true });
    if (boostKind) {
      embed.addFields({
        name: "Boost",
        value: `x${item.multiplier} • bitiş <t:${Math.floor(me.boosts[boostKind].expiresAt / 1000)}:R>`,
        inline: true
      });
    }

    return interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  }
}

// ======================================================
// ADVANCED TICKET SYSTEM
// ======================================================

const TICKET_TYPES = {
  destek: {
    label: "Destek",
    emoji: "🎫",
    customId: "eb_ticket_open", // eski panellerle uyumlu
    text: "Sorununu detaylı bir şekilde anlat, yetkili ekibimiz yardımcı olacaktır."
  },
  satin: {
    label: "Satın Alma",
    emoji: "🛒",
    customId: "eb_ticket_open_buy",
    text: "Satın almak istediğin ürünü ve ödeme yöntemini yaz."
  },
  sikayet: {
    label: "Şikayet",
    emoji: "⚠️",
    customId: "eb_ticket_open_report",
    text: "Şikayet ettiğin kişiyi, olayı ve varsa kanıtlarını paylaş."
  },
  diger: {
    label: "Diğer",
    emoji: "📩",
    customId: "eb_ticket_open_other",
    text: "Konunu kısaca anlat, yetkili ekibimiz seni yönlendirecektir."
  }
};

const TICKET_OPEN_IDS = Object.fromEntries(
  Object.entries(TICKET_TYPES).map(([key, t]) => [t.customId, key])
);

const ticketOpening = new Set();

function ticketStore(config) {
  config.tickets ??= {};
  config.ticket ??= { categoryId: null, staffRoleId: null, claimedBy: {} };
  config.ticket.claimedBy ??= {};
  config.ticket.records ??= {};
  config.ticket.history ??= [];
  config.ticket.counter ??= 0;
  return config.ticket;
}

// Ticketı görebilen yetkili roller: ticket yetkili rolü + Yetkili + Destek Ekibi
function ticketStaffRoleIds(config) {
  return [
    ...new Set(
      [config.ticket?.staffRoleId, config.roles?.staff, config.roles?.support].filter(Boolean)
    )
  ];
}

function isTicketStaff(interaction, config) {
  return (
    isAdmin(interaction) ||
    ticketStaffRoleIds(config).some(id => hasRole(interaction.member, id))
  );
}

function findTicketOwner(config, channelId) {
  return Object.entries(config.tickets || {}).find(([, id]) => id === channelId) || null;
}

function ticketPanelRow() {
  return new ActionRowBuilder().addComponents(
    Object.values(TICKET_TYPES).map((t, i) =>
      new ButtonBuilder()
        .setCustomId(t.customId)
        .setLabel(t.label)
        .setEmoji(t.emoji)
        .setStyle(i === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
    )
  );
}

function ticketControlRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("eb_ticket_claim")
        .setLabel("Devral")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("eb_ticket_close")
        .setLabel("Kapat")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("eb_ticket_transcript")
        .setLabel("Transcript")
        .setEmoji("📄")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("eb_ticket_add")
        .setLabel("Kullanıcı Ekle")
        .setEmoji("👤")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("eb_ticket_remove")
        .setLabel("Kullanıcı Çıkar")
        .setEmoji("👤")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function transcriptTime(ts) {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

// Kanaldaki mesajlardan metin transcript üret (en fazla 1000 mesaj)
async function buildTicketTranscript(channel, meta = {}) {
  const collected = [];
  let before;

  for (let page = 0; page < 10; page++) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {})
    });
    if (!batch.size) break;
    collected.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }

  collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = [
    `TICKET TRANSCRIPT`,
    `Kanal: #${channel.name}`,
    `Ticket sahibi: ${meta.ownerTag || meta.ownerId || "bilinmiyor"}`,
    `Tür: ${meta.typeLabel || "Destek"}`,
    `Devralan: ${meta.claimedBy || "yok"}`,
    `Açılış: ${meta.openedAt ? transcriptTime(meta.openedAt) : "bilinmiyor"}`,
    `Oluşturulma: ${transcriptTime(Date.now())}`,
    `Mesaj sayısı: ${collected.length}`,
    "=".repeat(48),
    ""
  ];

  for (const m of collected) {
    const author = m.author ? `${m.author.tag ?? m.author.username} (${m.author.id})` : "bilinmiyor";
    lines.push(`[${transcriptTime(m.createdTimestamp)}] ${author}: ${m.content || ""}`);

    for (const a of m.attachments?.values?.() ?? []) lines.push(`    📎 ${a.url}`);
    for (const e of m.embeds ?? []) {
      const text = [e.title, e.description].filter(Boolean).join(" - ").slice(0, 300);
      if (text) lines.push(`    [Embed] ${text}`);
    }
  }

  return {
    count: collected.length,
    buffer: Buffer.from(lines.join("\n"), "utf8"),
    fileName: `transcript-${channel.name}.txt`
  };
}

function transcriptFile(t) {
  return new AttachmentBuilder(t.buffer, { name: t.fileName });
}

async function sendLogWithFile(guild, embed, files) {
  try {
    const config = getServerConfig(guild.id);
    if (!config.channels?.log) return false;

    const channel = await guild.channels.fetch(config.channels.log).catch(() => null);
    if (!channel?.isTextBased()) return false;

    await channel.send({ embeds: [embed], files });
    return true;
  } catch {
    return false;
  }
}

async function ticketOwnerTag(client, ownerId) {
  const user = await client.users.fetch(ownerId).catch(() => null);
  return user ? `${user.tag ?? user.username} (${ownerId})` : ownerId;
}

async function openTicket(interaction, typeKey) {
  const type = TICKET_TYPES[typeKey] || TICKET_TYPES.destek;
  const config = getServerConfig(interaction.guildId);
  const store = ticketStore(config);
  const key = `${interaction.guildId}:${interaction.user.id}`;

  if (ticketOpening.has(key)) {
    return interaction.reply({
      content: "⏳ Ticketın oluşturuluyor, lütfen bekle.",
      ephemeral: true
    });
  }

  const existingId = config.tickets[interaction.user.id];

  if (existingId) {
    const existing = interaction.guild.channels.cache.get(existingId);

    if (existing) {
      return interaction.reply({
        content: `❌ Zaten açık ticketın var: ${existing}`,
        ephemeral: true
      });
    }

    // Kanal elle silinmiş; kaydı temizle
    delete config.tickets[interaction.user.id];
    delete store.records[existingId];
    delete store.claimedBy[existingId];
  }

  const category = store.categoryId
    ? interaction.guild.channels.cache.get(store.categoryId)
    : null;

  if (!category) {
    return interaction.reply({
      content: "❌ Ticket kategorisi bulunamadı.",
      ephemeral: true
    });
  }

  ticketOpening.add(key);

  try {
    await interaction.deferReply({ ephemeral: true });

    const staffRoleIds = ticketStaffRoleIds(config).filter(id =>
      interaction.guild.roles.cache.has(id)
    );

    let safeUsername = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 20);
    if (!safeUsername) safeUsername = "kullanici";

    const F = PermissionsBitField.Flags;
    const memberAllow = [F.ViewChannel, F.SendMessages, F.ReadMessageHistory, F.AttachFiles];

    let channel;

    try {
      channel = await interaction.guild.channels.create({
        name: `ticket-${safeUsername}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `Ticket sahibi: ${interaction.user.id} • Tür: ${type.label}`,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone.id, deny: [F.ViewChannel] },
          { id: interaction.user.id, allow: memberAllow },
          {
            id: interaction.client.user.id,
            allow: [...memberAllow, F.ManageChannels, F.EmbedLinks]
          },
          ...staffRoleIds.map(id => ({ id, allow: memberAllow }))
        ]
      });
    } catch (error) {
      console.error("TICKET CREATE ERROR:", error);
      return interaction.editReply({
        content: "❌ Ticket oluşturulamadı. Kategori dolu olabilir veya yetkim yok."
      });
    }

    store.counter += 1;
    config.tickets[interaction.user.id] = channel.id;
    store.records[channel.id] = {
      number: store.counter,
      ownerId: interaction.user.id,
      type: typeKey in TICKET_TYPES ? typeKey : "destek",
      openedAt: Date.now(),
      members: []
    };
    saveServerConfig(interaction.guildId, config);

    await channel
      .send({
        content: `${interaction.user}${staffRoleIds.length ? ` ${staffRoleIds.map(id => `<@&${id}>`).join(" ")}` : ""}`,
        allowedMentions: { users: [interaction.user.id], roles: staffRoleIds },
        embeds: [
          new EmbedBuilder()
            .setTitle(`${type.emoji} ${type.label} Ticketı #${store.counter}`)
            .setDescription(
              `${type.text}\n\n` +
                "🎫 Yetkili ticketı **Devral** butonuyla üstlenebilir.\n" +
                "🔒 Ticket **Kapat** butonuyla kapatılır (onay istenir).\n" +
                "📄 **Transcript** ile konuşmanın dökümü alınır."
            )
            .addFields(
              { name: "Açan", value: `${interaction.user}`, inline: true },
              { name: "Tür", value: `${type.emoji} ${type.label}`, inline: true }
            )
            .setColor(0x5865f2)
            .setTimestamp()
        ],
        components: ticketControlRows()
      })
      .catch(error => console.error("TICKET WELCOME ERROR:", error));

    await sendLog(
      interaction.guild,
      `🎫 ${interaction.user} **${type.label}** ticketı açtı: ${channel}`
    );

    return interaction.editReply({ content: `✅ Ticket oluşturuldu: ${channel}` });
  } finally {
    ticketOpening.delete(key);
  }
}

async function handleTicketTranscript(interaction) {
  const config = getServerConfig(interaction.guildId);
  const store = ticketStore(config);
  const owner = findTicketOwner(config, interaction.channelId);

  if (!owner) {
    return interaction.reply({ content: "❌ Bu kanal bir ticket değil.", ephemeral: true });
  }

  if (!isTicketStaff(interaction, config) && owner[0] !== interaction.user.id) {
    return interaction.reply({
      content: "❌ Transcript almak için yetkin yok.",
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const record = store.records[interaction.channelId] || {};
  const claimedId = store.claimedBy[interaction.channelId];

  const t = await buildTicketTranscript(interaction.channel, {
    ownerTag: await ticketOwnerTag(interaction.client, owner[0]),
    ownerId: owner[0],
    typeLabel: TICKET_TYPES[record.type]?.label,
    claimedBy: claimedId,
    openedAt: record.openedAt
  });

  const sentToLog = await sendLogWithFile(
    interaction.guild,
    new EmbedBuilder()
      .setTitle("📄 Ticket Transcript")
      .setColor(0x5865f2)
      .addFields(
        { name: "Kanal", value: `#${interaction.channel.name}`, inline: true },
        { name: "İsteyen", value: `${interaction.user}`, inline: true },
        { name: "Mesaj", value: String(t.count), inline: true }
      )
      .setTimestamp(),
    [transcriptFile(t)]
  );

  return interaction.editReply({
    content: sentToLog
      ? "📄 Transcript oluşturuldu ve log kanalına gönderildi."
      : "📄 Transcript oluşturuldu.",
    files: [transcriptFile(t)]
  });
}

async function handleTicketMemberButton(interaction, mode) {
  const config = getServerConfig(interaction.guildId);

  if (!findTicketOwner(config, interaction.channelId)) {
    return interaction.reply({ content: "❌ Bu kanal bir ticket değil.", ephemeral: true });
  }

  if (!isTicketStaff(interaction, config)) {
    return interaction.reply({
      content: "❌ Bu işlem için yetkin yok.",
      ephemeral: true
    });
  }

  const add = mode === "add";

  return interaction.reply({
    content: add ? "👤 Ticketa eklenecek kullanıcıları seç:" : "👤 Tickettan çıkarılacak kullanıcıları seç:",
    components: [
      new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(add ? "eb_ticket_add_select" : "eb_ticket_remove_select")
          .setPlaceholder("Kullanıcı seç")
          .setMinValues(1)
          .setMaxValues(5)
      )
    ],
    ephemeral: true
  });
}

async function handleTicketMemberSelect(interaction) {
  const add = interaction.customId === "eb_ticket_add_select";
  const config = getServerConfig(interaction.guildId);
  const store = ticketStore(config);
  const owner = findTicketOwner(config, interaction.channelId);

  if (!owner) {
    return interaction.update({ content: "❌ Bu kanal bir ticket değil.", components: [] });
  }

  if (!isTicketStaff(interaction, config)) {
    return interaction.update({ content: "❌ Bu işlem için yetkin yok.", components: [] });
  }

  await interaction.deferUpdate();

  const F = PermissionsBitField.Flags;
  const record = (store.records[interaction.channelId] ??= {
    number: null,
    ownerId: owner[0],
    type: "destek",
    openedAt: null,
    members: []
  });
  record.members ??= [];

  const staffIds = ticketStaffRoleIds(config);
  const done = [];
  const skipped = [];

  for (const id of interaction.values.slice(0, 5)) {
    try {
      if (id === owner[0]) { skipped.push(`<@${id}> (ticket sahibi)`); continue; }

      const member = await interaction.guild.members.fetch(id).catch(() => null);
      if (!member) { skipped.push(`<@${id}> (sunucuda değil)`); continue; }

      if (add) {
        if (member.user.bot) { skipped.push(`<@${id}> (bot)`); continue; }

        await interaction.channel.permissionOverwrites.edit(id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true
        });
        if (!record.members.includes(id)) record.members.push(id);
        done.push(`<@${id}>`);
      } else {
        if (staffIds.some(rid => member.roles.cache.has(rid))) {
          skipped.push(`<@${id}> (yetkili, rolü sayesinde görür)`);
          continue;
        }

        await interaction.channel.permissionOverwrites.delete(id);
        record.members = record.members.filter(x => x !== id);
        done.push(`<@${id}>`);
      }
    } catch (error) {
      console.error("TICKET MEMBER ERROR:", error);
      skipped.push(`<@${id}> (işlem başarısız)`);
    }
  }

  saveServerConfig(interaction.guildId, config);

  if (done.length) {
    await interaction.channel
      .send({
        content: `👤 ${done.join(", ")} ticket${add ? "a eklendi" : "tan çıkarıldı"} (${interaction.user}).`,
        allowedMentions: { parse: [] }
      })
      .catch(() => {});

    await sendLog(
      interaction.guild,
      `👤 ${interaction.user} ticket ${add ? "ekledi" : "çıkardı"}: ${done.join(", ")}\n**Kanal:** ${interaction.channel}`
    );
  }

  return interaction.editReply({
    content:
      (done.length ? `✅ ${add ? "Eklendi" : "Çıkarıldı"}: ${done.join(", ")}` : "❌ Kimse eklenmedi/çıkarılmadı.") +
      (skipped.length ? `\n⚠️ Atlanan: ${skipped.join(", ")}` : ""),
    components: []
  });
}

async function closeTicketConfirmed(interaction) {
  const config = getServerConfig(interaction.guildId);
  const store = ticketStore(config);
  const owner = findTicketOwner(config, interaction.channelId);

  if (!owner) {
    return interaction.update({ content: "❌ Ticket zaten kapatılmış.", components: [] });
  }

  if (!isTicketStaff(interaction, config) && owner[0] !== interaction.user.id) {
    return interaction.update({ content: "❌ Bu ticketı kapatma yetkin yok.", components: [] });
  }

  const channel = interaction.channel;
  const record = store.records[channel.id] || {
    number: null,
    ownerId: owner[0],
    type: "destek",
    openedAt: null,
    members: []
  };
  const claimedBy = store.claimedBy[channel.id] || null;
  const type = TICKET_TYPES[record.type] || TICKET_TYPES.destek;

  // Aynı ticketın iki kez kapanmasını engellemek için önce kayıtları kaldır (senkron)
  delete config.tickets[owner[0]];
  delete store.claimedBy[channel.id];
  delete store.records[channel.id];

  const entry = {
    number: record.number,
    ownerId: owner[0],
    type: record.type,
    channelName: channel.name,
    openedAt: record.openedAt,
    closedAt: Date.now(),
    closedBy: interaction.user.id,
    claimedBy,
    messages: null
  };

  store.history.push(entry);
  while (store.history.length > 50) store.history.shift();
  saveServerConfig(interaction.guildId, config);

  await interaction.update({
    content: "🔒 Ticket kapatılıyor, transcript hazırlanıyor...",
    components: []
  });

  let transcript = null;

  try {
    transcript = await buildTicketTranscript(channel, {
      ownerTag: await ticketOwnerTag(interaction.client, owner[0]),
      ownerId: owner[0],
      typeLabel: type.label,
      claimedBy,
      openedAt: record.openedAt
    });
    entry.messages = transcript.count;
    saveServerConfig(interaction.guildId, config);
  } catch (error) {
    console.error("TRANSCRIPT ERROR:", error);
  }

  const summary = new EmbedBuilder()
    .setTitle(`🔒 Ticket Kapatıldı${record.number ? ` #${record.number}` : ""}`)
    .setColor(0xed4245)
    .addFields(
      { name: "Kanal", value: `#${channel.name}`, inline: true },
      { name: "Tür", value: `${type.emoji} ${type.label}`, inline: true },
      { name: "Sahibi", value: `<@${owner[0]}>`, inline: true },
      { name: "Devralan", value: claimedBy ? `<@${claimedBy}>` : "—", inline: true },
      { name: "Kapatan", value: `${interaction.user}`, inline: true },
      { name: "Mesaj", value: transcript ? String(transcript.count) : "—", inline: true }
    )
    .setTimestamp();

  let sentToLog = false;

  if (transcript) {
    sentToLog = await sendLogWithFile(interaction.guild, summary, [transcriptFile(transcript)]);
  } else {
    await sendLog(
      interaction.guild,
      `🔒 Ticket kapatıldı.\n**Kanal:** ${channel.name}\n**Kapatan:** ${interaction.user}`
    );
  }

  // Log kanalı yoksa transcripti kapatan kişiye ver
  if (transcript && !sentToLog) {
    await interaction
      .followUp({
        content: "📄 Log kanalı ayarlı olmadığı için transcript sana gönderildi.",
        files: [transcriptFile(transcript)],
        ephemeral: true
      })
      .catch(() => {});
  }

  setTimeout(() => {
    channel.delete("Ticket kapatıldı").catch(() => {});
  }, 1500);
}

// ======================================================
// AŞAMA 7-16: ROL SEÇİMİ, MODERASYON, AUTOMOD, ANTİ-RAID,
// AI, AYARLAR, YARDIM, PREMIUM, OWNER PARA
// ======================================================

const { AuditLogEvent } = require("discord.js");

const F = PermissionsBitField.Flags;
const FAIL_TEXT = "❌ İşlem başarısız oldu.";

// ---------- Ortak yardımcılar ----------

async function respond(interaction, payload) {
  if (interaction.deferred && !interaction.replied) {
    const { ephemeral, ...rest } = payload;
    return interaction.editReply(rest);
  }
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ ephemeral: true, ...payload });
  }
  return interaction.reply(payload);
}

function deny(interaction, text) {
  return respond(interaction, { content: text, ephemeral: true });
}

function isOwnerMember(interaction) {
  return interaction.guild?.ownerId === interaction.user.id;
}

function canManageGuild(interaction) {
  return hasPermission(interaction, F.ManageGuild);
}

function isModMember(member) {
  if (!member) return false;
  return (
    member.guild.ownerId === member.id ||
    member.permissions.has(F.Administrator) ||
    member.permissions.has(F.ManageMessages)
  );
}

function clampInt(v, min, max, fallback) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function botLacks(interaction, flags, label) {
  const me = interaction.guild.members.me;
  if (!me || !me.permissions.has(flags)) {
    return `❌ Botta **${label}** yetkisi yok.`;
  }
  return null;
}

// Yetkili + bot için rol hiyerarşisi kontrolü
function checkModTarget(interaction, member) {
  const me = interaction.guild.members.me;
  if (!member) return "❌ Kullanıcı sunucuda bulunamadı.";
  if (member.id === interaction.user.id) return "❌ Bu işlemi kendine uygulayamazsın.";
  if (member.id === interaction.guild.ownerId) return "❌ Sunucu sahibine işlem uygulanamaz.";
  if (member.id === client.user.id) return "❌ Bana bu işlemi uygulayamazsın.";
  if (
    !isOwnerMember(interaction) &&
    interaction.member.roles.highest.position <= member.roles.highest.position
  ) {
    return "❌ Bu kullanıcının rolü seninkine eşit veya daha yüksek.";
  }
  if (!me || me.roles.highest.position <= member.roles.highest.position) {
    return "❌ Bu kullanıcının rolü benimkine eşit veya daha yüksek. Bot rolünü yukarı taşı.";
  }
  return null;
}

function ensureExtraConfig(config) {
  config.toggles ??= { ticket: true, registration: true, streamer: true, rolePanel: true };
  return config;
}

// ---------- PREMIUM ALTYAPISI (pasif) ----------

const PREMIUM_SKU_ID = process.env.PREMIUM_SKU_ID || null;
const PREMIUM_PAYMENT_URL = /^https?:\/\//i.test(process.env.PREMIUM_PAYMENT_URL || "")
  ? process.env.PREMIUM_PAYMENT_URL
  : null;

const PLAN_LIMITS = {
  free: { categories: 2, voice: 2, shopItems: 10, activeGiveaways: 2 },
  premium: { categories: 25, voice: 20, shopItems: 100, activeGiveaways: 10 }
};

// PREMIUM_SKU_ID tanımlı değilse limit sistemi pasif: herkes sınırsız.
function premiumEnforced() {
  return Boolean(PREMIUM_SKU_ID);
}

function isPremiumGuild(guildId) {
  const p = getServerConfig(guildId).premium;
  return Boolean(p?.active && (!p.expiresAt || p.expiresAt > Date.now()));
}

function getLimits(guildId) {
  if (!premiumEnforced()) {
    return { categories: Infinity, voice: Infinity, shopItems: Infinity, activeGiveaways: Infinity };
  }
  return isPremiumGuild(guildId) ? PLAN_LIMITS.premium : PLAN_LIMITS.free;
}

function syncEntitlement(entitlement, active) {
  try {
    if (!PREMIUM_SKU_ID || entitlement.skuId !== PREMIUM_SKU_ID || !entitlement.guildId) return;
    const config = getServerConfig(entitlement.guildId);
    const endsAt = entitlement.endsAt ? new Date(entitlement.endsAt).getTime() : null;
    config.premium.active = Boolean(active && (!endsAt || endsAt > Date.now()));
    config.premium.expiresAt = endsAt;
    saveServerConfig(entitlement.guildId, config);
  } catch (error) {
    console.error("ENTITLEMENT ERROR:", error.message);
  }
}
client.on("entitlementCreate", e => syncEntitlement(e, true));
client.on("entitlementUpdate", (_o, e) => syncEntitlement(e, true));
client.on("entitlementDelete", e => syncEntitlement(e, false));

async function handlePremium(interaction) {
  const limits = getLimits(interaction.guildId);
  const lim = v => (v === Infinity ? "Sınırsız" : String(v));
  const active = isPremiumGuild(interaction.guildId);
  const embed = new EmbedBuilder()
    .setTitle(`💎 ${EMOJI.dot} Endless Premium`)
    .setColor(active ? 0xfee75c : 0x5865f2)
    .setDescription(
      premiumEnforced()
        ? active
          ? "💎 Bu sunucuda **Premium aktif**. Teşekkürler!"
          : "🆓 Bu sunucu **Free** planda."
        : "🟢 Limit sistemi şu an **pasif**: tüm sunucular tüm özellikleri sınırsız kullanabilir."
    )
    .addFields(
      { name: "🆓 Free", value: `Kategori: **${PLAN_LIMITS.free.categories}**\nSes: **${PLAN_LIMITS.free.voice}**\nMağaza ürünü: **${PLAN_LIMITS.free.shopItems}**`, inline: true },
      { name: "💎 Premium", value: `Kategori: **${PLAN_LIMITS.premium.categories}**\nSes: **${PLAN_LIMITS.premium.voice}**\nMağaza ürünü: **${PLAN_LIMITS.premium.shopItems}**`, inline: true },
      { name: "📌 Senin Limitin", value: `Kategori: **${lim(limits.categories)}** • Ses: **${lim(limits.voice)}**`, inline: false }
    )
    .setFooter({ text: BRAND_FOOTER });

  const payload = { embeds: [embed], ephemeral: true };
  if (PREMIUM_PAYMENT_URL) {
    payload.components = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Premium Al").setEmoji("💎").setStyle(ButtonStyle.Link).setURL(PREMIUM_PAYMENT_URL)
      )
    ];
  }
  return interaction.reply(payload);
}

// ---------- ROL PANELİ (select menu) ----------

async function handleRoleSelect(interaction) {
  const config = ensureExtraConfig(getServerConfig(interaction.guildId));
  if (!config.toggles.rolePanel) return deny(interaction, "❌ Rol sistemi bu sunucuda kapalı.");

  const panelIds = interaction.component.options.map(o => o.value);
  const selected = new Set(interaction.values.filter(v => panelIds.includes(v)));
  const me = interaction.guild.members.me;
  if (!me) return deny(interaction, FAIL_TEXT);

  await interaction.deferReply({ ephemeral: true });

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return interaction.editReply({ content: FAIL_TEXT });

  const toAdd = [];
  const toRemove = [];
  const skipped = [];

  for (const id of panelIds) {
    const role = interaction.guild.roles.cache.get(id);
    if (!role) continue;
    const has = member.roles.cache.has(id);
    const want = selected.has(id);
    if (has === want) continue;
    if (role.managed || role.id === interaction.guild.id || role.position >= me.roles.highest.position) {
      skipped.push(role);
      continue;
    }
    (want ? toAdd : toRemove).push(role);
  }

  try {
    if (toAdd.length) await member.roles.add(toAdd, "Rol paneli");
    if (toRemove.length) await member.roles.remove(toRemove, "Rol paneli");
  } catch (error) {
    console.error("ROLE SELECT ERROR:", error.message);
    return interaction.editReply({ content: FAIL_TEXT });
  }

  for (const r of toAdd) await sendLog(interaction.guild, `🎭 ${interaction.user} ${r} rolünü aldı.`);
  for (const r of toRemove) await sendLog(interaction.guild, `🎭 ${interaction.user} ${r} rolünü bıraktı.`);

  const lines = [];
  if (toAdd.length) lines.push(`➕ Verilen: ${toAdd.join(", ")}`);
  if (toRemove.length) lines.push(`➖ Alınan: ${toRemove.join(", ")}`);
  if (skipped.length) lines.push(`⚠️ Yönetemediğim: ${skipped.join(", ")} (bot rolünü yukarı taşı)`);
  if (!lines.length) lines.push("ℹ️ Değişiklik yok.");

  return interaction.editReply({ content: lines.join("\n"), allowedMentions: { parse: [] } });
}

// ---------- MODERASYON ----------

const MOD_COMMANDS = ["ban", "unban", "kick", "timeout", "mute", "unmute", "warn", "warnings", "warn-sil", "clear"];
const MAX_TIMEOUT_MIN = 28 * 24 * 60;

function modEmbed(title, color, fields) {
  return new EmbedBuilder().setTitle(title).setColor(color).addFields(fields).setFooter({ text: BRAND_FOOTER }).setTimestamp();
}

async function applyTimeout(interaction, minutes, label) {
  const perm = hasPermission(interaction, F.ModerateMembers);
  if (!perm) return deny(interaction, "❌ Bu komut için **Üyelere Zaman Aşımı Uygula** yetkin yok.");
  const miss = botLacks(interaction, F.ModerateMembers, "Üyelere Zaman Aşımı Uygula");
  if (miss) return deny(interaction, miss);

  const user = interaction.options.getUser("kullanici");
  const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi.";
  const mins = clampInt(minutes, 1, MAX_TIMEOUT_MIN, 10);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const problem = checkModTarget(interaction, member);
  if (problem) return deny(interaction, problem);
  if (!member.moderatable) return deny(interaction, "❌ Bu kullanıcıya işlem uygulayamıyorum.");

  await member.timeout(mins * 60 * 1000, `${interaction.user.tag}: ${reason}`);
  await sendLog(
    interaction.guild,
    `⏱️ ${user} **${mins} dk** ${label} aldı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}`
  );
  return interaction.reply({
    embeds: [modEmbed(`⏱️ ${label[0].toUpperCase()}${label.slice(1)}`, 0xfaa61a, [
      { name: "Kullanıcı", value: `${user}`, inline: true },
      { name: "Süre", value: `${mins} dk`, inline: true },
      { name: "Sebep", value: reason }
    ])],
    ephemeral: true
  });
}

async function handleModeration(interaction) {
  const name = interaction.commandName;
  const config = getServerConfig(interaction.guildId);
  config.warnings ??= {};

  try {
    if (name === "ban") {
      if (!hasPermission(interaction, F.BanMembers)) return deny(interaction, "❌ **Üyeleri Yasakla** yetkin yok.");
      const miss = botLacks(interaction, F.BanMembers, "Üyeleri Yasakla");
      if (miss) return deny(interaction, miss);

      const user = interaction.options.getUser("kullanici");
      const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi.";
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (member) {
        const problem = checkModTarget(interaction, member);
        if (problem) return deny(interaction, problem);
        if (!member.bannable) return deny(interaction, "❌ Bu kullanıcıyı banlayamıyorum.");
      } else if (user.id === interaction.user.id) {
        return deny(interaction, "❌ Kendini banlayamazsın.");
      }

      await interaction.guild.members.ban(user.id, { reason: `${interaction.user.tag}: ${reason}` });
      await sendLog(interaction.guild, `🔨 ${user} banlandı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}`);
      return interaction.reply({
        embeds: [modEmbed("🔨 Ban", 0xed4245, [
          { name: "Kullanıcı", value: `${user}`, inline: true },
          { name: "Yetkili", value: `${interaction.user}`, inline: true },
          { name: "Sebep", value: reason }
        ])],
        ephemeral: true
      });
    }

    if (name === "unban") {
      if (!hasPermission(interaction, F.BanMembers)) return deny(interaction, "❌ **Üyeleri Yasakla** yetkin yok.");
      const miss = botLacks(interaction, F.BanMembers, "Üyeleri Yasakla");
      if (miss) return deny(interaction, miss);

      const user = interaction.options.getUser("kullanici");
      const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi.";
      const ban = await interaction.guild.bans.fetch(user.id).catch(() => null);
      if (!ban) return deny(interaction, "❌ Bu kullanıcı banlı değil.");

      await interaction.guild.bans.remove(user.id, `${interaction.user.tag}: ${reason}`);
      await sendLog(interaction.guild, `♻️ ${user} kullanıcısının banı kaldırıldı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}`);
      return interaction.reply({ content: `♻️ ${user.tag} kullanıcısının banı kaldırıldı.`, ephemeral: true });
    }

    if (name === "kick") {
      if (!hasPermission(interaction, F.KickMembers)) return deny(interaction, "❌ **Üyeleri At** yetkin yok.");
      const miss = botLacks(interaction, F.KickMembers, "Üyeleri At");
      if (miss) return deny(interaction, miss);

      const user = interaction.options.getUser("kullanici");
      const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi.";
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const problem = checkModTarget(interaction, member);
      if (problem) return deny(interaction, problem);
      if (!member.kickable) return deny(interaction, "❌ Bu kullanıcıyı atamıyorum.");

      await member.kick(`${interaction.user.tag}: ${reason}`);
      await sendLog(interaction.guild, `👢 ${user} sunucudan atıldı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}`);
      return interaction.reply({
        embeds: [modEmbed("👢 Kick", 0xfaa61a, [
          { name: "Kullanıcı", value: `${user}`, inline: true },
          { name: "Yetkili", value: `${interaction.user}`, inline: true },
          { name: "Sebep", value: reason }
        ])],
        ephemeral: true
      });
    }

    if (name === "timeout") {
      return applyTimeout(interaction, interaction.options.getInteger("dakika"), "zaman aşımı");
    }
    if (name === "mute") {
      return applyTimeout(interaction, interaction.options.getInteger("dakika"), "susturma");
    }

    if (name === "unmute") {
      if (!hasPermission(interaction, F.ModerateMembers)) return deny(interaction, "❌ **Üyelere Zaman Aşımı Uygula** yetkin yok.");
      const miss = botLacks(interaction, F.ModerateMembers, "Üyelere Zaman Aşımı Uygula");
      if (miss) return deny(interaction, miss);

      const user = interaction.options.getUser("kullanici");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return deny(interaction, "❌ Kullanıcı sunucuda bulunamadı.");
      if (!member.isCommunicationDisabled()) return deny(interaction, "ℹ️ Bu kullanıcı susturulmamış.");
      if (!member.moderatable) return deny(interaction, "❌ Bu kullanıcıya işlem uygulayamıyorum.");

      await member.timeout(null, `${interaction.user.tag}: susturma kaldırıldı`);
      await sendLog(interaction.guild, `🔊 ${user} susturması kaldırıldı.\n**Yetkili:** ${interaction.user}`);
      return interaction.reply({ content: `🔊 ${user.tag} susturması kaldırıldı.`, ephemeral: true });
    }

    if (name === "warn") {
      if (!hasPermission(interaction, F.ModerateMembers)) return deny(interaction, "❌ Uyarı verme yetkin yok.");
      const user = interaction.options.getUser("kullanici");
      const reason = interaction.options.getString("sebep");
      if (user.bot) return deny(interaction, "❌ Botlara uyarı verilemez.");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (member) {
        const problem = checkModTarget(interaction, member);
        if (problem) return deny(interaction, problem);
      }

      const list = (config.warnings[user.id] ??= []);
      list.push({ reason, moderator: interaction.user.id, date: Date.now() });
      if (list.length > 100) list.splice(0, list.length - 100);
      saveServerConfig(interaction.guildId, config);

      await sendLog(interaction.guild, `⚠️ ${user} uyarıldı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}\n**Toplam uyarı:** ${list.length}`);
      return interaction.reply({
        embeds: [modEmbed("⚠️ Uyarı", 0xfee75c, [
          { name: "Kullanıcı", value: `${user}`, inline: true },
          { name: "Toplam", value: String(list.length), inline: true },
          { name: "Sebep", value: reason }
        ])],
        ephemeral: true
      });
    }

    if (name === "warnings") {
      const user = interaction.options.getUser("kullanici") || interaction.user;
      if (user.id !== interaction.user.id && !hasPermission(interaction, F.ModerateMembers)) {
        return deny(interaction, "❌ Başkasının uyarılarını görmek için yetkin yok.");
      }
      const list = config.warnings[user.id] || [];
      if (!list.length) return deny(interaction, `✅ ${user.tag} kullanıcısının uyarısı yok.`);

      const lines = list
        .map((w, i) => `**${i + 1}.** ${w.reason} — <@${w.moderator}> • <t:${Math.floor((w.date || Date.now()) / 1000)}:d>`)
        .slice(-10);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`⚠️ ${user.username} ${EMOJI.dot} Uyarılar (${list.length})`)
            .setDescription(lines.join("\n").slice(0, 4000))
            .setColor(0xfee75c)
            .setFooter({ text: list.length > 10 ? "Son 10 uyarı gösteriliyor • numaralar /mod warn-sil içindir" : "Numaralar /mod warn-sil içindir" })
        ],
        ephemeral: true,
        allowedMentions: { parse: [] }
      });
    }

    if (name === "warn-sil") {
      if (!hasPermission(interaction, F.ModerateMembers)) return deny(interaction, "❌ Uyarı silme yetkin yok.");
      const user = interaction.options.getUser("kullanici");
      const num = interaction.options.getInteger("numara");
      const all = interaction.options.getBoolean("hepsi");
      const list = config.warnings[user.id] || [];
      if (!list.length) return deny(interaction, "ℹ️ Bu kullanıcının uyarısı yok.");

      if (all) {
        delete config.warnings[user.id];
      } else if (num && num >= 1 && num <= list.length) {
        list.splice(num - 1, 1);
        if (!list.length) delete config.warnings[user.id];
      } else {
        return deny(interaction, "❌ Geçerli bir `numara` gir veya `hepsi:true` seç.");
      }
      saveServerConfig(interaction.guildId, config);

      await sendLog(interaction.guild, `🗑️ ${user} kullanıcısının ${all ? "tüm uyarıları" : `${num}. uyarısı`} silindi.\n**Yetkili:** ${interaction.user}`);
      return interaction.reply({ content: `🗑️ ${user.tag} için uyarı silindi.`, ephemeral: true });
    }

    if (name === "clear") {
      if (!hasPermission(interaction, F.ManageMessages)) return deny(interaction, "❌ **Mesajları Yönet** yetkin yok.");
      const miss = botLacks(interaction, F.ManageMessages, "Mesajları Yönet");
      if (miss) return deny(interaction, miss);

      const amount = clampInt(interaction.options.getInteger("miktar"), 1, 100, 1);
      await interaction.deferReply({ ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await sendLog(interaction.guild, `🧹 ${interaction.user} ${interaction.channel} kanalında **${deleted.size}** mesaj sildi.`);
      return interaction.editReply({ content: `🧹 ${deleted.size} mesaj temizlendi. (14 günden eski mesajlar silinemez)` });
    }
  } catch (error) {
    console.error(`MOD ERROR (${name}):`, error.message);
    return respond(interaction, { content: FAIL_TEXT, ephemeral: true });
  }
}

// ---------- OWNER: PARA VER ----------

async function handleParaVer(interaction) {
  // Sunucu sahibi veya Administrator yetkisi olan herkes para verebilir
  if (!isAdmin(interaction)) {
    return deny(interaction, "❌ Bu komutu sadece **sunucu sahibi** veya **Administrator** yetkisi olanlar kullanabilir.");
  }
  const target = interaction.options.getUser("kullanici");
  const amount = interaction.options.getInteger("miktar");
  if (target.bot) return deny(interaction, "❌ Botlara para verilemez.");
  if (!Number.isSafeInteger(amount) || amount < 1) return deny(interaction, "❌ Geçersiz miktar.");

  const config = getServerConfig(interaction.guildId);
  const u = ecoUser(config.economy, target.id);
  const before = u.balance;
  creditCoins(u, amount);
  const given = u.balance - before;
  if (given <= 0) return deny(interaction, "❌ Bu kullanıcı bakiye üst sınırında.");
  saveServerConfig(interaction.guildId, config);

  await sendLog(interaction.guild, `🪙 ${interaction.user} (yönetici) ${target} kullanıcısına ${coin(config, given)} verdi.`);
  return interaction.reply({
    content: `${EMOJI.ok} ${target} kullanıcısına ${coin(config, given)} verildi.\n👛 Yeni bakiye: ${coin(config, u.balance)}`,
    ephemeral: true,
    allowedMentions: { parse: [] }
  });
}

// ---------- AUTOMOD ----------

const BAD_WORDS_BASE = [
  "amk", "aq", "oç", "orospu", "piç", "siktir", "sikerim", "yarrak",
  "yarak", "amına", "amcık", "ananı", "götveren"
];
const LINK_REGEX = /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)\S+/i;
const AM_RULES = [
  { key: "spam", label: "Spam", emoji: "📨", desc: "Aynı mesajı tekrar tekrar atma" },
  { key: "flood", label: "Flood", emoji: "🌊", desc: "Çok kısa sürede çok mesaj" },
  { key: "mentions", label: "Aşırı Etiket", emoji: "📣", desc: "Çok fazla kişi/rol etiketleme" },
  { key: "links", label: "Link Filtresi", emoji: "🔗", desc: "Bağlantı ve davet linkleri" },
  { key: "badWords", label: "Küfür Filtresi", emoji: "🤬", desc: "Küfür ve yasaklı kelimeler" },
  { key: "caps", label: "Caps Spam", emoji: "🔠", desc: "BÜYÜK HARFLE yazma" }
];
const AM_PUNISH = {
  delete: { label: "Mesaj Sil", emoji: "🗑️" },
  warn: { label: "Warn", emoji: "⚠️" },
  timeout: { label: "Timeout", emoji: "⏱️" }
};

const amTrack = new Map();

function findViolation(message, am) {
  const content = message.content || "";
  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const t = amTrack.get(key) || { times: [], lastContent: "", lastAt: 0, repeats: 0, noticeAt: 0, seen: 0 };
  t.times = t.times.filter(x => now - x < 30000);
  t.times.push(now);
  t.seen = now;

  const norm = content.trim().toLowerCase();
  if (norm && norm === t.lastContent && now - t.lastAt < 15000) t.repeats++;
  else t.repeats = 1;
  t.lastContent = norm;
  t.lastAt = now;
  amTrack.set(key, t);

  if (am.flood) {
    const sec = clampInt(am.floodSec, 2, 30, 5);
    const cnt = clampInt(am.floodCount, 3, 20, 6);
    if (t.times.filter(x => now - x < sec * 1000).length >= cnt) return { reason: "Flood (çok hızlı mesaj)", t };
  }
  if (am.spam && t.repeats >= clampInt(am.spamRepeat, 2, 10, 3)) {
    return { reason: "Spam (tekrarlanan mesaj)", t };
  }
  if (am.mentions) {
    const count =
      message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    if (count >= clampInt(am.maxMentions, 2, 30, 5)) return { reason: "Aşırı etiketleme", t };
  }
  if (am.links && LINK_REGEX.test(content)) return { reason: "Link paylaşımı", t };
  if (am.badWords && content) {
    const lower = content.toLocaleLowerCase("tr");
    const tokens = new Set(lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean));
    const custom = Array.isArray(am.customWords) ? am.customWords : [];
    const hit =
      BAD_WORDS_BASE.some(w => tokens.has(w)) ||
      custom.some(w => (w.includes(" ") ? lower.includes(w) : tokens.has(w)));
    if (hit) return { reason: "Küfür / yasaklı kelime", t };
  }
  if (am.caps) {
    const letters = content.replace(/[^\p{L}]/gu, "");
    if (letters.length >= 10) {
      const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
      if ((upper / letters.length) * 100 >= clampInt(am.maxCapsPercent, 40, 100, 70)) {
        return { reason: "Caps spam", t };
      }
    }
  }
  return null;
}

async function handleAutoMod(message) {
  if (!message.guild || message.author.bot || message.webhookId || !message.member) return false;
  const config = getServerConfig(message.guild.id);
  const am = config.autoMod;
  if (!am?.enabled) return false;
  if (isModMember(message.member)) return false;

  const hit = findViolation(message, am);
  if (!hit) return false;

  const { reason, t } = hit;
  t.times = [];
  t.repeats = 0;

  const me = message.guild.members.me;
  if (me && message.channel.permissionsFor(me)?.has(F.ManageMessages)) {
    await message.delete().catch(() => {});
  }

  const punishment = AM_PUNISH[am.punishment] ? am.punishment : "delete";
  let extra = "Mesaj silindi";

  if (punishment === "warn") {
    config.warnings ??= {};
    const list = (config.warnings[message.author.id] ??= []);
    list.push({ reason: `AutoMod: ${reason}`, moderator: client.user.id, date: Date.now() });
    if (list.length > 100) list.splice(0, list.length - 100);
    saveServerConfig(message.guild.id, config);
    extra = `Uyarı verildi (toplam ${list.length})`;
  } else if (punishment === "timeout") {
    const mins = clampInt(am.timeoutMinutes, 1, 1440, 10);
    if (message.member.moderatable) {
      await message.member.timeout(mins * 60 * 1000, `AutoMod: ${reason}`).catch(() => {});
      extra = `${mins} dk timeout`;
    }
  }

  const now = Date.now();
  if (now - t.noticeAt > 10000) {
    t.noticeAt = now;
    const canSend = me && message.channel.permissionsFor(me)?.has(F.SendMessages);
    if (canSend) {
      message.channel
        .send({ content: `🤖 ${message.author}, **${reason}** kuralı nedeniyle işlem uygulandı.`, allowedMentions: { users: [message.author.id] } })
        .then(m => setTimeout(() => m.delete().catch(() => {}), 6000))
        .catch(() => {});
    }
  }

  await sendLog(
    message.guild,
    `🤖 **AutoMod** ${message.author} • ${message.channel}\n**Sebep:** ${reason}\n**İşlem:** ${extra}`
  );
  return true;
}

function automodPanel(config) {
  const am = config.autoMod;
  const lines = AM_RULES.map(r => `${am[r.key] ? "🟢" : "🔴"} ${r.emoji} **${r.label}** — ${r.desc}`);
  const punish = AM_PUNISH[am.punishment] || AM_PUNISH.delete;

  const embed = new EmbedBuilder()
    .setTitle(`🤖 ${EMOJI.dot} AutoMod Paneli`)
    .setColor(am.enabled ? 0x57f287 : 0xed4245)
    .setDescription(
      `**Durum:** ${am.enabled ? "🟢 Açık" : "🔴 Kapalı"}\n**Ceza:** ${punish.emoji} ${punish.label}\n\n${lines.join("\n")}\n\n` +
        `📌 Limitler: etiket **${am.maxMentions}** • caps **%${am.maxCapsPercent}** • flood **${am.floodCount}/${am.floodSec}sn** • timeout **${am.timeoutMinutes} dk**\n` +
        `🛡️ Yetkililer (Mesajları Yönet/Yönetici) muaftır.`
    )
    .setFooter({ text: BRAND_FOOTER });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("eb_x_am_rules")
          .setPlaceholder("Açık olacak kuralları seç")
          .setMinValues(0)
          .setMaxValues(AM_RULES.length)
          .addOptions(
            AM_RULES.map(r => ({
              label: r.label,
              description: r.desc,
              value: r.key,
              emoji: r.emoji,
              default: Boolean(am[r.key])
            }))
          )
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("eb_x_am_punish")
          .setPlaceholder("Ceza türünü seç")
          .addOptions(
            Object.entries(AM_PUNISH).map(([value, p]) => ({
              label: p.label,
              value,
              emoji: p.emoji,
              default: am.punishment === value
            }))
          )
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("eb_x_am_master")
          .setLabel(am.enabled ? "AutoMod'u Kapat" : "AutoMod'u Aç")
          .setEmoji(am.enabled ? "🔴" : "🟢")
          .setStyle(am.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
      )
    ]
  };
}

async function handleAutoModCommand(interaction) {
  if (!canManageGuild(interaction)) return deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir.");
  const config = getServerConfig(interaction.guildId);
  const am = config.autoMod;
  am.customWords ??= [];
  const sub = interaction.options.getSubcommand();

  if (sub === "panel") return interaction.reply({ ...automodPanel(config), ephemeral: true });

  if (sub === "kelime-ekle") {
    const w = interaction.options.getString("kelime").trim().toLocaleLowerCase("tr").slice(0, 40);
    if (!w) return deny(interaction, "❌ Kelime boş olamaz.");
    if (am.customWords.length >= 200) return deny(interaction, "❌ En fazla 200 özel kelime eklenebilir.");
    if (!am.customWords.includes(w)) am.customWords.push(w);
    saveServerConfig(interaction.guildId, config);
    return deny(interaction, `✅ Yasaklı kelime eklendi: ||${w}||`);
  }

  if (sub === "kelime-sil") {
    const w = interaction.options.getString("kelime").trim().toLocaleLowerCase("tr");
    const before = am.customWords.length;
    am.customWords = am.customWords.filter(x => x !== w);
    saveServerConfig(interaction.guildId, config);
    return deny(interaction, am.customWords.length < before ? "✅ Kelime silindi." : "ℹ️ Bu kelime listede yok.");
  }

  if (sub === "kelime-liste") {
    const text = am.customWords.length ? am.customWords.map(w => `||${w}||`).join(" • ") : "Özel kelime yok.";
    return deny(interaction, `📋 **Özel yasaklı kelimeler (${am.customWords.length}):**\n${text}`.slice(0, 1900));
  }

  if (sub === "limit") {
    const mention = interaction.options.getInteger("etiket");
    const caps = interaction.options.getInteger("caps");
    const flood = interaction.options.getInteger("flood");
    const tmo = interaction.options.getInteger("timeout-dk");
    if (mention) am.maxMentions = mention;
    if (caps) am.maxCapsPercent = caps;
    if (flood) am.floodCount = flood;
    if (tmo) am.timeoutMinutes = tmo;
    saveServerConfig(interaction.guildId, config);
    await sendLog(interaction.guild, `⚙️ ${interaction.user} AutoMod limitlerini güncelledi.`);
    return interaction.reply({ ...automodPanel(config), ephemeral: true });
  }
}

async function handleAutoModComponent(interaction) {
  if (!canManageGuild(interaction)) return deny(interaction, "❌ Bu panel için **Sunucuyu Yönet** yetkisi gerekir.");
  const config = getServerConfig(interaction.guildId);
  const am = config.autoMod;

  if (interaction.customId === "eb_x_am_rules") {
    for (const r of AM_RULES) am[r.key] = interaction.values.includes(r.key);
  } else if (interaction.customId === "eb_x_am_punish") {
    const v = interaction.values[0];
    if (AM_PUNISH[v]) am.punishment = v;
  } else if (interaction.customId === "eb_x_am_master") {
    am.enabled = !am.enabled;
  }
  saveServerConfig(interaction.guildId, config);
  await sendLog(interaction.guild, `⚙️ ${interaction.user} AutoMod ayarını değiştirdi.`);
  return interaction.update(automodPanel(config));
}

// ---------- ANTİ-RAID ----------

const joinTracker = new Map();
const arTrack = new Map();
const nukeTracker = new Map();
const RAID_MODE_MS = 5 * 60 * 1000;
const AR_FLAGS = {
  antiSpam: "Spam koruması",
  mentionSpam: "Mention spam koruması",
  channelDelete: "Kanal silme koruması",
  roleDelete: "Rol silme koruması",
  webhook: "Webhook koruması"
};

function antiRaidEmbed(config) {
  const ar = config.antiRaid;
  const onoff = v => (v ? "🟢 Açık" : "🔴 Kapalı");
  return new EmbedBuilder()
    .setTitle(`🛡️ ${EMOJI.dot} Anti-Raid`)
    .setColor(ar.enabled ? 0x57f287 : 0xed4245)
    .setDescription(
      `**Durum:** ${onoff(ar.enabled)}\n` +
        `👥 **Eşik:** ${ar.joinThreshold} giriş / ${ar.windowSec} sn\n` +
        `⚖️ **Ceza:** ${ar.punishment === "timeout" ? "⏱️ Timeout (10 dk)" : "👢 Kick"}\n\n` +
        Object.entries(AR_FLAGS).map(([k, l]) => `${onoff(ar[k])} ${l}`).join("\n") +
        `\n\n📌 Kanal/rol silme ve webhook korumaları için botta **Denetim Kaydını Görüntüle** yetkisi gerekir.`
    )
    .setFooter({ text: BRAND_FOOTER });
}

async function handleAntiRaidCommand(interaction) {
  if (!canManageGuild(interaction)) return deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir.");
  const config = getServerConfig(interaction.guildId);
  const ar = config.antiRaid;
  const sub = interaction.options.getSubcommand();
  let changed = null;

  if (sub === "ac") { ar.enabled = true; changed = "açıldı"; }
  else if (sub === "kapat") { ar.enabled = false; changed = "kapatıldı"; }
  else if (sub === "esik") { ar.joinThreshold = interaction.options.getInteger("sayi"); changed = `eşik ${ar.joinThreshold} yapıldı`; }
  else if (sub === "sure") { ar.windowSec = interaction.options.getInteger("saniye"); changed = `süre ${ar.windowSec} sn yapıldı`; }
  else if (sub === "ceza") { ar.punishment = interaction.options.getString("tur"); changed = `ceza ${ar.punishment} yapıldı`; }
  else if (sub === "koruma") {
    const flag = interaction.options.getString("tur");
    const on = interaction.options.getString("durum") === "ac";
    if (!(flag in AR_FLAGS)) return deny(interaction, FAIL_TEXT);
    ar[flag] = on;
    changed = `${AR_FLAGS[flag]} ${on ? "açıldı" : "kapatıldı"}`;
    if (on && (flag === "channelDelete" || flag === "roleDelete" || flag === "webhook")) {
      const me = interaction.guild.members.me;
      if (!me?.permissions.has(F.ViewAuditLog)) {
        saveServerConfig(interaction.guildId, config);
        return interaction.reply({
          content: "⚠️ Ayar kaydedildi ama botta **Denetim Kaydını Görüntüle** yetkisi yok; koruma çalışmaz.",
          embeds: [antiRaidEmbed(config)],
          ephemeral: true
        });
      }
    }
  }

  if (changed) {
    saveServerConfig(interaction.guildId, config);
    await sendLog(interaction.guild, `🛡️ ${interaction.user} Anti-Raid: ${changed}.`);
  }
  return interaction.reply({ embeds: [antiRaidEmbed(config)], ephemeral: true });
}

async function antiRaidOnJoin(member) {
  const ar = getServerConfig(member.guild.id).antiRaid;
  if (!ar?.enabled || member.user.bot) return false;

  const now = Date.now();
  const gid = member.guild.id;
  const tr = joinTracker.get(gid) || { entries: [], raidUntil: 0 };
  const windowMs = clampInt(ar.windowSec, 3, 120, 10) * 1000;
  const threshold = clampInt(ar.joinThreshold, 2, 50, 5);

  tr.entries = tr.entries.filter(e => now - e.t < windowMs);
  tr.entries.push({ id: member.id, t: now });

  let victims = [];
  if (tr.raidUntil < now && tr.entries.length >= threshold) {
    tr.raidUntil = now + RAID_MODE_MS;
    victims = tr.entries.map(e => e.id);
    await sendLog(
      member.guild,
      `🚨 **RAID ALGILANDI!** ${windowMs / 1000} sn içinde **${tr.entries.length}** giriş.\n5 dk boyunca yeni girenlere **${ar.punishment === "timeout" ? "timeout" : "kick"}** uygulanacak.`
    );
  } else if (tr.raidUntil > now) {
    victims = [member.id];
  }
  joinTracker.set(gid, tr);

  let kicked = false;
  for (const id of victims) {
    const m = member.guild.members.cache.get(id) || (id === member.id ? member : null);
    if (!m) continue;
    try {
      if (ar.punishment === "timeout") {
        if (m.moderatable) await m.timeout(10 * 60 * 1000, "Anti-Raid");
      } else if (m.kickable) {
        await m.kick("Anti-Raid");
        if (id === member.id) kicked = true;
      }
    } catch (error) {
      console.error("ANTIRAID PUNISH ERROR:", error.message);
    }
  }
  return kicked;
}

async function handleAntiRaidMessage(message) {
  if (!message.guild || message.author.bot || message.webhookId || !message.member) return false;
  const ar = getServerConfig(message.guild.id).antiRaid;
  if (!ar?.enabled || (!ar.antiSpam && !ar.mentionSpam)) return false;
  if (isModMember(message.member)) return false;

  const now = Date.now();
  let reason = null;

  if (ar.mentionSpam) {
    const count = message.mentions.users.size + message.mentions.roles.size;
    const everyone = message.mentions.everyone && !message.member.permissions.has(F.MentionEveryone);
    if (count >= 8 || everyone) reason = "Mention spam";
  }

  if (!reason && ar.antiSpam) {
    const key = `${message.guild.id}:${message.author.id}`;
    const list = (arTrack.get(key) || []).filter(x => now - x < 4000);
    list.push(now);
    arTrack.set(key, list);
    if (list.length >= 6) reason = "Spam";
  }
  if (!reason) return false;

  const me = message.guild.members.me;
  if (me && message.channel.permissionsFor(me)?.has(F.ManageMessages)) await message.delete().catch(() => {});
  if (message.member.moderatable) await message.member.timeout(10 * 60 * 1000, `Anti-Raid: ${reason}`).catch(() => {});
  arTrack.delete(`${message.guild.id}:${message.author.id}`);
  await sendLog(message.guild, `🛡️ **Anti-Raid** ${message.author} — ${reason}. 10 dk timeout uygulandı.`);
  return true;
}

async function stripDangerous(guild, executorId, why) {
  const me = guild.members.me;
  const exec = await guild.members.fetch(executorId).catch(() => null);
  if (!me || !exec) return "Üye bulunamadı";

  if (exec.user.bot && exec.kickable) {
    await exec.kick(`Anti-Raid: ${why}`).catch(() => {});
    return "Bot sunucudan atıldı";
  }
  const danger = [F.Administrator, F.ManageChannels, F.ManageRoles, F.ManageWebhooks, F.ManageGuild, F.BanMembers, F.KickMembers];
  const roles = exec.roles.cache.filter(
    r => r.id !== guild.id && !r.managed && r.position < me.roles.highest.position && danger.some(p => r.permissions.has(p))
  );
  if (!roles.size) return "Alınabilecek yetkili rol bulunamadı";
  await exec.roles.remove(roles, `Anti-Raid: ${why}`).catch(() => {});
  return `${roles.size} yetkili rol alındı`;
}

async function guardDestructive(guild, auditType, flag, label, targetId) {
  const ar = getServerConfig(guild.id).antiRaid;
  if (!ar?.enabled || !ar[flag]) return;
  const me = guild.members.me;
  if (!me?.permissions.has(F.ViewAuditLog)) return;

  const logs = await guild.fetchAuditLogs({ type: auditType, limit: 5 }).catch(() => null);
  const entry = logs?.entries.find(e => e.target?.id === targetId && Date.now() - e.createdTimestamp < 15000);
  const executor = entry?.executor;
  if (!executor || executor.id === client.user.id || executor.id === guild.ownerId) return;

  const key = `${guild.id}:${flag}:${executor.id}`;
  const now = Date.now();
  const list = (nukeTracker.get(key) || []).filter(x => now - x < 30000);
  list.push(now);
  nukeTracker.set(key, list);
  if (list.length < 3) return;

  nukeTracker.delete(key);
  const result = await stripDangerous(guild, executor.id, `${label} silme`);
  await sendLog(guild, `🚨 **Anti-Raid** <@${executor.id}> 30 sn içinde 3+ ${label} sildi.\n**İşlem:** ${result}`);
}

client.on("channelDelete", channel => {
  if (!channel.guild) return;
  guardDestructive(channel.guild, AuditLogEvent.ChannelDelete, "channelDelete", "kanal", channel.id)
    .catch(e => console.error("CHANNEL GUARD ERROR:", e.message));
});
client.on("roleDelete", role => {
  guardDestructive(role.guild, AuditLogEvent.RoleDelete, "roleDelete", "rol", role.id)
    .catch(e => console.error("ROLE GUARD ERROR:", e.message));
});
client.on("webhooksUpdate", async channel => {
  try {
    const guild = channel.guild;
    const ar = getServerConfig(guild.id).antiRaid;
    if (!ar?.enabled || !ar.webhook) return;
    const me = guild.members.me;
    if (!me?.permissions.has([F.ViewAuditLog, F.ManageWebhooks])) return;

    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 3 }).catch(() => null);
    const entry = logs?.entries.find(e => Date.now() - e.createdTimestamp < 10000);
    const executor = entry?.executor;
    if (!executor || executor.id === client.user.id || executor.id === guild.ownerId) return;

    const hooks = await channel.fetchWebhooks().catch(() => null);
    const hook = hooks?.get(entry.target?.id);
    if (hook) await hook.delete("Anti-Raid: izinsiz webhook").catch(() => {});
    await sendLog(guild, `🚨 **Anti-Raid** <@${executor.id}> ${channel} kanalında webhook oluşturdu${hook ? " ve silindi" : ""}.`);
  } catch (error) {
    console.error("WEBHOOK GUARD ERROR:", error.message);
  }
});

// ---------- AI - GELISTIRILMIS SISTEM ----------

const aiCooldowns = new Map();
const aiRequestLocks = new Map();
const AI_SYSTEM_PROMPT =
  "Sen Endless Builder adlı Discord botunun sunucu yardımcısısın. Her zaman Türkçe, kısa (en fazla 6 cümle), " +
  "anlaşılır ve güvenli cevap ver. Zararlı, yasa dışı, nefret içeren veya kişisel veri isteyen taleplere yardım etme, " +
  "nazikçe reddet. Kendini bot olarak tanıt, @everyone/@here yazma. Sunucu bağlamı verilirse onu kullan ama gereksiz özel bilgiyi ifşa etme.";

async function askAI(question, options = {}) {
  const key = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const isGroq = key.startsWith("gsk_");
  const model = process.env.AI_MODEL || (isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini");
  const url = process.env.AI_API_URL || (isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions");
  let q = String(question || "").trim();
  if (!q) throw new Error("EMPTY_QUESTION");
  if (q.length > 4000) q = q.slice(0, 4000) + "... [kisaltildi]";
  let systemPrompt = AI_SYSTEM_PROMPT;
  if (options.serverContext) {
    const ctx = String(options.serverContext).slice(0, 3000);
    systemPrompt += "\n\nSunucu Baglami (gizli tut, sadece gerektiginde kullan):\n" + ctx;
  }
  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 25000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(Number(process.env.AI_MAX_TOKENS) || 600, 2000),
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: q }
        ]
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("RATE_LIMIT");
      if (res.status === 401 || res.status === 403) throw new Error("INVALID_KEY");
      if (res.status >= 500) throw new Error("API_SERVER_ERROR");
      throw new Error(`AI_HTTP_${res.status}: ${errText.slice(0, 300)}`);
    }
    const data = await res.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("AI_EMPTY");
    return text.replace(/@(everyone|here)/gi, "@\u200b$1").slice(0, 1900);
  } catch (e) {
    if (e.name === "AbortError") throw new Error("TIMEOUT");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function aiCooldownLeft(key, ms) {
  const now = Date.now();
  const left = (aiCooldowns.get(key) || 0) + ms - now;
  if (left > 0) return left;
  aiCooldowns.set(key, now);
  return 0;
}

function getServerStructureForAI(guild) {
  try {
    const categories = [];
    const channels = guild.channels.cache;
    for (const ch of channels.values()) {
      if (ch.type === 4) {
        categories.push({ id: ch.id, name: ch.name });
      }
    }
    const textChannels = [];
    const voiceChannels = [];
    const roles = guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ name: r.name })).slice(0, 30);
    for (const ch of channels.values()) {
      if (ch.type === 0 || ch.type === 5) textChannels.push({ name: ch.name, parent: ch.parent?.name || "Yok" });
      if (ch.type === 2) voiceChannels.push({ name: ch.name, parent: ch.parent?.name || "Yok" });
    }
    return `Sunucu: ${guild.name} (${guild.memberCount} uye)\nKategoriler: ${categories.map(c=>c.name).join(", ") || "Yok"}\nYazi Kanallari: ${textChannels.map(c=>c.name).slice(0,30).join(", ")}\nSes Kanallari: ${voiceChannels.map(c=>c.name).slice(0,20).join(", ")}\nRoller: ${roles.map(r=>r.name).slice(0,20).join(", ")}\nBoost: ${guild.premiumTier}`;
  } catch {
    return `Sunucu: ${guild?.name || "Bilinmiyor"}`;
  }
}

async function handleAiCommand(interaction) {
  const config = getServerConfig(interaction.guildId);
  if (interaction.commandName === "ai-kanal") {
    if (!canManageGuild(interaction)) return deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir.");
    const channel = interaction.options.getChannel("kanal");
    if (!channel) {
      config.ai.channelId = null;
      saveServerConfig(interaction.guildId, config);
      await sendLog(interaction.guild, `🤖 ${interaction.user} AI kanalını kaldırdı.`);
      return deny(interaction, "✅ AI kanalı kaldırıldı.");
    }
    config.ai.channelId = channel.id;
    config.ai.enabled = true;
    saveServerConfig(interaction.guildId, config);
    await sendLog(interaction.guild, `🤖 ${interaction.user} AI kanalını ${channel} olarak ayarladı.`);
    return deny(interaction, `✅ AI artık ${channel} kanalında otomatik cevap verecek.`);
  }
  const apiKeyExists = !!(process.env.AI_API_KEY || process.env.GROQ_API_KEY);
  if (!apiKeyExists) {
    return deny(interaction, "❌ AI API anahtarı yapılandırılmamış. Lütfen `AI_API_KEY` env değişkenini ayarlayın.");
  }
  const wait = aiCooldownLeft(`cmd:${interaction.guildId}:${interaction.user.id}`, 8000);
  if (wait) return deny(interaction, `⏳ ${Math.ceil(wait / 1000)} sn sonra tekrar sor.`);
  if (aiRequestLocks.has(interaction.user.id)) {
    return deny(interaction, "⏳ Zaten bir isteğin işleniyor, lütfen bekle.");
  }
  aiRequestLocks.set(interaction.user.id, Date.now());
  const question = interaction.options.getString("soru")?.trim();
  if (!question) {
    aiRequestLocks.delete(interaction.user.id);
    return deny(interaction, "❌ Soru boş olamaz.");
  }
  if (question.length > 2000) {
    aiRequestLocks.delete(interaction.user.id);
    return deny(interaction, "❌ Soru çok uzun (max 2000 karakter).");
  }
  await interaction.deferReply();
  try {
    const serverCtx = getServerStructureForAI(interaction.guild);
    const answer = await askAI(question, { serverContext: serverCtx });
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🤖 ${EMOJI.dot} Endless AI`)
          .setColor(0x5865f2)
          .addFields({ name: "❓ Soru", value: question.slice(0, 1000) })
          .setDescription(answer)
          .setFooter({ text: BRAND_FOOTER })
      ],
      allowedMentions: { parse: [] }
    });
  } catch (error) {
    console.error("AI ERROR:", error.message);
    let msg = "❌ AI şu an cevap veremiyor, biraz sonra tekrar dene.";
    if (error.message === "NO_KEY") msg = "❌ AI API anahtarı bulunamadı. `process.env.AI_API_KEY` ayarlanmalı.";
    else if (error.message === "RATE_LIMIT") msg = "⏳ AI yoğun, lütfen biraz sonra tekrar dene.";
    else if (error.message === "INVALID_KEY") msg = "❌ AI API anahtarı geçersiz.";
    else if (error.message === "TIMEOUT") msg = "⏳ AI zaman aşımına uğradı, tekrar dene.";
    else if (error.message === "API_SERVER_ERROR") msg = "❌ AI sunucusu hatalı, daha sonra dene.";
    return interaction.editReply({ content: msg });
  } finally {
    aiRequestLocks.delete(interaction.user.id);
  }
}

async function handleAiChannelMessage(message) {
  if (!message.guild || message.author.bot || message.webhookId) return false;
  const config = getServerConfig(message.guild.id);
  const ai = config.ai;
  if (!ai?.enabled || !ai.channelId || ai.channelId !== message.channelId) return false;
  const apiKeyExists = !!(process.env.AI_API_KEY || process.env.GROQ_API_KEY);
  if (!apiKeyExists) return false;
  const text = (message.content || "").trim();
  if (text.length < 2 || text.length > 2000) return false;
  if (aiCooldownLeft(`ch:${message.guild.id}:${message.author.id}`, 6000)) return true;
  const me = message.guild.members.me;
  if (!me || !message.channel.permissionsFor(me)?.has([F.SendMessages, F.ViewChannel])) return true;
  if (aiRequestLocks.has(message.author.id)) return true;
  aiRequestLocks.set(message.author.id, Date.now());
  try {
    await message.channel.sendTyping().catch(() => {});
    const serverCtx = getServerStructureForAI(message.guild);
    const answer = await askAI(text, { serverContext: serverCtx });
    await message.reply({ content: answer, allowedMentions: { parse: [], repliedUser: false } });
  } catch (error) {
    console.error("AI CHANNEL ERROR:", error.message);
    let msg = "❌ AI şu an cevap veremiyor.";
    if (error.message === "NO_KEY") msg = "❌ AI yapılandırılmamış.";
    else if (error.message === "RATE_LIMIT") msg = "⏳ Çok hızlısın, biraz bekle.";
    else if (error.message === "TIMEOUT") msg = "⏳ Zaman aşımı, tekrar dene.";
    await message.reply({ content: msg, allowedMentions: { parse: [] } }).catch(() => {});
  } finally {
    aiRequestLocks.delete(message.author.id);
  }
  return true;
}

// ---------- EKSIK SISTEMI (ANALIZ + KURULUM) ----------

const eksikAnalyses = new Map();

function detectNamingStyle(guild) {
  const chNames = [...guild.channels.cache.values()].map(c=>c.name);
  const hasEmoji = chNames.some(n => /[\u{1F300}-\u{1FAFF}]/u.test(n) || n.includes("・") || n.includes("┃"));
  const turkish = chNames.join(" ").toLowerCase();
  const usesTurkish = /[çğıöşü]/.test(turkish) || /hosgeldin|kurallar|sohbet/.test(turkish);
  return { hasEmoji, usesTurkish };
}

function normalizeNameForCompare(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9çğıöşü]/gi, "").trim();
}

function channelExists(guild, targetNames) {
  const existing = [...guild.channels.cache.values()].map(c => normalizeNameForCompare(c.name));
  const targets = Array.isArray(targetNames) ? targetNames : [targetNames];
  for (const t of targets) {
    const nt = normalizeNameForCompare(t);
    if (existing.some(e => e.includes(nt) || nt.includes(e) || e === nt)) return true;
  }
  return false;
}

function analyzeServerType(guild) {
  const all = [...guild.channels.cache.values()].map(c=>c.name.toLowerCase()).join(" ");
  const roles = [...guild.roles.cache.values()].map(r=>r.name.toLowerCase()).join(" ");
  const name = guild.name.toLowerCase();
  const combined = all + " " + roles + " " + name;
  const scores = { public:0, streamer:0, gaming:0, community:0, shop:0, education:0, clan:0 };
  if (/sohbet|chat|public|genel|topluluk|community/.test(combined)) { scores.public+=2; scores.community+=1; }
  if (/oyun|game|gaming|valorant|lol|minecraft|oyuncu-arama/.test(combined)) scores.gaming+=3;
  if (/yayin|streamer|twitch|youtube|kik|tiktok|clip|klip/.test(combined)) scores.streamer+=3;
  if (/sohbet|medya|mizah|öneri|meme|foto/.test(combined)) scores.community+=2;
  if (/magaza|shop|urun|siparis|satis|fiyat/.test(combined)) scores.shop+=3;
  if (/ders|egitim|education|ödev|matematik|okul/.test(combined)) scores.education+=3;
  if (/takim|clan|team|espor|kadro|maç/.test(combined)) scores.clan+=3;
  if (guild.memberCount > 300) scores.public+=1;
  const sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]).filter(([,v])=>v>0);
  const primary = sorted.slice(0,2).map(([k])=>k);
  if (primary.length===0) primary.push("community");
  return { scores, types: primary, allScores: scores };
}

const MISSING_TEMPLATES = {
  info: { label: "Bilgi Alani", keys: ["kurallar","duyurular","bilgilendirme"], channels: [{ name:"kurallar", type:"text", aliases:["rules","kural"] },{ name:"duyurular", type:"text", aliases:["announcements","duyuru","announce"] },{ name:"bilgilendirme", type:"text", aliases:["info","bilgi"] }], priority:"yüksek" },
  welcome: { label: "Karsilama", keys:["hosgeldin"], channels: [{ name:"hoşgeldin", type:"text", aliases:["welcome","giris","hos-geldin"] }], priority:"orta" },
  log: { label:"Log Sistemi", keys:["log"], channels: [{ name:"log", type:"text", aliases:["logs","mod-log"] },{ name:"ceza-log", type:"text" },{ name:"bot-log", type:"text" }], priority:"yüksek" },
  ticket: { label:"Ticket", keys:["ticket"], channels: [{ name:"ticket", type:"text", aliases:["destek-ticket","bilet"] }], priority:"yüksek" },
  registration: { label:"Kayit", keys:["kayit"], channels: [{ name:"kayıt", type:"text", aliases:["register","kayit"] },{ name:"kayıt-bilgi", type:"text" },{ name:"rol-seçim", type:"text" }], priority:"orta" },
  community: { label:"Topluluk", keys:["sohbet","medya"], channels: [{ name:"sohbet", type:"text", aliases:["chat","genel","general"] },{ name:"medya", type:"text", aliases:["media","gorsel"] },{ name:"öneriler", type:"text", aliases:["oneri","suggest"] },{ name:"bot-komutları", type:"text", aliases:["bot-komut"] }], priority:"orta" },
  voice_general: { label:"Ses", keys:["ses"], channels: [{ name:"Genel", type:"voice" },{ name:"Sohbet 1", type:"voice" },{ name:"Müzik", type:"voice", aliases:["music"] },{ name:"AFK", type:"voice" }], priority:"orta" },
  gaming: { label:"Oyun", keys:["oyun"], channels: [{ name:"oyun-sohbet", type:"text", aliases:["oyun"] },{ name:"oyuncu-arama", type:"text" },{ name:"etkinlikler", type:"text" },{ name:"Oyun Odasi", type:"voice" }], priority:"orta" },
  streamer: { label:"Streamer", keys:["streamer","yayin"], channels: [{ name:"yayın-duyuruları", type:"text", aliases:["yayin-duyuru"] },{ name:"yayıncı-sohbet", type:"text" },{ name:"klipler", type:"text" },{ name:"Yayın Odası", type:"voice" }], priority:"düşük" },
  fun: { label:"Eglence", keys:["eglence"], channels: [{ name:"mizah", type:"text", aliases:["meme","komik"] },{ name:"fotoğraf", type:"text" },{ name:"çekilişler", type:"text", aliases:["giveaway","cekilis"] }], priority:"düşük" },
  support: { label:"Destek", keys:["destek"], channels: [{ name:"destek", type:"text" },{ name:"yardım", type:"text" },{ name:"sık-sorulanlar", type:"text" }], priority:"yüksek" },
  management: { label:"Yönetim", keys:["yonetim"], channels: [{ name:"yetkili", type:"text", aliases:["yetkili-sohbet","admin"] }], priority:"orta" },
};

function buildEksikAnalysis(guild) {
  const typeInfo = analyzeServerType(guild);
  const naming = detectNamingStyle(guild);
  const missing = [];
  const existing = [];
  for (const [id, tmpl] of Object.entries(MISSING_TEMPLATES)) {
    const absentChannels = [];
    for (const ch of tmpl.channels) {
      const aliases = [ch.name, ...(ch.aliases||[])];
      if (!channelExists(guild, aliases)) absentChannels.push(ch);
    }
    if (absentChannels.length>0) missing.push({ id, label: tmpl.label, priority: tmpl.priority, channels: absentChannels });
    else existing.push(tmpl.label);
  }
  const priorityOrder = { "yüksek":0, "orta":1, "düşük":2 };
  missing.sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]);
  return { typeInfo, naming, missing, existing, guildName: guild.name, memberCount: guild.memberCount, at: Date.now() };
}

function smartChannelName(baseName, style, serverTypes) {
  const emojiMap = {
    "kurallar":"📜","duyurular":"📢","bilgilendirme":"📋","hoşgeldin":"👋","sohbet":"💬","medya":"🎨","öneriler":"💡","bot-komutları":"🤖","mizah":"😂","fotoğraf":"📸","çekilişler":"🎁","oyun-sohbet":"🎮","oyuncu-arama":"🔎","etkinlikler":"🏆","yayın-duyuruları":"📢","yayıncı-sohbet":"🎥","klipler":"🎞️","destek":"📩","yardım":"❓","ticket":"🎫","yetkili":"🔒","log":"📋","ceza-log":"🚨","bot-log":"🤖","Genel":"🔊","Sohbet 1":"🔊","Müzik":"🎵","Oyun Odasi":"🎮","Yayın Odası":"🎥","AFK":"💤","kayıt":"📝","kayıt-bilgi":"📋","rol-seçim":"🎭"
  };
  // Streamer için özel prefix
  if (serverTypes.includes("streamer") && baseName.includes("yayın")) {
    // streamer style
  }
  if (style.hasEmoji && emojiMap[baseName]) return `${emojiMap[baseName]}・${baseName}`;
  return baseName;
}




// ---------- AYARLAR PANELİ ----------


const SETTINGS = [
  { key: "ticket", label: "Ticket", emoji: "🎫", get: c => c.toggles.ticket, set: (c, v) => (c.toggles.ticket = v) },
  { key: "registration", label: "Kayıt", emoji: "📝", get: c => c.toggles.registration, set: (c, v) => (c.toggles.registration = v) },
  {
    key: "welcome", label: "Welcome", emoji: "👋", get: c => c.welcome.enabled,
    set: (c, v) => (c.welcome.enabled = v),
    need: c => (c.welcome.channelId ? null : "Önce `/yonetim hosgeldin` ile kanal seç")
  },
  { key: "streamer", label: "Streamer", emoji: "🎥", get: c => c.toggles.streamer, set: (c, v) => (c.toggles.streamer = v) },
  { key: "rolePanel", label: "Rol sistemi", emoji: "🎭", get: c => c.toggles.rolePanel, set: (c, v) => (c.toggles.rolePanel = v) },
  {
    key: "stats", label: "İstatistik", emoji: "📊", get: c => c.stats.enabled,
    set: (c, v) => (c.stats.enabled = v),
    need: c => (c.stats.categoryId ? null : "Önce `/yonetim istatistik-kur` çalıştır")
  },
  { key: "level", label: "Level", emoji: "⭐", get: c => c.levelSystem.enabled, set: (c, v) => (c.levelSystem.enabled = v) },
  { key: "economy", label: "Ekonomi", emoji: "💰", get: c => c.economy.enabled, set: (c, v) => (c.economy.enabled = v) },
  { key: "giveaways", label: "Çekiliş", emoji: "🎁", get: c => c.giveaways.enabled, set: (c, v) => (c.giveaways.enabled = v) },
  { key: "ai", label: "AI", emoji: "🤖", get: c => c.ai.enabled, set: (c, v) => (c.ai.enabled = v) },
  { key: "antiRaid", label: "Anti-Raid", emoji: "🛡️", get: c => c.antiRaid.enabled, set: (c, v) => (c.antiRaid.enabled = v) },
  { key: "autoMod", label: "AutoMod", emoji: "🚫", get: c => c.autoMod.enabled, set: (c, v) => (c.autoMod.enabled = v) }
];

function settingsPanel(config, note) {
  ensureExtraConfig(config);
  const lines = SETTINGS.map(s => `${s.get(config) ? "🟢" : "🔴"} ${s.emoji} **${s.label}**`);
  const embed = new EmbedBuilder()
    .setTitle(`⚙️ ${EMOJI.dot} Ayarlar Paneli`)
    .setColor(0x5865f2)
    .setDescription(
      `Aşağıdaki menüden **açık olmasını istediğin** sistemleri seç.\nSeçili olmayanlar kapanır.\n\n${lines.join("\n")}` +
        (note ? `\n\n${note}` : "")
    )
    .setFooter({ text: BRAND_FOOTER });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("eb_x_settings")
          .setPlaceholder("Açık sistemleri seç")
          .setMinValues(0)
          .setMaxValues(SETTINGS.length)
          .addOptions(
            SETTINGS.map(s => ({
              label: s.label,
              value: s.key,
              emoji: s.emoji,
              default: Boolean(s.get(config))
            }))
          )
      )
    ]
  };
}

async function handleSettingsSelect(interaction) {
  if (!canManageGuild(interaction)) return deny(interaction, "❌ Bu panel için **Sunucuyu Yönet** yetkisi gerekir.");
  const config = ensureExtraConfig(getServerConfig(interaction.guildId));
  const chosen = new Set(interaction.values);
  const notes = [];
  const changes = [];

  for (const s of SETTINGS) {
    const want = chosen.has(s.key);
    if (s.get(config) === want) continue;
    if (want && s.need) {
      const problem = s.need(config);
      if (problem) { notes.push(`⚠️ ${s.emoji} ${s.label}: ${problem}`); continue; }
    }
    s.set(config, want);
    changes.push(`${s.emoji} ${s.label} ${want ? "açıldı" : "kapatıldı"}`);
  }

  saveServerConfig(interaction.guildId, config);
  if (changes.length) await sendLog(interaction.guild, `⚙️ **Ayar değişikliği** — ${interaction.user}\n${changes.join("\n")}`);
  return interaction.update(settingsPanel(config, notes.join("\n")));
}

// ---------- YARDIM ----------

const HELP_CATEGORIES = [
  { key: "builder", label: "Builder & Yönetim", emoji: "🛠️", cmds: ["setup", "kurulum", "yonetim"] },
  { key: "ticket", label: "Ticket", emoji: "🎫", cmds: ["ticket"] },
  { key: "mod", label: "Moderasyon", emoji: "🛡️", cmds: ["mod"] },
  { key: "roller", label: "Kayıt & Streamer", emoji: "🎭", cmds: ["kayit", "streamer"] },
  { key: "level", label: "Level", emoji: "⭐", cmds: ["level"] },
  { key: "ekonomi", label: "Ekonomi", emoji: "💰", cmds: ["ekonomi", "magaza"] },
  { key: "cekilis", label: "Çekiliş", emoji: "🎁", cmds: ["cekilis"] },
  { key: "ai", label: "AI", emoji: "🤖", cmds: ["ai"] },
  { key: "guvenlik", label: "Güvenlik", emoji: "🔐", cmds: ["antiraid", "automod"] },
  { key: "ayarlar", label: "Ayarlar", emoji: "⚙️", cmds: ["ayarlar", "premium", "yardim"] },
  { key: "araclar", label: "Araçlar", emoji: "🧰", cmds: ["arac", "ozel-oda-kur"] },
  { key: "eglence", label: "Eğlence", emoji: "🎉", cmds: ["eglence"] },
  { key: "muzik", label: "Müzik", emoji: "🎵", cmds: ["muzik"] },
  { key: "extra", label: "Ekstra", emoji: "✨", cmds: ["starboard", "davet", "sayma", "itiraf", "kanal", "oneri", "ima"] }
];

function helpMenuRow(selected) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("eb_x_help")
      .setPlaceholder("Bir kategori seç")
      .addOptions(
        HELP_CATEGORIES.map(c => ({ label: c.label, value: c.key, emoji: c.emoji, default: c.key === selected }))
      )
  );
}

function helpHome() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`✦ ${EMOJI.dot} Endless Builder Yardım`)
        .setColor(0x5865f2)
        .setDescription(
          "Sunucunu kur, yönet, eğlendir — hepsi tek botta.\n\n" +
            HELP_CATEGORIES.map(c => `${c.emoji} **${c.label}**`).join(" • ") +
            "\n\n👇 Komutları görmek için menüden kategori seç."
        )
        .setFooter({ text: BRAND_FOOTER })
    ],
    components: [helpMenuRow(null)],
    ephemeral: true
  };
}

function helpCategory(key) {
  const cat = HELP_CATEGORIES.find(c => c.key === key) || HELP_CATEGORIES[0];
  const payload = buildSlashPayload();
  const lines = [];
  for (const n of cat.cmds) {
    const c = payload.find(x => x.name === n);
    if (!c) continue;
    const subs = (c.options || []).filter(o => o.type === 1 || o.type === 2);
    if (!subs.length) { lines.push(`**/${c.name}** — ${c.description}`); continue; }
    for (const s of subs) {
      if (s.type === 2) {
        for (const t of (s.options || []).filter(o => o.type === 1)) lines.push(`**/${c.name} ${s.name} ${t.name}** — ${t.description}`);
      } else {
        lines.push(`**/${c.name} ${s.name}** — ${s.description}`);
      }
    }
  }
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`${cat.emoji} ${EMOJI.dot} ${cat.label} Komutları`)
        .setColor(0x5865f2)
        .setDescription(lines.join("\n").slice(0, 4000) || "Komut bulunamadı.")
        .setFooter({ text: BRAND_FOOTER })
    ],
    components: [helpMenuRow(cat.key)]
  };
}

// ---------- ANA YÖNLENDİRİCİ ----------

commands.push(
  new SlashCommandBuilder()
    .setName("unban").setDescription("Kullanıcının banını kaldır")
    .setDefaultMemberPermissions(F.BanMembers).setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Banı kaldırılacak kullanıcı").setRequired(true))
    .addStringOption(o => o.setName("sebep").setDescription("Sebep").setMaxLength(300)),
  new SlashCommandBuilder()
    .setName("mute").setDescription("Kullanıcıyı sustur (zaman aşımı)")
    .setDefaultMemberPermissions(F.ModerateMembers).setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Susturulacak kullanıcı").setRequired(true))
    .addIntegerOption(o => o.setName("dakika").setDescription("Süre (dakika, en fazla 40320)").setMinValue(1).setMaxValue(MAX_TIMEOUT_MIN).setRequired(true))
    .addStringOption(o => o.setName("sebep").setDescription("Sebep").setMaxLength(300)),
  new SlashCommandBuilder()
    .setName("unmute").setDescription("Kullanıcının susturmasını kaldır")
    .setDefaultMemberPermissions(F.ModerateMembers).setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Susturması kalkacak kullanıcı").setRequired(true)),
  new SlashCommandBuilder()
    .setName("warnings").setDescription("Kullanıcının uyarılarını göster")
    .setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Uyarıları görülecek kullanıcı")),
  new SlashCommandBuilder()
    .setName("warn-sil").setDescription("Kullanıcının uyarısını sil")
    .setDefaultMemberPermissions(F.ModerateMembers).setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı").setRequired(true))
    .addIntegerOption(o => o.setName("numara").setDescription("Silinecek uyarı numarası").setMinValue(1))
    .addBooleanOption(o => o.setName("hepsi").setDescription("Tüm uyarıları sil")),
  new SlashCommandBuilder()
    .setName("para-ver").setDescription("Yönetici: bir kullanıcıya Endless Coin ver (bakiye düşmez)")
    .setDefaultMemberPermissions(F.Administrator).setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Para verilecek kullanıcı (kendin de olabilir)").setRequired(true))
    .addIntegerOption(o => o.setName("miktar").setDescription("Verilecek miktar").setMinValue(1).setMaxValue(MAX_BALANCE).setRequired(true)),
  new SlashCommandBuilder()
    .setName("antiraid").setDescription("Anti-Raid güvenlik ayarları")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
    .addSubcommand(s => s.setName("durum").setDescription("Mevcut ayarları göster"))
    .addSubcommand(s => s.setName("ac").setDescription("Anti-Raid'i aç"))
    .addSubcommand(s => s.setName("kapat").setDescription("Anti-Raid'i kapat"))
    .addSubcommand(s => s.setName("esik").setDescription("Raid eşiği: kaç giriş")
      .addIntegerOption(o => o.setName("sayi").setDescription("Giriş sayısı (2-50)").setMinValue(2).setMaxValue(50).setRequired(true)))
    .addSubcommand(s => s.setName("sure").setDescription("Raid süre penceresi (saniye)")
      .addIntegerOption(o => o.setName("saniye").setDescription("Saniye (3-120)").setMinValue(3).setMaxValue(120).setRequired(true)))
    .addSubcommand(s => s.setName("ceza").setDescription("Raid'de girenlere uygulanacak ceza")
      .addStringOption(o => o.setName("tur").setDescription("Ceza").setRequired(true)
        .addChoices({ name: "Kick", value: "kick" }, { name: "Timeout (10 dk)", value: "timeout" })))
    .addSubcommand(s => s.setName("koruma").setDescription("Ek korumaları aç/kapat")
      .addStringOption(o => o.setName("tur").setDescription("Koruma").setRequired(true)
        .addChoices(
          { name: "Spam koruması", value: "antiSpam" },
          { name: "Mention spam", value: "mentionSpam" },
          { name: "Kanal silme koruması", value: "channelDelete" },
          { name: "Rol silme koruması", value: "roleDelete" },
          { name: "Webhook koruması", value: "webhook" }))
      .addStringOption(o => o.setName("durum").setDescription("Durum").setRequired(true)
        .addChoices({ name: "Aç", value: "ac" }, { name: "Kapat", value: "kapat" }))),
  new SlashCommandBuilder()
    .setName("automod").setDescription("AutoMod ayarları")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
    .addSubcommand(s => s.setName("panel").setDescription("AutoMod panelini aç"))
    .addSubcommand(s => s.setName("kelime-ekle").setDescription("Yasaklı kelime ekle")
      .addStringOption(o => o.setName("kelime").setDescription("Kelime veya ifade").setMaxLength(40).setRequired(true)))
    .addSubcommand(s => s.setName("kelime-sil").setDescription("Yasaklı kelime sil")
      .addStringOption(o => o.setName("kelime").setDescription("Kelime").setMaxLength(40).setRequired(true)))
    .addSubcommand(s => s.setName("kelime-liste").setDescription("Özel yasaklı kelimeleri listele"))
    .addSubcommand(s => s.setName("limit").setDescription("AutoMod limitlerini ayarla")
      .addIntegerOption(o => o.setName("etiket").setDescription("Etiket limiti (2-30)").setMinValue(2).setMaxValue(30))
      .addIntegerOption(o => o.setName("caps").setDescription("Caps yüzdesi (40-100)").setMinValue(40).setMaxValue(100))
      .addIntegerOption(o => o.setName("flood").setDescription("Flood mesaj sayısı (3-20)").setMinValue(3).setMaxValue(20))
      .addIntegerOption(o => o.setName("timeout-dk").setDescription("Timeout süresi (1-1440 dk)").setMinValue(1).setMaxValue(1440))),
  new SlashCommandBuilder()
    .setName("ai").setDescription("Endless AI'a soru sor")
    .setDMPermission(false)
    .addStringOption(o => o.setName("soru").setDescription("Sorun").setMaxLength(1000).setRequired(true)),
  new SlashCommandBuilder()
    .setName("ai-kanal").setDescription("AI'ın otomatik cevap vereceği kanalı ayarla (boş = kapat)")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
    .addChannelOption(o => o.setName("kanal").setDescription("AI kanalı").addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder()
    .setName("ayarlar").setDescription("Tüm sistemleri tek panelden aç/kapat")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false),
  new SlashCommandBuilder()
    .setName("yardım").setDescription("Komut yardım menüsü").setDMPermission(false),
  new SlashCommandBuilder()
    .setName("premium").setDescription("Premium durumu ve plan limitleri").setDMPermission(false)
);

// ======================================================
// AŞAMA 17: STREAMER+ / PUBLIC / +18 KURULUM SİSTEMİ
// ======================================================
// Komutlar: /kurulum streamer, /kurulum streamer-18, /kurulum public, /kurulum public-18,
//           /streamer basvuru-panel, /streamer basvuru-ayarla, /streamer yas-panel, /kurulum sil
// customId'ler: eb_sp_* (mevcut sistemlerle çakışmaz)

const SP_PF = PermissionsBitField.Flags;
const SP_BUILDING = new Set();
const SP_ADULT_ROLE_NAME = "🔞 18+";
const spSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// t: [emoji, isim, bayraklar]  |  bayraklar: ro=salt okunur, st="only"|"post", apply, applog, log, rules
const SP_PRESETS = {
  streamer: {
    label: "Streamer", emoji: "🎥",
    categories: [
      { name: "BİLGİ", emoji: "📌", texts: [
        ["📜", "kurallar", { ro: 1, rules: 1 }], ["📢", "duyurular", { ro: 1 }], ["ℹ️", "bilgilendirme", { ro: 1 }]
      ] },
      { name: "STREAMER", emoji: "🎥", texts: [
        ["📺", "yayın-duyuruları", { ro: 1, st: "post" }],
        ["🎥", "yayıncı-sohbet", { st: "only" }],
        ["📝", "streamer-başvuru", { ro: 1, apply: 1 }],
        ["📅", "yayın-programı", { ro: 1, st: "post" }],
        ["🎬", "klipler", {}],
        ["🌟", "yayıncılar", { ro: 1, st: "post" }]
      ] },
      { name: "TOPLULUK", emoji: "👥", texts: [
        ["💬", "sohbet", {}], ["🖼️", "medya", {}], ["🤖", "bot-komutları", {}], ["💡", "öneriler", {}]
      ] },
      { name: "DESTEK", emoji: "🆘", texts: [["🎫", "ticket", { ro: 1 }], ["🆘", "destek", {}]] },
      { name: "SES", emoji: "🔊", voice: true },
      { name: "YÖNETİM", emoji: "🔒", staff: true, texts: [
        ["🛡️", "yetkili", {}], ["📋", "başvuru-log", { applog: 1 }], ["📜", "log", { log: 1 }]
      ] }
    ]
  },
  public: {
    label: "Public", emoji: "🌐",
    categories: [
      { name: "BİLGİ", emoji: "📌", texts: [
        ["📜", "kurallar", { ro: 1, rules: 1 }], ["📢", "duyurular", { ro: 1 }],
        ["👋", "hoş-geldin", { ro: 1 }], ["ℹ️", "bilgilendirme", { ro: 1 }]
      ] },
      { name: "SOHBET", emoji: "💬", texts: [
        ["💬", "genel-sohbet", {}], ["🖼️", "medya", {}], ["📸", "fotoğraflar", {}], ["💡", "öneriler", {}]
      ] },
      { name: "EĞLENCE", emoji: "🎮", texts: [
        ["🎮", "oyun-sohbet", {}], ["😂", "memes", {}], ["🎵", "müzik", {}], ["🎁", "çekilişler", { ro: 1 }], ["🤖", "bot-komutları", {}]
      ] },
      { name: "DESTEK", emoji: "🆘", texts: [["🎫", "ticket", { ro: 1 }], ["🆘", "destek", {}]] },
      { name: "SES", emoji: "🔊", voice: true },
      { name: "YÖNETİM", emoji: "🔒", staff: true, texts: [
        ["🛡️", "yetkili", {}], ["📜", "log", { log: 1 }]
      ] }
    ]
  }
};

function spCfg(config) {
  config.streamerPlus ??= {};
  applyDefaults(config.streamerPlus, defaultConfig().streamerPlus);
  return config.streamerPlus;
}

async function spEnsureRole(guild, config, key, name, extra, rec) {
  const sp = spCfg(config);
  config.createdIds ??= { categories: [], channels: [], roles: [] };
  const id = key === "adult" ? sp.adultRoleId : config.roles?.[key];
  let role = id ? (guild.roles.cache.get(id) || await guild.roles.fetch(id).catch(() => null)) : null;
  if (!role) role = guild.roles.cache.find(r => r.name === name && !r.managed) || null;
  if (!role) {
    role = await guild.roles.create({ name, reason: "Endless Builder", ...extra });
    config.createdIds.roles.push(role.id);
    rec?.roles.push(role.id);
    await spSleep(250);
  }
  if (key === "adult") sp.adultRoleId = role.id;
  else { config.roles ??= {}; config.roles[key] = role.id; }
  return role;
}

function spOverwrites(ctx, f = {}) {
  const map = new Map();
  const get = id => { if (!map.has(id)) map.set(id, { id, allow: [], deny: [] }); return map.get(id); };
  const V = SP_PF.ViewChannel, S = SP_PF.SendMessages, ev = ctx.guild.id;
  if (ctx.me) get(ctx.me).allow.push(V, S, SP_PF.EmbedLinks, SP_PF.ManageMessages);
  if (f.staffOnly) { get(ev).deny.push(V); get(ctx.staff.id).allow.push(V, S); }
  else if (f.st === "only" && ctx.streamer) { get(ev).deny.push(V); get(ctx.streamer.id).allow.push(V, S); get(ctx.staff.id).allow.push(V, S); }
  else if (f.adult && ctx.adult) { get(ev).deny.push(V); get(ctx.adult.id).allow.push(V); get(ctx.staff.id).allow.push(V, S); }
  if (f.ro) {
    const gate = f.adult && ctx.adult ? ctx.adult.id : ev;
    get(gate).deny.push(S, SP_PF.CreatePublicThreads, SP_PF.CreatePrivateThreads);
    get(ctx.staff.id).allow.push(S);
    if (f.st === "post" && ctx.streamer) get(ctx.streamer.id).allow.push(S);
  }
  return [...map.values()].map(o => ({
    id: o.id, type: o.id === ctx.me ? OverwriteType.Member : OverwriteType.Role, allow: o.allow, deny: o.deny
  }));
}

function spVoiceOverwrites(ctx, f = {}) {
  const map = new Map();
  const get = id => { if (!map.has(id)) map.set(id, { id, allow: [], deny: [] }); return map.get(id); };
  const V = SP_PF.ViewChannel, C = SP_PF.Connect, ev = ctx.guild.id;
  if (ctx.me) get(ctx.me).allow.push(V, C);
  if (f.adult && ctx.adult) { get(ev).deny.push(V, C); get(ctx.adult.id).allow.push(V, C); get(ctx.staff.id).allow.push(V, C); }
  if (f.st && ctx.streamer) { get(ev).deny.push(SP_PF.Stream); get(ctx.streamer.id).allow.push(SP_PF.Stream); get(ctx.staff.id).allow.push(SP_PF.Stream); }
  return [...map.values()].map(o => ({
    id: o.id, type: o.id === ctx.me ? OverwriteType.Member : OverwriteType.Role, allow: o.allow, deny: o.deny
  }));
}

function spRulesEmbed(label, adult) {
  const lines = [
    "1️⃣ Herkese saygılı davran; hakaret, taciz ve nefret söylemi yasaktır.",
    "2️⃣ Spam, flood ve reklam yasaktır.",
    "3️⃣ Kişisel bilgileri (adres, telefon vb.) paylaşma.",
    "4️⃣ Yetkililerin kararlarına uy; itirazlar için ticket aç.",
    "5️⃣ Discord Hizmet Şartları ve Topluluk Kurallarına uymak zorunludur."
  ];
  if (adult) lines.push("🔞 **+18 alanı:** yalnızca 18 yaşından büyükler içindir. Reşit olmayanlara ilişkin herhangi bir içerik kesinlikle yasaktır ve anında ban sebebidir.");
  return new EmbedBuilder().setColor(0x5865f2).setTitle(`📜 ${label} • Sunucu Kuralları`).setDescription(lines.join("\n")).setFooter({ text: BRAND_FOOTER });
}

function spApplyPanel() {
  return {
    embeds: [new EmbedBuilder().setColor(0x9146ff).setTitle("🎥 ・ Streamer Başvurusu")
      .setDescription("Yayıncı olmak mı istiyorsun?\nAşağıdaki butona basıp formu doldur. Yetkililer başvurunu inceleyip sonucu sana bildirecek.")
      .setFooter({ text: BRAND_FOOTER })],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("eb_sp_apply").setLabel("Başvuru Yap").setEmoji("📝").setStyle(ButtonStyle.Primary)
    )]
  };
}

function spAdultPanel() {
  return {
    embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("🔞 ・ +18 Erişim Doğrulaması")
      .setDescription(
        "+18 kanallarını görmek için **18 yaşından büyük olduğunu** beyan etmelisin.\n\n" +
        "• Yanlış beyan hesabının kısıtlanmasına yol açabilir.\n" +
        "• +18 alanındaki kurallara uymak zorundasın.\n" +
        "• İstediğin zaman erişimi bırakabilirsin."
      ).setFooter({ text: BRAND_FOOTER })],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("eb_sp_adult_start").setLabel("18+ Erişim Al").setEmoji("🔞").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("eb_sp_adult_leave").setLabel("Erişimi Bırak").setStyle(ButtonStyle.Secondary)
    )]
  };
}

async function spBuild(interaction, key, adult) {
  const guild = interaction.guild;
  if (!isAdmin(interaction)) return deny(interaction, "❌ Bu komut için **Yönetici** yetkisi gerekir.");
  const lack = botLacks(interaction, F.ManageChannels, "Kanalları Yönet") || botLacks(interaction, F.ManageRoles, "Rolleri Yönet");
  if (lack) return deny(interaction, lack);
  if (SP_BUILDING.has(guild.id)) return deny(interaction, "⏳ Bu sunucuda zaten bir kurulum çalışıyor, bitmesini bekle.");

  const config = ensureExtraConfig(getServerConfig(guild.id));
  const sp = spCfg(config);
  config.createdIds ??= { categories: [], channels: [], roles: [] };
  const buildKey = adult ? `${key}-18` : key;
  const preset = SP_PRESETS[key];
  const prev = sp.builds[buildKey];
  if (prev?.categories?.some(id => guild.channels.cache.has(id))) {
    return deny(interaction, `❌ **${preset.label}${adult ? " +18" : ""}** kurulumu zaten var.\nKaldırmak için \`/kurulum sil\` kullan.`);
  }

  const o = interaction.options;
  const chStyle = (o.getBoolean("emoji") ?? true) ? "emoji" : "plain";
  const catStyle = o.getString("kategori_stili") || "emoji";
  const cap = getLimits(guild.id).voice;
  const capV = n => (Number.isFinite(cap) ? Math.min(n, cap) : n);
  const notes = [];
  let voiceMain = clampInt(o.getInteger("ses") ?? 4, 1, 25, 4);
  let voiceStream = key === "streamer" ? clampInt(o.getInteger("yayin_ses") ?? 2, 0, 10, 2) : 0;
  let voiceAdult = adult ? clampInt(o.getInteger("ses_18") ?? 2, 0, 10, 2) : 0;
  if (capV(voiceMain) !== voiceMain || capV(voiceStream) !== voiceStream || capV(voiceAdult) !== voiceAdult) {
    voiceMain = capV(voiceMain); voiceStream = capV(voiceStream); voiceAdult = capV(voiceAdult);
    notes.push(`Free plan ses limiti (${cap}) uygulandı.`);
  }
  const applyOn = key === "streamer" && (o.getBoolean("basvuru") ?? true);

  // Plan
  const chName = (e, n) => (chStyle === "emoji" ? `${e}・${n}` : n);
  const plan = [];
  for (const c of preset.categories) {
    const item = { name: c.name, emoji: c.emoji, staff: Boolean(c.staff), adult: false, texts: [], voices: [] };
    for (const [e, n, f] of c.texts || []) {
      if ((f.apply || f.applog) && !applyOn) continue;
      item.texts.push({ e, n, f });
    }
    if (c.voice) {
      for (let i = 1; i <= voiceMain; i++) item.voices.push({ name: chStyle === "emoji" ? `🔊・Sohbet ${i}` : `Sohbet ${i}`, f: {} });
      for (let i = 1; i <= voiceStream; i++) item.voices.push({ name: chStyle === "emoji" ? `🎥・Yayın Odası ${i}` : `Yayın Odası ${i}`, f: { st: 1 } });
      item.voices.push({ name: chStyle === "emoji" ? "💤・AFK" : "AFK", f: {} });
    }
    plan.push(item);
  }
  if (adult) {
    plan.push({ name: "+18 GİRİŞ", emoji: "🔞", staff: false, adult: false, voices: [], texts: [
      { e: "📜", n: "18-kurallar", f: { ro: 1, rules18: 1 } }, { e: "✅", n: "18-doğrulama", f: { ro: 1, verify: 1 } }
    ] });
    const adultTexts = key === "streamer"
      ? [["🔞", "18-sohbet"], ["🖼️", "18-medya"], ["🎥", "18-yayın-sohbet"]]
      : [["🔞", "18-sohbet"], ["🖼️", "18-medya"], ["📸", "18-fotoğraflar"]];
    const voices = [];
    for (let i = 1; i <= voiceAdult; i++) voices.push({ name: chStyle === "emoji" ? `🔞・+18 Ses ${i}` : `+18 Ses ${i}`, f: { adult: 1 } });
    plan.push({ name: "+18", emoji: "🔞", staff: false, adult: true, voices, texts: adultTexts.map(([e, n]) => ({ e, n, f: {} })) });
  }

  const total = plan.reduce((s, c) => s + 1 + c.texts.length + c.voices.length, 0);
  if (guild.channels.cache.size + total > 495) {
    return deny(interaction, `❌ Kanal limiti aşılır (${guild.channels.cache.size} mevcut + ${total} yeni). Önce bazı kanalları sil.`);
  }

  await interaction.deferReply({ ephemeral: true });
  SP_BUILDING.add(guild.id);
  const rec = { at: Date.now(), categories: [], channels: [], roles: [] };
  let made = 0;

  try {
    const staff = await spEnsureRole(guild, config, "staff", "🛡️ Yetkili", {
      color: 0x5865f2,
      permissions: [SP_PF.ManageMessages, SP_PF.KickMembers, SP_PF.ModerateMembers, SP_PF.MuteMembers, SP_PF.MoveMembers]
    }, rec);
    const streamer = key === "streamer" ? await spEnsureRole(guild, config, "streamer", "🎥 Streamer", { color: 0x9146ff, hoist: true }, rec) : null;
    const adultRole = adult ? await spEnsureRole(guild, config, "adult", SP_ADULT_ROLE_NAME, { color: 0xed4245 }, rec) : null;
    const ctx = { guild, me: guild.members.me?.id, staff, streamer, adult: adultRole };

    for (const cat of plan) {
      const catOw = cat.staff ? spOverwrites(ctx, { staffOnly: true }) : cat.adult ? spOverwrites(ctx, { adult: true }) : [];
      const category = await guild.channels.create({
        name: formatCategoryName({ name: cat.name, emoji: cat.emoji }, catStyle),
        type: ChannelType.GuildCategory, permissionOverwrites: catOw, reason: "Endless Builder"
      });
      config.createdIds.categories.push(category.id); rec.categories.push(category.id);
      await spSleep(250);

      for (const t of cat.texts) {
        const flags = { ...t.f, staffOnly: cat.staff, adult: cat.adult };
        const ch = await guild.channels.create({
          name: chName(t.e, t.n), type: ChannelType.GuildText, parent: category.id,
          nsfw: cat.adult, permissionOverwrites: spOverwrites(ctx, flags), reason: "Endless Builder"
        });
        config.createdIds.channels.push(ch.id); rec.channels.push(ch.id); made++;
        await spSleep(250);

        if (t.f.log && !config.channels?.log) { config.channels ??= {}; config.channels.log = ch.id; }
        if (t.f.applog) sp.applications.channelId = ch.id;
        if (t.n === "yayın-duyuruları") {
          sp.announce.channelId = ch.id;
          const nr = await spGetNotifyRole(guild, config, true).catch(() => null);
          if (nr) { rec.roles.push(nr.id); await ch.send(spNotifyPanel()).catch(() => {}); }
        }
        if (t.f.apply) { sp.applications.panelChannelId = ch.id; await ch.send(spApplyPanel()).catch(() => {}); }
        if (t.f.rules) await ch.send({ embeds: [spRulesEmbed(preset.label, false)] }).catch(() => {});
        if (t.f.rules18) await ch.send({ embeds: [spRulesEmbed(preset.label, true)] }).catch(() => {});
        if (t.f.verify) {
          const m = await ch.send(spAdultPanel()).catch(() => null);
          sp.adultPanel = { channelId: ch.id, messageId: m?.id || null };
        }
      }

      for (const v of cat.voices) {
        const vc = await guild.channels.create({
          name: v.name, type: ChannelType.GuildVoice, parent: category.id,
          permissionOverwrites: spVoiceOverwrites(ctx, v.f), reason: "Endless Builder"
        });
        config.createdIds.channels.push(vc.id); rec.channels.push(vc.id); made++;
        await spSleep(250);
      }
    }

    sp.builds[buildKey] = rec;
    saveServerConfig(guild.id, config);
    await sendLog(guild, `🛠️ ${interaction.user} **${preset.label}${adult ? " +18" : ""}** kurulumunu tamamladı (${plan.length} kategori, ${made} kanal).`);

    const embed = new EmbedBuilder().setColor(0x57f287)
      .setTitle(`${preset.emoji} ${preset.label}${adult ? " +18" : ""} kurulumu tamamlandı`)
      .addFields(
        { name: "📁 Kategori", value: String(plan.length), inline: true },
        { name: "💬 Kanal", value: String(made), inline: true },
        { name: "🔊 Ses", value: `Genel ${voiceMain}${voiceStream ? ` • Yayın ${voiceStream}` : ""}${adult ? ` • +18 ${voiceAdult}` : ""}`, inline: true }
      ).setFooter({ text: BRAND_FOOTER });
    const tips = [];
    if (applyOn) tips.push("📝 Başvurular `başvuru-log` kanalına düşer. `/streamer basvuru-ayarla` ile değiştirebilirsin.");
    if (adult) tips.push("🔞 +18 kanalları yaş sınırlı (NSFW) ve yalnızca doğrulanan üyelere görünür.");
    tips.push("⚠️ Bot rolünü, oluşturulan rollerin **üstüne** taşımayı unutma.");
    embed.setDescription([...tips, ...notes].join("\n"));
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("SP BUILD ERROR:", error);
    sp.builds[buildKey] = rec;
    saveServerConfig(guild.id, config);
    await interaction.editReply({ content: `❌ Kurulum yarıda kaldı (${made} kanal oluşturuldu). Kalanları \`/kurulum sil\` ile temizleyip tekrar deneyebilirsin.` }).catch(() => {});
  } finally {
    SP_BUILDING.delete(guild.id);
  }
}

async function spRemoveBuild(interaction, buildKey) {
  const guild = interaction.guild;
  if (!isAdmin(interaction)) return deny(interaction, "❌ Bu komut için **Yönetici** yetkisi gerekir.");
  const config = getServerConfig(guild.id);
  const sp = spCfg(config);
  const rec = sp.builds[buildKey];
  if (!rec) return deny(interaction, "ℹ️ Bu kurulum kaydı bulunamadı.");
  await interaction.deferReply({ ephemeral: true });
  let deleted = 0;
  for (const id of [...rec.channels, ...rec.categories]) {
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (!ch) continue;
    await ch.delete("Endless Builder kurulum silindi").then(() => { deleted++; }).catch(() => {});
    await spSleep(250);
  }
  for (const list of [config.createdIds?.channels, config.createdIds?.categories]) {
    if (!Array.isArray(list)) continue;
    for (let i = list.length - 1; i >= 0; i--) if (rec.channels.includes(list[i]) || rec.categories.includes(list[i])) list.splice(i, 1);
  }
  delete sp.builds[buildKey];
  saveServerConfig(guild.id, config);
  await sendLog(guild, `🗑️ ${interaction.user} **${buildKey}** kurulumunu sildi (${deleted} kanal/kategori). Roller korundu.`);
  await interaction.editReply({ content: `🗑️ ${deleted} kanal/kategori silindi. Roller silinmedi.` });
}

function spInput(id, label, style, max, min = 1) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setMinLength(min).setMaxLength(max).setRequired(true)
  );
}

function spStreamerRole(guild, config) {
  const id = config.roles?.streamer;
  return (id && guild.roles.cache.get(id)) || guild.roles.cache.find(r => r.name === "🎥 Streamer") || null;
}

function spCanReview(interaction, config) {
  const sp = spCfg(config);
  const m = interaction.member;
  return Boolean(
    interaction.guild.ownerId === interaction.user.id ||
    interaction.memberPermissions?.has(SP_PF.Administrator) ||
    interaction.memberPermissions?.has(SP_PF.ManageRoles) ||
    (sp.applications.reviewerRoleId && m?.roles?.cache?.has(sp.applications.reviewerRoleId)) ||
    (config.roles?.staff && m?.roles?.cache?.has(config.roles.staff))
  );
}

function spApplicationGuard(interaction, config) {
  const sp = spCfg(config);
  const app = sp.applications;
  if (!config.toggles.streamer) return "❌ Streamer sistemi bu sunucuda kapalı.";
  if (!app.enabled) return "❌ Streamer başvuruları şu an kapalı.";
  if (!app.channelId) return "❌ Başvuru kanalı ayarlanmamış. Yetkililer `/streamer basvuru-ayarla` kullansın.";
  const role = spStreamerRole(interaction.guild, config);
  if (role && interaction.member.roles.cache.has(role.id)) return "ℹ️ Zaten Streamer rolün var.";
  const rec = app.records[interaction.user.id];
  if (rec?.status === "pending") return "⏳ Zaten bekleyen bir başvurun var.";
  if (rec?.status === "rejected" && app.cooldownMin > 0) {
    const left = rec.at + app.cooldownMin * 60000 - Date.now();
    if (left > 0) return `⏳ Yeni başvuru için **${Math.ceil(left / 60000)} dakika** beklemelisin.`;
  }
  return null;
}

async function spDm(userId, text) {
  try { const u = await client.users.fetch(userId); await u.send(text); } catch {}
}

const SP_BUILD_CMDS = {
  "streamer-kur": ["streamer", false], "streamer-kur-18": ["streamer", true],
  "public-kur": ["public", false], "public-kur-18": ["public", true]
};

async function handleStreamerPlus(interaction, config) {
  try {
    const sp = spCfg(config);

    if (interaction.isChatInputCommand()) {
      const n = interaction.commandName;
      if (SP_BUILD_CMDS[n]) { await spBuild(interaction, ...SP_BUILD_CMDS[n]); return true; }
      if (n === "kurulum-sil") {
        if (!interaction.options.getBoolean("onay")) { await deny(interaction, "❌ Silmek için `onay` seçeneğini **True** yapmalısın."); return true; }
        await spRemoveBuild(interaction, interaction.options.getString("tur")); return true;
      }
      if (n === "streamer-basvuru-panel") {
        if (!canManageGuild(interaction)) { await deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir."); return true; }
        if (!config.toggles.streamer) { await deny(interaction, "❌ Streamer sistemi bu sunucuda kapalı."); return true; }
        const ch = interaction.options.getChannel("kanal") || interaction.channel;
        await ch.send(spApplyPanel());
        sp.applications.panelChannelId = ch.id; saveServerConfig(interaction.guildId, config);
        await respond(interaction, { content: `✅ Başvuru paneli ${ch} kanalına gönderildi.${sp.applications.channelId ? "" : "\n⚠️ Başvuru kanalı yok: `/streamer basvuru-ayarla kanal:` ile seç."}`, ephemeral: true });
        return true;
      }
      if (n === "streamer-basvuru-ayarla") {
        if (!canManageGuild(interaction)) { await deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir."); return true; }
        const o = interaction.options, a = sp.applications;
        const ch = o.getChannel("kanal"), rev = o.getRole("yetkili_rol"), st = o.getRole("streamer_rol");
        const cd = o.getInteger("bekleme"), on = o.getBoolean("aktif");
        if (ch) a.channelId = ch.id;
        if (rev) a.reviewerRoleId = rev.id;
        if (st) config.roles.streamer = st.id;
        if (cd !== null) a.cooldownMin = cd;
        if (on !== null) a.enabled = on;
        saveServerConfig(interaction.guildId, config);
        await respond(interaction, { embeds: [new EmbedBuilder().setColor(0x9146ff).setTitle("🎥 Streamer Başvuru Ayarları").addFields(
          { name: "Durum", value: a.enabled ? "🟢 Açık" : "🔴 Kapalı", inline: true },
          { name: "Başvuru kanalı", value: a.channelId ? `<#${a.channelId}>` : "—", inline: true },
          { name: "Yetkili rol", value: a.reviewerRoleId ? `<@&${a.reviewerRoleId}>` : "Yetkili rolü / Rolleri Yönet", inline: true },
          { name: "Streamer rolü", value: config.roles.streamer ? `<@&${config.roles.streamer}>` : "—", inline: true },
          { name: "Red sonrası bekleme", value: `${a.cooldownMin} dk`, inline: true }
        ).setFooter({ text: BRAND_FOOTER })], ephemeral: true });
        return true;
      }
      if (n === "yas-panel") {
        if (!canManageGuild(interaction)) { await deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir."); return true; }
        const lack = botLacks(interaction, F.ManageRoles, "Rolleri Yönet");
        if (lack) { await deny(interaction, lack); return true; }
        await interaction.deferReply({ ephemeral: true });
        const given = interaction.options.getRole("rol");
        if (given) sp.adultRoleId = given.id;
        else await spEnsureRole(interaction.guild, config, "adult", SP_ADULT_ROLE_NAME, { color: 0xed4245 }, null);
        const ch = interaction.options.getChannel("kanal") || interaction.channel;
        const m = await ch.send(spAdultPanel());
        sp.adultPanel = { channelId: ch.id, messageId: m.id };
        saveServerConfig(interaction.guildId, config);
        await interaction.editReply({ content: `✅ +18 doğrulama paneli ${ch} kanalına gönderildi. Rol: <@&${sp.adultRoleId}>\nℹ️ +18 kanallarını bu role özel yapıp **Yaş Sınırlı** işaretlemeyi unutma.` });
        return true;
      }
      return false;
    }

    const id = interaction.customId || "";
    if (!id.startsWith("eb_sp_")) return false;

    if (interaction.isButton()) {
      if (id === "eb_sp_apply") {
        const err = spApplicationGuard(interaction, config);
        if (err) { await deny(interaction, err); return true; }
        await interaction.showModal(
          new ModalBuilder().setCustomId("eb_sp_apply_modal").setTitle("Streamer Başvurusu").addComponents(
            spInput("platform", "Yayın platformu (Twitch, YouTube, Kick...)", TextInputStyle.Short, 50),
            spInput("link", "Kanal linki (https://...)", TextInputStyle.Short, 200, 8),
            spInput("content", "Ne yayınlıyorsun?", TextInputStyle.Short, 100),
            spInput("about", "Kendini kısaca tanıt", TextInputStyle.Paragraph, 700, 20)
          )
        );
        return true;
      }

      if (id.startsWith("eb_sp_ok:") || id.startsWith("eb_sp_no:")) {
        const uid = id.split(":")[1];
        if (!spCanReview(interaction, config)) { await deny(interaction, "❌ Başvuruları değerlendirme yetkin yok."); return true; }
        const rec = sp.applications.records[uid];
        if (!rec || rec.status !== "pending") { await deny(interaction, "ℹ️ Bu başvuru zaten sonuçlanmış."); return true; }

        if (id.startsWith("eb_sp_no:")) {
          await interaction.showModal(
            new ModalBuilder().setCustomId(`eb_sp_no_modal:${uid}`).setTitle("Başvuruyu Reddet")
              .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId("reason").setLabel("Red sebebi (opsiyonel)").setStyle(TextInputStyle.Paragraph).setMaxLength(300).setRequired(false)
              ))
          );
          return true;
        }

        const role = spStreamerRole(interaction.guild, config);
        if (!role) { await deny(interaction, "❌ Streamer rolü ayarlı değil. `/yonetim rol-ayarla streamer:` ile seç."); return true; }
        const me = interaction.guild.members.me;
        if (!me || role.position >= me.roles.highest.position) { await deny(interaction, "❌ Streamer rolünü veremiyorum. Bot rolünü Streamer rolünün üzerine taşı."); return true; }
        const member = await interaction.guild.members.fetch(uid).catch(() => null);
        if (!member) {
          rec.status = "left"; saveServerConfig(interaction.guildId, config);
          await interaction.update({ components: [] });
          return true;
        }
        await member.roles.add(role, `Streamer başvurusu onaylandı: ${interaction.user.tag}`);
        rec.status = "approved"; rec.by = interaction.user.id; rec.at = Date.now();
        saveServerConfig(interaction.guildId, config);
        const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x57f287)
          .addFields({ name: "✅ Karar", value: `Onaylandı • ${interaction.user}`, inline: false });
        await interaction.update({ embeds: [embed], components: [] });
        await spDm(uid, `🎉 **${interaction.guild.name}** sunucusundaki Streamer başvurun **onaylandı**!`);
        await sendLog(interaction.guild, `🎥 ${interaction.user} <@${uid}> kullanıcısının streamer başvurusunu onayladı.`);
        return true;
      }

      // ---- +18 doğrulama ----
      if (id.startsWith("eb_sp_adult_")) {
        const role = (sp.adultRoleId && interaction.guild.roles.cache.get(sp.adultRoleId)) ||
          interaction.guild.roles.cache.find(r => r.name === SP_ADULT_ROLE_NAME);
        if (!role) { await deny(interaction, "❌ +18 rolü bulunamadı. Yetkililer `/streamer yas-panel` kullansın."); return true; }
        const me = interaction.guild.members.me;
        if (id === "eb_sp_adult_start") {
          if (interaction.member.roles.cache.has(role.id)) { await deny(interaction, "ℹ️ Zaten +18 erişimin var."); return true; }
          await interaction.reply({
            ephemeral: true,
            content: "🔞 **18 yaşından büyük olduğunu beyan ediyor musun?**\nYanlış beyan hesabının kısıtlanmasına sebep olabilir.",
            components: [new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("eb_sp_adult_yes").setLabel("Evet, 18 yaşından büyüğüm").setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId("eb_sp_adult_no").setLabel("Vazgeç").setStyle(ButtonStyle.Secondary)
            )]
          });
          return true;
        }
        if (id === "eb_sp_adult_no") { await interaction.update({ content: "İptal edildi.", components: [] }); return true; }
        if (!me || role.position >= me.roles.highest.position) { await deny(interaction, "❌ Rolü veremiyorum. Bot rolünü +18 rolünün üzerine taşı."); return true; }
        if (id === "eb_sp_adult_yes") {
          await interaction.member.roles.add(role, "+18 doğrulama (kendi beyanı)");
          await interaction.update({ content: "✅ +18 erişimin açıldı.", components: [] });
          await sendLog(interaction.guild, `🔞 ${interaction.user} +18 erişimi aldı.`);
          return true;
        }
        if (id === "eb_sp_adult_leave") {
          if (!interaction.member.roles.cache.has(role.id)) { await deny(interaction, "ℹ️ Zaten +18 erişimin yok."); return true; }
          await interaction.member.roles.remove(role, "+18 erişimi bırakıldı");
          await respond(interaction, { content: "✅ +18 erişimin kaldırıldı.", ephemeral: true });
          return true;
        }
      }
      return false;
    }

    if (interaction.isModalSubmit()) {
      if (id === "eb_sp_apply_modal") {
        const err = spApplicationGuard(interaction, config);
        if (err) { await deny(interaction, err); return true; }
        const f = k => interaction.fields.getTextInputValue(k).trim();
        const link = f("link");
        if (!/^https?:\/\/\S+$/i.test(link)) { await deny(interaction, "❌ Kanal linki `https://` ile başlamalı."); return true; }
        const ch = await interaction.guild.channels.fetch(sp.applications.channelId).catch(() => null);
        if (!ch?.isTextBased()) { await deny(interaction, "❌ Başvuru kanalı bulunamadı. Yetkililer `/streamer basvuru-ayarla` kullansın."); return true; }
        await interaction.deferReply({ ephemeral: true });
        sp.applications.counter += 1;
        const no = sp.applications.counter;
        const embed = new EmbedBuilder().setColor(0xfee75c).setTitle(`🎥 Streamer Başvurusu #${no}`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: "👤 Kullanıcı", value: `${interaction.user} (${interaction.user.tag})`, inline: false },
            { name: "📺 Platform", value: f("platform").slice(0, 100), inline: true },
            { name: "🎬 İçerik", value: f("content").slice(0, 200), inline: true },
            { name: "🔗 Link", value: link.slice(0, 300), inline: false },
            { name: "📝 Hakkında", value: f("about").slice(0, 900), inline: false }
          ).setTimestamp().setFooter({ text: BRAND_FOOTER });
        const msg = await ch.send({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eb_sp_ok:${interaction.user.id}`).setLabel("Onayla").setEmoji("✅").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`eb_sp_no:${interaction.user.id}`).setLabel("Reddet").setEmoji("❌").setStyle(ButtonStyle.Danger)
          )]
        });
        sp.applications.records[interaction.user.id] = { no, status: "pending", at: Date.now(), messageId: msg.id };
        saveServerConfig(interaction.guildId, config);
        await interaction.editReply({ content: `✅ Başvurun alındı (#${no}). Sonuç sana DM ile bildirilecek.` });
        await sendLog(interaction.guild, `🎥 ${interaction.user} streamer başvurusu yaptı (#${no}).`);
        return true;
      }

      if (id.startsWith("eb_sp_no_modal:")) {
        const uid = id.split(":")[1];
        if (!spCanReview(interaction, config)) { await deny(interaction, "❌ Başvuruları değerlendirme yetkin yok."); return true; }
        const rec = sp.applications.records[uid];
        if (!rec || rec.status !== "pending") { await deny(interaction, "ℹ️ Bu başvuru zaten sonuçlanmış."); return true; }
        const reason = interaction.fields.getTextInputValue("reason").trim();
        rec.status = "rejected"; rec.by = interaction.user.id; rec.at = Date.now();
        saveServerConfig(interaction.guildId, config);
        if (interaction.isFromMessage() && interaction.message.embeds[0]) {
          const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0xed4245)
            .addFields({ name: "❌ Karar", value: `Reddedildi • ${interaction.user}${reason ? `\nSebep: ${reason}` : ""}`, inline: false });
          await interaction.update({ embeds: [embed], components: [] });
        } else {
          await respond(interaction, { content: "✅ Başvuru reddedildi.", ephemeral: true });
        }
        await spDm(uid, `❌ **${interaction.guild.name}** sunucusundaki Streamer başvurun reddedildi.${reason ? `\nSebep: ${reason}` : ""}`);
        await sendLog(interaction.guild, `🎥 ${interaction.user} <@${uid}> kullanıcısının streamer başvurusunu reddetti.`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("STREAMER+ ERROR:", error);
    await deny(interaction, FAIL_TEXT).catch(() => {});
    return true;
  }
}

// ---------- Komut kayıtları ----------

function spBuildCmd(name, desc, { stream, adult }) {
  const b = new SlashCommandBuilder().setName(name).setDescription(desc)
    .setDefaultMemberPermissions(F.Administrator).setDMPermission(false)
    .addIntegerOption(o => o.setName("ses").setDescription("Genel ses kanalı sayısı (1-25, varsayılan 4)").setMinValue(1).setMaxValue(25));
  if (stream) b.addIntegerOption(o => o.setName("yayin_ses").setDescription("Yayın odası sayısı (0-10, varsayılan 2)").setMinValue(0).setMaxValue(10));
  if (adult) b.addIntegerOption(o => o.setName("ses_18").setDescription("+18 ses kanalı sayısı (0-10, varsayılan 2)").setMinValue(0).setMaxValue(10));
  b.addBooleanOption(o => o.setName("emoji").setDescription("Kanal isimlerinde emoji kullanılsın mı? (varsayılan evet)"))
    .addStringOption(o => o.setName("kategori_stili").setDescription("Kategori isim stili").addChoices(
      { name: "Emoji (📌 BİLGİ)", value: "emoji" },
      { name: "Köşeli (「 BİLGİ 」)", value: "brackets" },
      { name: "Çizgili (━━ BİLGİ ━━)", value: "lines" },
      { name: "Sade (BİLGİ)", value: "plain" }
    ));
  if (stream) b.addBooleanOption(o => o.setName("basvuru").setDescription("Streamer başvuru sistemi kurulsun mu? (varsayılan evet)"));
  return b;
}

commands.push(
  spBuildCmd("streamer-kur", "Streamer sunucusunu kur (başvuru sistemi + ses kanalı sayısı seçilebilir)", { stream: true, adult: false }),
  spBuildCmd("streamer-kur-18", "+18 Streamer sunucusunu kur (yaş doğrulamalı +18 alanı ile)", { stream: true, adult: true }),
  spBuildCmd("public-kur", "Public topluluk sunucusunu kur (ses kanalı sayısı seçilebilir)", { stream: false, adult: false }),
  spBuildCmd("public-kur-18", "+18 Public sunucuyu kur (yaş doğrulamalı +18 alanı ile)", { stream: false, adult: true }),
  new SlashCommandBuilder().setName("streamer-basvuru-panel").setDescription("Streamer başvuru panelini gönder (form + onay sistemi)")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
    .addChannelOption(o => o.setName("kanal").setDescription("Panelin gönderileceği kanal").addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName("streamer-basvuru-ayarla").setDescription("Streamer başvuru ayarları")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
    .addChannelOption(o => o.setName("kanal").setDescription("Başvuruların düşeceği kanal").addChannelTypes(ChannelType.GuildText))
    .addRoleOption(o => o.setName("yetkili_rol").setDescription("Başvuruları değerlendirebilecek rol"))
    .addRoleOption(o => o.setName("streamer_rol").setDescription("Onaylananlara verilecek rol"))
    .addIntegerOption(o => o.setName("bekleme").setDescription("Red sonrası yeniden başvuru bekleme (dakika)").setMinValue(0).setMaxValue(10080))
    .addBooleanOption(o => o.setName("aktif").setDescription("Başvurular açık mı?")),
  new SlashCommandBuilder().setName("yas-panel").setDescription("+18 yaş doğrulama panelini gönder")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
    .addChannelOption(o => o.setName("kanal").setDescription("Panelin gönderileceği kanal").addChannelTypes(ChannelType.GuildText))
    .addRoleOption(o => o.setName("rol").setDescription("Verilecek +18 rolü (boşsa 🔞 18+ oluşturulur)")),
  new SlashCommandBuilder().setName("kurulum-sil").setDescription("Kur komutlarıyla oluşturulan kanalları sil (roller kalır)")
    .setDefaultMemberPermissions(F.Administrator).setDMPermission(false)
    .addStringOption(o => o.setName("tur").setDescription("Silinecek kurulum").setRequired(true).addChoices(
      { name: "Streamer", value: "streamer" }, { name: "Streamer +18", value: "streamer-18" },
      { name: "Public", value: "public" }, { name: "Public +18", value: "public-18" }
    ))
    .addBooleanOption(o => o.setName("onay").setDescription("Silmeyi onaylıyorum").setRequired(true))
);

HELP_CATEGORIES.push({
  key: "streamerplus", label: "Streamer & +18", emoji: "🎥",
  cmds: ["streamer-kur", "streamer-kur-18", "public-kur", "public-kur-18", "streamer-basvuru-panel", "streamer-basvuru-ayarla", "yas-panel", "kurulum-sil"]
});


// ======================================================
// AŞAMA 18: YAYIN DUYURU + STREAMER PROFİL + BİLDİRİM ROLÜ
// ======================================================
// Komutlar: /streamer duyur, /streamer duyuru-ayarla, /streamer bildirim-panel,
//           /streamer profil (ayarla|goster|sil), /streamer liste, /kurulum kur-durum
// customId: eb_sp_notify

const SP_NOTIFY_ROLE_NAME = "🔔 Yayın Bildirim";
const spAnnounceLast = new Map();

function spNotifyPanel() {
  return {
    embeds: [new EmbedBuilder().setColor(0x9146ff).setTitle("🔔 ・ Yayın Bildirimleri")
      .setDescription("Yayıncılar canlı yayına çıktığında haberdar olmak için butona bas.\nTekrar basarsan bildirimleri kapatırsın.")
      .setFooter({ text: BRAND_FOOTER })],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("eb_sp_notify").setLabel("Bildirimi Aç / Kapat").setEmoji("🔔").setStyle(ButtonStyle.Primary)
    )]
  };
}

async function spGetNotifyRole(guild, config, create) {
  const sp = spCfg(config);
  let role = sp.notifyRoleId ? (guild.roles.cache.get(sp.notifyRoleId) || await guild.roles.fetch(sp.notifyRoleId).catch(() => null)) : null;
  if (!role) role = guild.roles.cache.find(r => r.name === SP_NOTIFY_ROLE_NAME && !r.managed) || null;
  if (!role && create) {
    role = await guild.roles.create({ name: SP_NOTIFY_ROLE_NAME, color: 0x9146ff, mentionable: false, reason: "Endless Builder" });
    config.createdIds ??= { categories: [], channels: [], roles: [] };
    config.createdIds.roles.push(role.id);
  }
  if (role) sp.notifyRoleId = role.id;
  return role;
}

async function handleStreamerExtras(interaction, config) {
  try {
    const sp = spCfg(config);
    const guild = interaction.guild;

    if (interaction.isChatInputCommand()) {
      const n = interaction.commandName;

      if (n === "yayin-ayarla") {
        if (!canManageGuild(interaction)) { await deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir."); return true; }
        const o = interaction.options, a = sp.announce;
        const ch = o.getChannel("kanal"), role = o.getRole("bildirim_rol"), cd = o.getInteger("bekleme");
        if (ch) a.channelId = ch.id;
        if (role) sp.notifyRoleId = role.id;
        if (cd !== null) a.cooldownMin = cd;
        saveServerConfig(interaction.guildId, config);
        await respond(interaction, { embeds: [new EmbedBuilder().setColor(0x9146ff).setTitle("📺 Yayın Duyuru Ayarları").addFields(
          { name: "Duyuru kanalı", value: a.channelId ? `<#${a.channelId}>` : "—", inline: true },
          { name: "Bildirim rolü", value: sp.notifyRoleId ? `<@&${sp.notifyRoleId}>` : "—", inline: true },
          { name: "Bekleme", value: `${a.cooldownMin} dk`, inline: true }
        ).setFooter({ text: BRAND_FOOTER })], ephemeral: true });
        return true;
      }

      if (n === "yayin-bildirim-panel") {
        if (!canManageGuild(interaction)) { await deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir."); return true; }
        const lack = botLacks(interaction, F.ManageRoles, "Rolleri Yönet");
        if (lack) { await deny(interaction, lack); return true; }
        await interaction.deferReply({ ephemeral: true });
        const role = await spGetNotifyRole(guild, config, true);
        const ch = interaction.options.getChannel("kanal") || interaction.channel;
        await ch.send(spNotifyPanel());
        saveServerConfig(interaction.guildId, config);
        await interaction.editReply({ content: `✅ Bildirim paneli ${ch} kanalına gönderildi. Rol: ${role}` });
        return true;
      }

      if (n === "yayin-duyur") {
        if (!config.toggles.streamer) { await deny(interaction, "❌ Streamer sistemi bu sunucuda kapalı."); return true; }
        const role = spStreamerRole(guild, config);
        const allowed = canManageGuild(interaction) || (role && interaction.member.roles.cache.has(role.id));
        if (!allowed) { await deny(interaction, "❌ Yayın duyurusu için **Streamer** rolüne sahip olmalısın."); return true; }
        const a = sp.announce;
        if (!a.channelId) { await deny(interaction, "❌ Duyuru kanalı ayarlı değil. Yetkililer `/streamer duyuru-ayarla kanal:` kullansın."); return true; }
        const key = `${guild.id}:${interaction.user.id}`;
        const last = Math.max(spAnnounceLast.get(key) || 0, a.last[interaction.user.id] || 0);
        const left = last + a.cooldownMin * 60000 - Date.now();
        if (left > 0 && !canManageGuild(interaction)) { await deny(interaction, `⏳ Yeni duyuru için **${Math.ceil(left / 60000)} dk** beklemelisin.`); return true; }
        const link = interaction.options.getString("link", true).trim();
        if (!/^https?:\/\/\S+$/i.test(link)) { await deny(interaction, "❌ Link `https://` ile başlamalı."); return true; }
        const ch = await guild.channels.fetch(a.channelId).catch(() => null);
        if (!ch?.isTextBased()) { await deny(interaction, "❌ Duyuru kanalı bulunamadı."); return true; }
        await interaction.deferReply({ ephemeral: true });
        const prof = sp.profiles[interaction.user.id];
        const title = interaction.options.getString("baslik") || "Canlı yayında!";
        const game = interaction.options.getString("oyun");
        const embed = new EmbedBuilder().setColor(0x9146ff)
          .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
          .setTitle(`🔴 ${title}`.slice(0, 250)).setURL(link)
          .setDescription(`${interaction.user} şimdi yayında!\n[▶️ Yayına git](${link})`)
          .setTimestamp().setFooter({ text: BRAND_FOOTER });
        if (game) embed.addFields({ name: "🎮 İçerik", value: game.slice(0, 200), inline: true });
        if (prof?.platform) embed.addFields({ name: "📺 Platform", value: prof.platform.slice(0, 100), inline: true });
        const ping = sp.notifyRoleId ? guild.roles.cache.get(sp.notifyRoleId) : null;
        await ch.send({
          content: ping ? `${ping}` : undefined, embeds: [embed],
          allowedMentions: { roles: ping ? [ping.id] : [], users: [] }
        });
        spAnnounceLast.set(key, Date.now());
        a.last[interaction.user.id] = Date.now();
        saveServerConfig(interaction.guildId, config);
        await interaction.editReply({ content: `✅ Duyuru ${ch} kanalına gönderildi.` });
        await sendLog(guild, `📺 ${interaction.user} yayın duyurusu yaptı.`);
        return true;
      }

      if (n === "streamer-profil") {
        const sub = interaction.options.getSubcommand();
        if (sub === "ayarla") {
          const role = spStreamerRole(guild, config);
          if (!(role && interaction.member.roles.cache.has(role.id)) && !canManageGuild(interaction)) { await deny(interaction, "❌ Profil için **Streamer** rolüne sahip olmalısın."); return true; }
          const link = interaction.options.getString("link", true).trim();
          if (!/^https?:\/\/\S+$/i.test(link)) { await deny(interaction, "❌ Link `https://` ile başlamalı."); return true; }
          sp.profiles[interaction.user.id] = {
            platform: interaction.options.getString("platform", true).slice(0, 50), link: link.slice(0, 300),
            bio: (interaction.options.getString("hakkinda") || "").slice(0, 300), at: Date.now()
          };
          saveServerConfig(interaction.guildId, config);
          await respond(interaction, { content: "✅ Streamer profilin kaydedildi. `/streamer profil goster` ile görebilirsin.", ephemeral: true });
          return true;
        }
        if (sub === "sil") {
          delete sp.profiles[interaction.user.id];
          saveServerConfig(interaction.guildId, config);
          await respond(interaction, { content: "🗑️ Profilin silindi.", ephemeral: true });
          return true;
        }
        const user = interaction.options.getUser("kullanici") || interaction.user;
        const p = sp.profiles[user.id];
        if (!p) { await deny(interaction, "ℹ️ Bu kullanıcının streamer profili yok."); return true; }
        await respond(interaction, { embeds: [new EmbedBuilder().setColor(0x9146ff).setTitle(`🎥 ${user.username} • Streamer Profili`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: "📺 Platform", value: p.platform, inline: true },
            { name: "🔗 Kanal", value: `[Yayına git](${p.link})`, inline: true },
            ...(p.bio ? [{ name: "📝 Hakkında", value: p.bio, inline: false }] : [])
          ).setFooter({ text: BRAND_FOOTER })] });
        return true;
      }

      if (n === "streamer-liste") {
        const role = spStreamerRole(guild, config);
        const list = Object.entries(sp.profiles).filter(([uid]) => !role || role.members.has(uid) || !guild.members.cache.has(uid)).slice(0, 25);
        if (!list.length) { await deny(interaction, "ℹ️ Kayıtlı streamer profili yok."); return true; }
        await respond(interaction, { embeds: [new EmbedBuilder().setColor(0x9146ff).setTitle("🎥 Streamer Listesi")
          .setDescription(list.map(([uid, p]) => `<@${uid}> • ${p.platform} • [Kanal](${p.link})`).join("\n").slice(0, 4000))
          .setFooter({ text: BRAND_FOOTER })], allowedMentions: { parse: [] } });
        return true;
      }

      if (n === "kurulum-durum") {
        if (!canManageGuild(interaction)) { await deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir."); return true; }
        const names = { streamer: "Streamer", "streamer-18": "Streamer +18", public: "Public", "public-18": "Public +18" };
        const lines = Object.entries(sp.builds).map(([k, r]) => `✅ **${names[k] || k}** • ${r.categories.length} kategori, ${r.channels.length} kanal • <t:${Math.floor(r.at / 1000)}:R>`);
        await respond(interaction, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🛠️ Kur Komutları Durumu")
          .setDescription(lines.join("\n") || "Henüz `/kurulum streamer` veya `/kurulum public` kullanılmadı.")
          .addFields(
            { name: "📝 Başvuru", value: sp.applications.enabled ? "🟢 Açık" : "🔴 Kapalı", inline: true },
            { name: "📺 Duyuru kanalı", value: sp.announce.channelId ? `<#${sp.announce.channelId}>` : "—", inline: true },
            { name: "🔞 +18 rolü", value: sp.adultRoleId ? `<@&${sp.adultRoleId}>` : "—", inline: true }
          ).setFooter({ text: BRAND_FOOTER })], ephemeral: true });
        return true;
      }
      return false;
    }

    if (interaction.isButton() && interaction.customId === "eb_sp_notify") {
      if (!config.toggles.streamer) { await deny(interaction, "❌ Streamer sistemi bu sunucuda kapalı."); return true; }
      const role = await spGetNotifyRole(guild, config, false);
      if (!role) { await deny(interaction, "❌ Bildirim rolü bulunamadı. Yetkililer `/streamer bildirim-panel` kullansın."); return true; }
      const me = guild.members.me;
      if (!me || role.position >= me.roles.highest.position) { await deny(interaction, "❌ Rolü veremiyorum. Bot rolünü bildirim rolünün üzerine taşı."); return true; }
      if (interaction.member.roles.cache.has(role.id)) {
        await interaction.member.roles.remove(role, "Yayın bildirimi kapatıldı");
        await respond(interaction, { content: "🔕 Yayın bildirimlerini kapattın.", ephemeral: true });
      } else {
        await interaction.member.roles.add(role, "Yayın bildirimi açıldı");
        await respond(interaction, { content: "🔔 Yayın bildirimlerini açtın!", ephemeral: true });
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error("STREAMER EXTRAS ERROR:", error);
    await deny(interaction, FAIL_TEXT).catch(() => {});
    return true;
  }
}

commands.push(
  new SlashCommandBuilder().setName("yayin-duyur").setDescription("Canlı yayın duyurusu gönder (Streamer rolü gerekir)").setDMPermission(false)
    .addStringOption(o => o.setName("link").setDescription("Yayın linki (https://...)").setRequired(true).setMaxLength(300))
    .addStringOption(o => o.setName("baslik").setDescription("Yayın başlığı").setMaxLength(100))
    .addStringOption(o => o.setName("oyun").setDescription("Oyun / içerik").setMaxLength(100)),
  new SlashCommandBuilder().setName("yayin-ayarla").setDescription("Yayın duyuru kanalı, bildirim rolü ve bekleme süresi")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
    .addChannelOption(o => o.setName("kanal").setDescription("Duyuruların gideceği kanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addRoleOption(o => o.setName("bildirim_rol").setDescription("Duyuruda etiketlenecek rol"))
    .addIntegerOption(o => o.setName("bekleme").setDescription("İki duyuru arası bekleme (dakika)").setMinValue(0).setMaxValue(1440)),
  new SlashCommandBuilder().setName("yayin-bildirim-panel").setDescription("Yayın bildirim rolü butonlu paneli gönder")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
    .addChannelOption(o => o.setName("kanal").setDescription("Panelin gönderileceği kanal").addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName("streamer-profil").setDescription("Streamer profil kartı").setDMPermission(false)
    .addSubcommand(s => s.setName("ayarla").setDescription("Kendi streamer profilini oluştur")
      .addStringOption(o => o.setName("platform").setDescription("Twitch, YouTube, Kick...").setRequired(true).setMaxLength(50))
      .addStringOption(o => o.setName("link").setDescription("Kanal linki (https://...)").setRequired(true).setMaxLength(300))
      .addStringOption(o => o.setName("hakkinda").setDescription("Kısa tanıtım").setMaxLength(300)))
    .addSubcommand(s => s.setName("goster").setDescription("Bir streamer'ın profilini göster")
      .addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı (boşsa sen)")))
    .addSubcommand(s => s.setName("sil").setDescription("Kendi profilini sil")),
  new SlashCommandBuilder().setName("streamer-liste").setDescription("Sunucudaki streamer profillerini listele").setDMPermission(false),
  new SlashCommandBuilder().setName("kurulum-durum").setDescription("Kur komutlarının durumunu göster")
    .setDefaultMemberPermissions(F.ManageGuild).setDMPermission(false)
);

HELP_CATEGORIES.find(c => c.key === "streamerplus").cmds.push(
  "yayin-duyur", "yayin-ayarla", "yayin-bildirim-panel", "streamer-profil", "streamer-liste", "kurulum-durum"
);


// ======================================================
// AŞAMA 19: KURULUMU TAMAMLA  (/kurulum tamamla)
// ======================================================
// Mevcut Builder düzenini BOZMAZ: hiçbir kanal/rol silinmez, yeniden adlandırılmaz veya taşınmaz.
//  • Eksik kategori / kanal / rolleri kurulum şablonuna göre oluşturur
//  • Kanal türüne uygun izinleri ekler (kanalda o rol/hedef için zaten bir izin ayarı varsa DOKUNMAZ)
//  • Eksik ayar bağlantılarını onarır (log, ticket kategorisi, hoş geldin, kayıt rolleri ...)
//  • Henüz panel gönderilmemiş kural / kayıt / ticket / rol-seçim kanallarına panel gönderir
// Seçenekler: onizleme (hiçbir şey değiştirmeden rapor), izinler, panel

const TM_BUILDING = new Set();
const TM_PF = PermissionsBitField.Flags;
const TM_REASON = "Endless Builder • kurulum tamamla";
const tmSleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// "📜・kurallar" / "kurallar" / "「 BİLGİ 」" → karşılaştırılabilir sade ad
const tmNorm = s => String(s || "").toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");
const tmRuleMap = obj => new Map(Object.entries(obj).map(([k, v]) => [tmNorm(k), v]));

// Rol adı (emojisiz metin) → anahtar. TAM eşleşme kullanılır ("Kayıt Yetkilisi" ≠ "Yetkili").
const TM_ROLE_KEYS = {
  "Yönetici": "admin", "Yetkili": "staff", "Destek Ekibi": "support", "Kayıt Yetkilisi": "registration",
  "Streamer": "streamer", "İçerik Üreticisi": "creator", "Booster": "booster",
  "Üye": "member", "Müşteri": "member", "Öğrenci": "student", "Bot": "bot",
  "Satış Ekibi": "sales", "Öğretmen": "teacher", "Kaptan": "captain", "Takım Üyesi": "teamMember", "Deneme Üyesi": "trial"
};
const TM_CONFIG_ROLE_KEYS = ["admin", "staff", "support", "registration", "streamer", "member", "booster", "bot"];
const TM_ROLE_COLORS = {
  admin: 0xed4245, staff: 0x5865f2, support: 0x57f287, registration: 0xfee75c, streamer: 0x9146ff,
  creator: 0x9146ff, booster: 0xf47fff, sales: 0xf1c40f, teacher: 0x3498db, captain: 0xe67e22
};
const TM_ROLE_PERMS = {
  admin: [TM_PF.ManageGuild, TM_PF.ManageChannels, TM_PF.ManageRoles, TM_PF.ManageMessages, TM_PF.KickMembers, TM_PF.BanMembers, TM_PF.ModerateMembers, TM_PF.ViewAuditLog],
  staff: [TM_PF.KickMembers, TM_PF.ModerateMembers, TM_PF.ManageMessages, TM_PF.ViewAuditLog]
};

// ro = herkes okur ama yazamaz | staff = sadece yetkililer | only = sadece bu roller (+yetkililer)
// post = salt okunur ama bu roller yazabilir | members = kayıtsız üyeler göremez | stream = yayın açma kısıtlı
const TM_CAT_RULES = tmRuleMap({
  "BİLGİ": { open: 1 }, "KAYIT": { open: 1 }, "DESTEK": { open: 1 }, "BAŞVURU": { open: 1 }, "YÖNETİM": { staff: 1 }
});
const TM_TEXT_RULES = tmRuleMap({
  "kurallar": { ro: 1 }, "duyurular": { ro: 1 }, "bilgilendirme": { ro: 1 }, "hoşgeldin": { ro: 1 },
  "sunucu-istatistik": { ro: 1 }, "takvim": { ro: 1 }, "sık-sorulanlar": { ro: 1 },
  "kayıt": { ro: 1 }, "kayıt-bilgi": { ro: 1 }, "kayıt-log": { staff: 1 }, "rol-seçim": { ro: 1, members: 1 },
  "ticket": { ro: 1 },
  "etkinlikler": { ro: 1 }, "turnuvalar": { ro: 1, post: ["captain"] }, "çekilişler": { ro: 1 },
  "yayın-duyuruları": { ro: 1, post: ["streamer", "creator"] }, "yayın-programı": { ro: 1, post: ["streamer"] },
  "yayıncılar": { ro: 1, post: ["streamer"] }, "yayıncı-sohbet": { only: ["streamer", "creator"] }, "streamer-başvuru": { ro: 1 },
  "mağaza": { ro: 1, post: ["sales"] }, "ürünler": { ro: 1, post: ["sales"] },
  "kampanyalar": { ro: 1, post: ["sales"] }, "indirimler": { ro: 1, post: ["sales"] }, "siparişler": { only: ["sales"] },
  "kadromuz": { ro: 1, post: ["captain"] }, "maçlar": { ro: 1, post: ["captain"] }, "sonuçlar": { ro: 1, post: ["captain"] },
  "başvuru-bilgi": { ro: 1 },
  "takım-sohbet": { only: ["teamMember", "captain"] }, "antrenman": { only: ["teamMember", "captain"] },
  "öğretmen": { only: ["teacher"] }
});
const TM_VOICE_RULES = tmRuleMap({
  "Yayıncı Odası": { only: ["streamer", "creator"] }, "Yayın Odası": { stream: 1 },
  "Takım 1": { only: ["teamMember", "captain"] }, "Takım 2": { only: ["teamMember", "captain"] },
  "Antrenman": { only: ["teamMember", "captain"] }
});
const TM_REG_CHANNELS = ["kayıt", "kayıt-bilgi", "kayıt-log", "rol-seçim"];

function tmOverwrites(ctx, f = {}, voice = false, catLevel = false) {
  const map = new Map();
  const get = id => { if (!map.has(id)) map.set(id, { id, allow: [], deny: [] }); return map.get(id); };
  const V = TM_PF.ViewChannel, S = TM_PF.SendMessages, C = TM_PF.Connect, ev = ctx.ev;
  const staffLike = [ctx.roles.admin, ctx.roles.staff].filter(Boolean);
  const pick = keys => (keys || []).map(k => ctx.roles[k]).filter(Boolean);
  const only = pick(f.only), post = pick(f.post);
  const meId = ctx.me?.id;

  if (meId) {
    const m = get(meId);
    if (voice) m.allow.push(V, C);
    else m.allow.push(V, S, TM_PF.EmbedLinks, TM_PF.AttachFiles);
  }

  if (f.staff || only.length) {
    get(ev).deny.push(V);
    for (const r of [...staffLike, ...only]) get(r.id).allow.push(V, voice ? C : S);
  } else if (ctx.regOn && (f.gated || f.members)) {
    get(ctx.unreg.id).deny.push(V, ...(voice ? [C] : []));
  }

  if (f.ro && !voice) {
    get(ev).deny.push(S, TM_PF.CreatePublicThreads, TM_PF.CreatePrivateThreads, TM_PF.SendMessagesInThreads);
    for (const r of [...staffLike, ...post]) get(r.id).allow.push(S);
  }
  if (f.stream && voice) {
    get(ev).deny.push(TM_PF.Stream);
    for (const r of [...staffLike, ...post, ...pick(["streamer", "creator"])]) get(r.id).allow.push(TM_PF.Stream);
  }

  let out = [...map.values()].filter(o => o.allow.length || o.deny.length);
  if (catLevel && out.length === 1 && out[0].id === meId) out = []; // sadece bot izni için kategoriye dokunma
  return out.map(o => ({
    id: o.id, type: o.id === meId ? OverwriteType.Member : OverwriteType.Role, allow: o.allow, deny: o.deny
  }));
}

// Var olan kanal/kategoriye SADECE eksik hedefler için izin ekler; var olan hiçbir izne dokunmaz.
async function tmMerge(channel, desired, rep, dry) {
  const list = [...desired].sort((a, b) => (b.type === OverwriteType.Member) - (a.type === OverwriteType.Member)); // bot önce
  for (const o of list) {
    if (channel.permissionOverwrites.cache.has(o.id)) { rep.permSkipped++; continue; }
    const target = o.type === OverwriteType.Member ? channel.guild.members.me
      : (o.id === channel.guild.id ? channel.guild.roles.everyone : channel.guild.roles.cache.get(o.id));
    if (!target) continue;
    if (dry) { rep.permAdded++; continue; }
    try {
      const obj = {};
      for (const n of new PermissionsBitField(o.allow).toArray()) obj[n] = true;
      for (const n of new PermissionsBitField(o.deny).toArray()) obj[n] = false;
      await channel.permissionOverwrites.create(target, obj, { reason: TM_REASON });
      rep.permAdded++;
      await tmSleep(150);
    } catch (error) {
      rep.permFail++;
    }
  }
}

function tmFindCategory(guild, own, catDef, used) {
  const target = tmNorm(catDef.name);
  const list = [...guild.channels.cache.values()].filter(c =>
    c.type === ChannelType.GuildCategory && !used.has(c.id) && tmNorm(c.name) === target);
  return list.find(c => own.has(c.id)) || list[0] || null;
}

function tmFindChannel(guild, own, type, base, parentId, used, allowMoved) {
  const target = tmNorm(base);
  const list = [...guild.channels.cache.values()].filter(c =>
    c.type === type && !used.has(c.id) && tmNorm(c.name) === target);
  return list.find(c => parentId && c.parentId === parentId)
    || (allowMoved ? list.find(c => own.has(c.id)) : null)
    || null;
}

async function tmHasBotPanel(channel) {
  const msgs = await channel.messages.fetch({ limit: 15 }).catch(() => null);
  if (!msgs) return true; // okuyamıyorsak tekrar gönderme
  return msgs.some(m => m.author.id === client.user.id && (m.embeds.length || m.components.length));
}

function tmRegisterPanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`${EMOJI.register} ${EMOJI.dot} Kayıt Merkezi`)
        .setDescription(
          `${EMOJI.spark} **Sunucuya hoş geldin!**\n\n` +
          "🔒 Yeni gelenler **Kayıtsız** rolüyle başlar.\n" +
          "🛡️ Kayıt işlemini sadece yetkililer yapar.\n\n" +
          "**Yetkililer için:**\n" +
          "`/kayit et @kullanıcı` → Cinsiyet + isim seçerek kayıt\n" +
          "`/kayit kayitsizlar` → Kayıtsız üyeleri listele\n" +
          "`/kayit cinsiyet` → Üyenin cinsiyetini düzelt (yetkili)\n\n" +
          "✅ Kayıt olunca **Kayıtlı** + seçilen cinsiyet rolü verilir.\n" +
          "✏️ İstersen kayıt sırasında isim de değiştirilebilir."
        )
        .setColor(0x57f287)
        .setFooter({ text: BRAND_FOOTER })
    ]
  };
}

function tmTicketPanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`${EMOJI.ticket} ${EMOJI.dot} Destek Merkezi`)
        .setDescription(
          `${EMOJI.spark} **Yardıma mı ihtiyacın var?** Konunu seçip butona bas, özel kanalın hemen açılsın.\n\n` +
          "🎫 **Destek** ➜ Genel sorular ve sorunlar\n" +
          "🛒 **Satın Alma** ➜ Ödeme ve ürün işlemleri\n" +
          "⚠️ **Şikayet** ➜ Kullanıcı / yetkili bildirimi\n" +
          "📩 **Diğer** ➜ Aklındaki her şey\n\n" +
          `${EMOJI.shield} Ticketın sadece sen ve yetkililer görebilir.\n` +
          "🔒 Kapatırken onay istenir, transcript kaydedilir."
        )
        .setColor(0x5865f2)
        .setFooter({ text: BRAND_FOOTER })
    ],
    components: [ticketPanelRow()]
  };
}

async function tmRun(guild, config, template, o, rep) {
  const { dry } = o;
  const f = new Set(config.features || []);
  const validRole = id => (id ? guild.roles.cache.get(id) || null : null);
  const byName = name => guild.roles.cache.find(r => r.name === name && !r.managed) || null;
  const textOf = n => n.split(" ").slice(1).join(" ");
  const validCh = id => Boolean(id && guild.channels.cache.has(id));

  config.createdIds ??= { categories: [], channels: [], roles: [] };
  config.createdIds.categories ??= []; config.createdIds.channels ??= []; config.createdIds.roles ??= [];
  config.roles ??= {}; config.channels ??= {};
  config.ticket ??= {}; config.welcome ??= {}; config.registration ??= {};

  // ---------- ESKİ HATA ONARIMI ----------
  // Eski kurulumda "📝 Kayıt Yetkilisi" adı "Yetkili" içerdiği için 'staff' kaydının üstüne yazılıyordu.
  if (config.roles.staff && config.roles.staff === config.roles.registration) {
    const staffName = template.roles.find(n => textOf(n) === "Yetkili");
    const real = staffName ? byName(staffName) : null;
    config.roles.staff = real ? real.id : null;
    rep.links.push("Yetkili rol kaydı düzeltildi (Kayıt Yetkilisi ile karışmıştı)");
  }

  // ---------- ROLLER ----------
  const roleObjs = {};
  const selectable = [];
  for (const rname of template.roles) {
    const key = TM_ROLE_KEYS[textOf(rname)] || null;
    const essential = key === "admin" || key === "staff"
      || (key === "support" && f.has("ticket"))
      || ((key === "registration" || key === "member") && f.has("registration"))
      || (key === "streamer" && config.setupType === "streamer");
    let role = (key && validRole(config.roles[key])) || byName(rname);

    if (!f.has("roles") && !essential) {
      if (role && key) roleObjs[key] = role;
      continue;
    }
    if (!role) {
      rep.roles.push(rname);
      if (!dry) {
        role = await guild.roles.create({
          name: rname, color: TM_ROLE_COLORS[key], hoist: key === "admin" || key === "staff",
          permissions: TM_ROLE_PERMS[key] || [], reason: TM_REASON
        });
        config.createdIds.roles.push(role.id);
        await tmSleep(250);
      }
    }
    if (!role) continue;
    if (key) {
      roleObjs[key] = role;
      if (TM_CONFIG_ROLE_KEYS.includes(key) && !validRole(config.roles[key])) config.roles[key] = role.id;
    } else {
      selectable.push(role);
    }
  }

  // ---------- KAYIT ROLLERİ ----------
  let unreg = null;
  if (f.has("registration")) {
    unreg = validRole(config.registration.unregisteredRoleId || config.roles.unregistered) || byName("🔒 Kayıtsız");
    if (!unreg) {
      rep.roles.push("🔒 Kayıtsız");
      if (!dry) {
        unreg = await guild.roles.create({ name: "🔒 Kayıtsız", color: 0x95a5a6, permissions: [], reason: TM_REASON });
        config.createdIds.roles.push(unreg.id);
        await tmSleep(250);
      }
    }
    if (unreg) {
      if (config.registration.unregisteredRoleId !== unreg.id) rep.links.push("Kayıtsız rolü ayara bağlandı");
      config.roles.unregistered = unreg.id;
      config.registration.unregisteredRoleId = unreg.id;
    }
    if (!validRole(config.registration.registeredRoleId) && roleObjs.member) {
      config.registration.registeredRoleId = roleObjs.member.id;
      rep.links.push("Kayıtlı (Üye) rolü kayıt sistemine bağlandı");
    }
    if (!validRole(config.registration.staffRoleId)) {
      const r = roleObjs.registration || roleObjs.staff;
      if (r) { config.registration.staffRoleId = r.id; rep.links.push("Kayıt yetkili rolü bağlandı"); }
    }
    if (config.registration.genderEnabled !== false) {
      const missing = ["male", "female", "unspecified"].filter(k => !validRole(config.roles[k]));
      if (missing.length) {
        if (dry) rep.roles.push("Cinsiyet rolleri (eksik olanlar)");
        else {
          const before = config.createdIds.roles.length;
          await ensureGenderRoles(guild, config);
          const made = config.createdIds.roles.length - before;
          if (made > 0) rep.roles.push(`Cinsiyet rolleri (${made})`);
        }
      }
    }
  }
  if (f.has("ticket") && !validRole(config.ticket.staffRoleId)) {
    const r = roleObjs.support || roleObjs.staff;
    if (r) { config.ticket.staffRoleId = r.id; rep.links.push("Ticket yetkili rolü bağlandı"); }
  }

  // ---------- KATEGORİ + KANALLAR ----------
  const ctx = {
    ev: guild.id, me: guild.members.me, roles: roleObjs, unreg,
    regOn: Boolean(unreg && config.toggles?.registration !== false)
  };
  const sel = config.selectedCategories?.length ? config.selectedCategories : template.categories.map(c => c.name);
  const voiceLimit = config.voiceCount || 4;
  const own = new Set(config.createdIds.channels);
  const usedCats = new Set(), usedCh = new Set();
  const style = config.channelStyle || "emoji", catStyle = config.categoryStyle || "emoji";
  const panels = {};
  let afkChannel = null;
  let overLimit = false;
  const canMake = () => {
    if (guild.channels.cache.size + rep.made >= 495) { overLimit = true; return false; }
    return true;
  };
  const skipText = base =>
    (base === "ticket" && !f.has("ticket")) ||
    (TM_REG_CHANNELS.includes(base) && !f.has("registration")) ||
    (base === "hoşgeldin" && !f.has("welcome"));

  for (const catDef of template.categories) {
    if (!sel.includes(catDef.name)) continue;
    const catRule = TM_CAT_RULES.get(tmNorm(catDef.name)) || {};
    const catFlags = { staff: catRule.staff, gated: !catRule.open && !catRule.staff };
    const texts = (catDef.channels || []).filter(n => !skipText(n));
    const voices = (catDef.voice || []).slice(0, Math.min(catDef.voice?.length || 0, voiceLimit));
    const catOw = tmOverwrites(ctx, catFlags, false, true);

    let category = tmFindCategory(guild, own, catDef, usedCats);
    if (category) {
      usedCats.add(category.id);
      if (o.withPerms) await tmMerge(category, catOw, rep, dry);
    } else if (texts.length || voices.length) {
      if (!canMake()) continue;
      rep.cats.push(catDef.name); rep.made++;
      if (!dry) {
        category = await guild.channels.create({
          name: formatCategoryName(catDef, catStyle), type: ChannelType.GuildCategory,
          permissionOverwrites: o.withPerms ? catOw : undefined, reason: TM_REASON
        });
        config.createdIds.categories.push(category.id);
        usedCats.add(category.id);
        await tmSleep(250);
      }
    } else continue;

    if (catDef.name === "DESTEK" && f.has("ticket") && category && !validCh(config.ticket.categoryId)) {
      config.ticket.categoryId = category.id;
      rep.links.push("Ticket kategorisi bağlandı");
    }

    // Yazı kanalları
    for (const base of texts) {
      const rule = TM_TEXT_RULES.get(tmNorm(base)) || {};
      const ow = tmOverwrites(ctx, { ...rule, staff: rule.staff || catRule.staff, gated: catFlags.gated }, false);
      let ch = tmFindChannel(guild, own, ChannelType.GuildText, base, category?.id, usedCh, true);
      if (ch) {
        usedCh.add(ch.id);
        if (o.withPerms) await tmMerge(ch, ow, rep, dry);
      } else {
        if (!canMake()) continue;
        rep.chs.push(base); rep.made++;
        if (!dry) {
          ch = await guild.channels.create({
            name: formatChannelName(base, style), type: ChannelType.GuildText, parent: category?.id,
            permissionOverwrites: o.withPerms ? ow : undefined, reason: TM_REASON
          });
          config.createdIds.channels.push(ch.id);
          usedCh.add(ch.id);
          await tmSleep(250);
        }
      }
      if (!ch) continue;

      if (base === "log" && !validCh(config.channels.log)) { config.channels.log = ch.id; rep.links.push("Log kanalı bağlandı"); }
      if (base === "hoşgeldin" && f.has("welcome") && !validCh(config.welcome.channelId)) {
        config.welcome.channelId = ch.id; rep.links.push("Hoş geldin kanalı bağlandı");
      }
      if (base === "kayıt") { panels.kayit = ch; if (!validCh(config.registrationPanelChannel)) config.registrationPanelChannel = ch.id; }
      if (base === "ticket") { panels.ticket = ch; if (!validCh(config.ticketPanelChannel)) config.ticketPanelChannel = ch.id; }
      if (base === "kurallar") panels.rules = ch;
      if (base === "rol-seçim") panels.role = ch;
    }

    // Ses kanalları
    for (const vname of voices) {
      const rule = TM_VOICE_RULES.get(tmNorm(vname)) || {};
      const ow = tmOverwrites(ctx, { ...rule, staff: catRule.staff, gated: catFlags.gated }, true);
      let vc = tmFindChannel(guild, own, ChannelType.GuildVoice, vname, category?.id, usedCh, false);
      if (vc) {
        usedCh.add(vc.id);
        if (o.withPerms) await tmMerge(vc, ow, rep, dry);
      } else {
        if (!canMake()) continue;
        rep.chs.push(`🔊 ${vname}`); rep.made++;
        if (!dry) {
          vc = await guild.channels.create({
            name: vname, type: ChannelType.GuildVoice, parent: category?.id,
            permissionOverwrites: o.withPerms ? ow : undefined, reason: TM_REASON
          });
          config.createdIds.channels.push(vc.id);
          usedCh.add(vc.id);
          await tmSleep(250);
        }
      }
      if (vc && tmNorm(vname) === "afk") afkChannel = vc;
    }
  }
  if (overLimit) rep.notes.push("⚠️ Sunucu kanal limitine yaklaşıldığı için bazı kanallar oluşturulmadı.");

  // ---------- AFK KANALI ----------
  if (afkChannel && !guild.afkChannelId) {
    rep.links.push("AFK kanalı sunucu ayarına bağlandı");
    if (!dry) await guild.setAFKChannel(afkChannel, TM_REASON).catch(() => rep.notes.push("⚠️ AFK kanalı sunucuya bağlanamadı (Sunucuyu Yönet yetkisi gerekir)."));
  }

  // ---------- PANELLER ----------
  if (o.withPanels) {
    const me = guild.members.me;
    const canSend = ch => ch.permissionsFor(me)?.has([F.ViewChannel, F.SendMessages, F.EmbedLinks]);

    const post = async (channel, label, payload) => {
      if (!channel || !payload) return;
      if (!canSend(channel)) { rep.notes.push(`⚠️ ${label}: ${channel} kanalında mesaj yetkim yok.`); return; }
      if (await tmHasBotPanel(channel)) return;
      rep.panels.push(label);
      if (!dry) await channel.send(payload).catch(() => rep.notes.push(`⚠️ ${label} gönderilemedi.`));
    };

    await post(panels.rules, "📜 Kurallar", { embeds: [spRulesEmbed(template.name, false)] });
    if (f.has("registration")) await post(panels.kayit, "📝 Kayıt paneli", tmRegisterPanel());
    if (f.has("ticket") && validCh(config.ticket.categoryId)) await post(panels.ticket, "🎫 Ticket paneli", tmTicketPanel());

    // Rol seçim paneli: yalnızca sıradan (yetkisiz) şablon rolleri ve panel daha önce kurulmamışsa
    if (panels.role && !config.rolePanel?.messageId && selectable.length) {
      const top = me.roles.highest.position;
      const roles = selectable.filter(r => !r.managed && r.position < top).slice(0, 25);
      if (roles.length && canSend(panels.role) && !(await tmHasBotPanel(panels.role))) {
        rep.panels.push("🎭 Rol seçim paneli");
        if (!dry) {
          const msg = await createRolePanel(panels.role, roles).catch(() => null);
          if (msg) config.rolePanel = { channelId: panels.role.id, messageId: msg.id, roles: roles.map(r => r.id) };
        }
      }
    }
  }
}

async function tmHandle(interaction) {
  const guild = interaction.guild;
  if (!isAdmin(interaction)) return deny(interaction, "❌ Bu komut için **Yönetici** yetkisi gerekir.");

  const real = getServerConfig(guild.id);
  const template = templates[real.setupType];
  if (!real.setupCompleted || !template) return deny(interaction, "❌ Önce `/setup` ile Builder kurulumu yapmalısın.");

  const lack = botLacks(interaction, F.ManageChannels, "Kanalları Yönet") || botLacks(interaction, F.ManageRoles, "Rolleri Yönet");
  if (lack) return deny(interaction, lack);
  if (TM_BUILDING.has(guild.id) || SP_BUILDING.has(guild.id)) return deny(interaction, "⏳ Bu sunucuda zaten bir kurulum çalışıyor, bitmesini bekle.");

  const dry = interaction.options.getBoolean("onizleme") ?? false;
  const withPerms = interaction.options.getBoolean("izinler") ?? true;
  const withPanels = interaction.options.getBoolean("panel") ?? true;

  await interaction.deferReply({ ephemeral: true });
  TM_BUILDING.add(guild.id);

  // Önizlemede gerçek ayarlara hiç dokunma: kopya üzerinde çalış.
  const config = dry ? structuredClone(real) : real;
  const rep = { roles: [], cats: [], chs: [], links: [], panels: [], notes: [], made: 0, permAdded: 0, permSkipped: 0, permFail: 0 };

  try {
    await guild.channels.fetch().catch(() => {});
    await guild.roles.fetch().catch(() => {});
    await tmRun(guild, config, template, { dry, withPerms, withPanels }, rep);
  } catch (error) {
    console.error("TAMAMLA ERROR:", error);
    rep.notes.push(`❌ İşlem yarıda kaldı: ${error.message}`);
  } finally {
    if (!dry) saveServerConfig(guild.id, config);
    TM_BUILDING.delete(guild.id);
  }

  const lst = (a, m = 10) => (a.length ? (a.slice(0, m).join(", ") + (a.length > m ? ` … +${a.length - m}` : "")).slice(0, 1000) : "—");
  const changed = rep.roles.length || rep.cats.length || rep.chs.length || rep.permAdded || rep.links.length || rep.panels.length;
  const verb = dry ? "Eklenecek" : "Eklenen";

  const embed = new EmbedBuilder()
    .setColor(dry ? 0xfaa61a : 0x57f287)
    .setTitle(dry ? "🔍 Önizleme — hiçbir şey değiştirilmedi" : "✅ Kurulum tamamlandı")
    .addFields(
      { name: "🎭 Roller", value: lst(rep.roles) },
      { name: "📁 Kategoriler", value: lst(rep.cats) },
      { name: "💬 Kanallar", value: lst(rep.chs) },
      {
        name: "🔐 İzinler",
        value: withPerms
          ? `${verb}: **${rep.permAdded}** • Mevcut ayarına dokunulmayan: **${rep.permSkipped}**${rep.permFail ? ` • Hata: **${rep.permFail}**` : ""}`
          : "Atlandı (izinler: False)"
      },
      { name: "🔗 Ayarlar", value: lst(rep.links, 8) },
      { name: "📌 Paneller", value: lst(rep.panels) }
    )
    .setFooter({ text: BRAND_FOOTER });

  const tips = [...rep.notes];
  if (!changed && !rep.notes.length) tips.push("✨ Her şey yerinde, eksik bir şey bulunamadı.");
  if (dry) tips.push("Uygulamak için `/kurulum tamamla` komutunu `onizleme` olmadan çalıştır.");
  else if (rep.roles.length) tips.push("⚠️ Bot rolünün, oluşturulan rollerin **üstünde** olduğundan emin ol.");
  embed.setDescription(tips.join("\n") || null);

  if (!dry && changed) {
    await sendLog(guild, `🧩 ${interaction.user} **kurulum tamamla** çalıştırdı: ${rep.roles.length} rol, ${rep.cats.length} kategori, ${rep.chs.length} kanal, ${rep.permAdded} izin, ${rep.panels.length} panel.`);
  }
  return interaction.editReply({ embeds: [embed] });
}

commands.push(
  new SlashCommandBuilder().setName("kurulum-tamamla").setDescription("Kurulu düzeni bozmadan eksik kanal, rol, izin ve panelleri tamamla")
    .setDefaultMemberPermissions(F.Administrator).setDMPermission(false)
    .addBooleanOption(o => o.setName("onizleme").setDescription("Sadece ne yapılacağını göster, hiçbir şeyi değiştirme"))
    .addBooleanOption(o => o.setName("izinler").setDescription("Kanallara türüne uygun izinler eklensin mi? (varsayılan evet)"))
    .addBooleanOption(o => o.setName("panel").setDescription("Boş panel kanallarına kural/kayıt/ticket paneli gönderilsin mi? (varsayılan evet)"))
);

async function handleExtraInteraction(interaction) {
  if (!interaction.guild) {
    if (interaction.isRepliable?.() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Bu bot sadece sunucularda kullanılabilir.", ephemeral: true }).catch(() => {});
      return true;
    }
    return false;
  }

  const config = ensureExtraConfig(getServerConfig(interaction.guildId));

  if (interaction.isChatInputCommand?.() && interaction.commandName === "kurulum-tamamla") { await tmHandle(interaction); return true; }
  if (await handleStreamerPlus(interaction, config)) return true;
  if (await handleStreamerExtras(interaction, config)) return true;

  if (interaction.isChatInputCommand()) {
    const n = interaction.commandName;
    if (typeof GROUPED_TOP_LEVEL !== "undefined" && GROUPED_TOP_LEVEL.includes(n)) {
      await handleGroupedCommand(interaction);
      return true;
    }
    if (MOD_COMMANDS.includes(n)) { await handleModeration(interaction); return true; }
    if (n === "para-ver") { await handleParaVer(interaction); return true; }
    if (typeof UTILITY_COMMANDS !== "undefined" && UTILITY_COMMANDS.includes(n)) {
      await handleUtilityCommand(interaction);
      return true;
    }
    if (typeof MUSIC_COMMANDS !== "undefined" && MUSIC_COMMANDS.includes(n)) {
      await handleMusicCommand(interaction);
      return true;
    }
    if (n === "öneri" || n === "öneri-kanal" || n === "oneri" || n === "oneri-kanal") {
      await handleOneriCommand(interaction);
      return true;
    }
    if (n === "automod") { await handleAutoModCommand(interaction); return true; }
    if (n === "antiraid") { await handleAntiRaidCommand(interaction); return true; }
    if (n === "ai" || n === "ai-kanal") { await handleAiCommand(interaction); return true; }
    if (n === "premium") { await handlePremium(interaction); return true; }
    if (n === "yardım") { await interaction.reply(helpHome()); return true; }
    if (n === "ayarlar") {
      if (!canManageGuild(interaction)) { await deny(interaction, "❌ Bu komut için **Sunucuyu Yönet** yetkisi gerekir."); return true; }
      await interaction.reply({ ...settingsPanel(config), ephemeral: true });
      return true;
    }
    if (n === "ticket-panel" && !config.toggles.ticket) { await deny(interaction, "❌ Ticket sistemi bu sunucuda kapalı."); return true; }
    if (n === "streamer-panel" && !config.toggles.streamer) { await deny(interaction, "❌ Streamer sistemi bu sunucuda kapalı."); return true; }
    if ((n === "kayit" || n === "kayit-panel") && !config.toggles.registration) { await deny(interaction, "❌ Kayıt sistemi bu sunucuda kapalı."); return true; }
    return false;
  }

  if (interaction.isStringSelectMenu()) {
    const id = interaction.customId;
    if (id === "eb_rolesel") { await handleRoleSelect(interaction); return true; }
    if (id === "eb_x_settings") { await handleSettingsSelect(interaction); return true; }
    if (id === "eb_x_am_rules" || id === "eb_x_am_punish") { await handleAutoModComponent(interaction); return true; }
    if (id === "eb_x_help") { await interaction.update(helpCategory(interaction.values[0])); return true; }
    return false;
  }

  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id === "eb_x_am_master") { await handleAutoModComponent(interaction); return true; }
    if (TICKET_OPEN_IDS[id] && !config.toggles.ticket) { await deny(interaction, "❌ Ticket sistemi bu sunucuda kapalı."); return true; }
    if (id === "eb_streamer_apply" && !config.toggles.streamer) { await deny(interaction, "❌ Streamer sistemi bu sunucuda kapalı."); return true; }
    if (id.startsWith("eb_role_") && !config.toggles.rolePanel) { await deny(interaction, "❌ Rol sistemi bu sunucuda kapalı."); return true; }
    return false;
  }

  return false;
}

// Temizlik: bellekte biriken takip kayıtları
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of amTrack) if (now - t.seen > 60000) amTrack.delete(k);
  for (const [k, list] of arTrack) if (!list.length || now - list[list.length - 1] > 10000) arTrack.delete(k);
  for (const [k, list] of nukeTracker) if (!list.length || now - list[list.length - 1] > 60000) nukeTracker.delete(k);
  for (const [k, t] of aiCooldowns) if (now - t > 60000) aiCooldowns.delete(k);
  for (const [k, tr] of joinTracker) if (tr.raidUntil < now && !tr.entries.some(e => now - e.t < 120000)) joinTracker.delete(k);
}, 5 * 60 * 1000).unref();



// ======================================================
// ROL AYARLARI: /yonetim rol-ayarla  &  /yonetim rol-liste
// Her rol tek yerden seçilir, sonradan değiştirilir. Tüm sistemler
// (streamer paneli, kayıt, ticket, otorol...) bu ayarları okur.
// ======================================================

const ROLE_SLOTS = {
  streamer:        { label: "🎥 Streamer",          get: c => c.roles?.streamer,                 set: (c, id) => { c.roles.streamer = id; } },
  kayitli:         { label: "✅ Kayıtlı / Üye",      get: c => c.registration?.registeredRoleId || c.roles?.member, set: (c, id) => { c.roles.member = id; c.registration.registeredRoleId = id; } },
  kayitsiz:        { label: "🚫 Kayıtsız",           get: c => c.registration?.unregisteredRoleId || c.roles?.unregistered, set: (c, id) => { c.roles.unregistered = id; c.registration.unregisteredRoleId = id; } },
  erkek:           { label: "🔵 Erkek",              get: c => c.roles?.male,                     set: (c, id) => { c.roles.male = id; } },
  kadin:           { label: "🔴 Kadın",              get: c => c.roles?.female,                   set: (c, id) => { c.roles.female = id; } },
  belirsiz:        { label: "⚪ Belirtmeyen",         get: c => c.roles?.unspecified,              set: (c, id) => { c.roles.unspecified = id; } },
  yetkili:         { label: "🛡️ Yetkili",            get: c => c.roles?.staff,                    set: (c, id) => { c.roles.staff = id; } },
  destek:          { label: "🎫 Destek ekibi",        get: c => c.ticket?.staffRoleId || c.roles?.support, set: (c, id) => { c.roles.support = id; c.ticket.staffRoleId = id; } },
  kayit_yetkili:   { label: "📝 Kayıt yetkilisi",     get: c => c.registration?.staffRoleId || c.roles?.registration, set: (c, id) => { c.roles.registration = id; c.registration.staffRoleId = id; } },
  otorol:          { label: "👋 Otorol",              get: c => c.welcome?.autoRoleId,             set: (c, id) => { c.welcome.autoRoleId = id; } },
  yas18:           { label: "🔞 +18",                 get: c => c.streamerPlus?.adultRoleId,       set: (c, id) => { c.streamerPlus.adultRoleId = id; } },
  yayin_bildirim:  { label: "📣 Yayın bildirim",      get: c => c.streamerPlus?.notifyRoleId,      set: (c, id) => { c.streamerPlus.notifyRoleId = id; } },
  basvuru_yetkili: { label: "📋 Başvuru yetkilisi",   get: c => c.streamerPlus?.applications?.reviewerRoleId, set: (c, id) => { c.streamerPlus.applications.reviewerRoleId = id; } },
  booster:         { label: "🚀 Booster",             get: c => c.roles?.booster,                  set: (c, id) => { c.roles.booster = id; } }
};

function prepRoleConfig(config) {
  config.roles ??= {};
  config.registration ??= {};
  config.ticket ??= { categoryId: null, staffRoleId: null, claimedBy: {} };
  config.welcome ??= { enabled: false, channelId: null, autoRoleId: null };
  spCfg(config); // streamerPlus varsayılanlarını tamamlar
  return config;
}

async function handleRoleSettings(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const config = prepRoleConfig(getServerConfig(guild.id));
    const me = guild.members.me;
    const changes = [];
    const warns = [];

    // Seçilen roller
    for (const [key, slot] of Object.entries(ROLE_SLOTS)) {
      const role = interaction.options.getRole(key);
      if (!role) continue;
      if (role.id === guild.id) { warns.push(`⚠️ ${slot.label}: @everyone seçilemez.`); continue; }
      if (role.managed) { warns.push(`⚠️ ${slot.label}: ${role} bir bot/entegrasyon rolü, seçilemez.`); continue; }
      const before = slot.get(config);
      slot.set(config, role.id);
      changes.push(`${slot.label}: ${before ? `<@&${before}> → ` : ""}${role}`);
      // Verilecek roller için bot hiyerarşisi kontrolü
      if (["streamer", "kayitli", "erkek", "kadin", "belirsiz", "otorol", "yas18", "yayin_bildirim", "booster"].includes(key)
          && me && role.position >= me.roles.highest.position) {
        warns.push(`⚠️ ${slot.label}: ${role} botun rolünden yüksek/eşit, veremem. Bot rolünü bunun üstüne taşı.`);
      }
    }

    // Temizle
    const clear = interaction.options.getString("temizle");
    if (clear && ROLE_SLOTS[clear]) {
      const slot = ROLE_SLOTS[clear];
      const before = slot.get(config);
      slot.set(config, null);
      changes.push(`${slot.label}: ${before ? `<@&${before}> → ` : ""}kaldırıldı`);
    }

    if (!changes.length && !warns.length) {
      return interaction.editReply({ content: "ℹ️ Değiştirilecek bir şey seçmedin. Bir veya birkaç rol seç, ya da `temizle` ile bir ayarı kaldır.\nMevcut roller için `/yonetim rol-liste`." });
    }

    saveServerConfig(guild.id, config);
    if (changes.length) await sendLog(guild, `🎭 **Rol ayarı değişti** — ${interaction.user}\n${changes.join("\n")}`).catch(() => {});

    const lines = [];
    if (changes.length) lines.push("✅ **Güncellendi**\n" + changes.join("\n"));
    if (warns.length) lines.push(warns.join("\n"));
    return interaction.editReply({ content: lines.join("\n\n").slice(0, 1900), allowedMentions: { parse: [] } });
  } catch (e) {
    console.error("ROL AYARLA ERROR:", e.message);
    const msg = { content: `❌ Rol ayarı kaydedilemedi: ${String(e.message).slice(0, 200)}` };
    if (interaction.deferred || interaction.replied) return interaction.editReply(msg).catch(() => {});
    return interaction.reply({ ...msg, ephemeral: true }).catch(() => {});
  }
}

async function handleRoleList(interaction) {
  try {
    const guild = interaction.guild;
    const config = prepRoleConfig(getServerConfig(guild.id));
    const lines = Object.values(ROLE_SLOTS).map(slot => {
      const id = slot.get(config);
      const ok = id && guild.roles.cache.has(id);
      return `${slot.label}: ${id ? (ok ? `<@&${id}>` : `~~${id}~~ *(rol silinmiş)*`) : "—"}`;
    });
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎭 Sistem Rolleri")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Değiştirmek için /yonetim rol-ayarla • Kaldırmak için temizle seçeneği" });
    return interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
  } catch (e) {
    console.error("ROL LISTE ERROR:", e.message);
    return interaction.reply({ content: "❌ Roller listelenemedi.", ephemeral: true }).catch(() => {});
  }
}

// ======================================================
// EKSTRA: /yonetim komut-yenile  &  /arac botbilgi
// ======================================================

async function handleCommandRefresh(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    const payload = buildSlashPayload();
    const problems = validatePayload(payload);
    if (problems.length) {
      return interaction.editReply({
        content: "❌ Komut tanımlarında hata var, yükleme yapılmadı:\n" + problems.slice(0, 10).map(p => "• " + p).join("\n")
      });
    }
    await client.application.commands.set(payload, interaction.guildId);
    let live = payload.length;
    try {
      const cur = await client.application.commands.fetch({ guildId: interaction.guildId });
      live = cur.size;
    } catch {}
    return interaction.editReply({
      content:
        `✅ **${payload.length}** komut bu sunucuya yeniden yüklendi (Discord'da şu an **${live}** komut görünüyor).\n` +
        "Değişiklik görünmüyorsa Discord'u **Ctrl+R** ile yenile."
    });
  } catch (e) {
    console.error("KOMUT YENILE ERROR:", e.message);
    const msg = { content: `❌ Komutlar yüklenemedi: ${String(e.message).slice(0, 300)}` };
    if (interaction.deferred || interaction.replied) return interaction.editReply(msg).catch(() => {});
    return interaction.reply({ ...msg, ephemeral: true }).catch(() => {});
  }
}

function formatUptime(ms) {
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return [d && `${d}g`, h && `${h}sa`, m && `${m}dk`, `${s}sn`].filter(Boolean).join(" ");
}

async function handleBotInfo(interaction) {
  try {
    const mem = process.memoryUsage().rss / 1024 / 1024;
    const users = client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🤖 ${client.user.username} — Bot Bilgisi`)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: "⏱️ Çalışma süresi", value: formatUptime(client.uptime || 0), inline: true },
        { name: "📡 Gecikme", value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: "🧠 Bellek", value: `${mem.toFixed(0)} MB`, inline: true },
        { name: "🌐 Sunucu", value: String(client.guilds.cache.size), inline: true },
        { name: "👥 Üye", value: String(users), inline: true },
        { name: "⌨️ Komut", value: String(buildSlashPayload().length), inline: true },
        { name: "🧩 Sürüm", value: `Node ${process.version} • discord.js ${require("discord.js").version}`, inline: false }
      )
      .setFooter({ text: BRAND_FOOTER })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  } catch (e) {
    console.error("BOTBILGI ERROR:", e.message);
    return interaction.reply({ content: "❌ Bilgi alınamadı.", ephemeral: true }).catch(() => {});
  }
}

// ======================================================
// READY
// ======================================================

let __readyHandled = false;
const onClientReady = async () => {
  if (__readyHandled) return;
  __readyHandled = true;

    console.log(
      `✅ ${client.user.tag} aktif!`
    );

    try {

      const guildId =
        process.env.GUILD_ID;

      let registered = false;

      await registerCommandsEverywhere();

      // Davet önbelleği
      for (const g of client.guilds.cache.values()) {
        await cacheGuildInvites(g).catch(() => {});
      }
      console.log("READY INVITE CACHE ok");
    } catch (error) {
      console.error("COMMAND REGISTER ERROR:", error);
      if (error?.rawError) console.error("Discord raw:", JSON.stringify(error.rawError).slice(0, 500));
    }

    // İlk istatistik güncellemesi (yavaş yavaş, rate limit'e takılmadan)
    try {

      for (
        const guild
        of client.guilds.cache.values()
      ) {

        if (
          !getServerConfig(guild.id).stats?.enabled
        ) {
          continue;
        }

        await updateServerStats(
          guild,
          true
        );

        await new Promise(
          resolve =>
            setTimeout(resolve, 1500)
        );
      }

    } catch (error) {

      console.error(
        "READY STATS ERROR:",
        error
      );
    }
};
client.once("ready", onClientReady);
client.once("clientReady", onClientReady);

// ======================================================
// INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {

    try {

      // Aşama 7-16 sistemleri (moderasyon, automod, anti-raid, ai, ayarlar, yardım, premium...)
      if (await handleExtraInteraction(interaction)) return;

      // =================================================
      // SLASH COMMANDS
      // =================================================

      if (
        interaction.isChatInputCommand()
      ) {

        const {
          commandName
        } = interaction;

        // ===============================================
        // SETUP
        // ===============================================

        if (
          commandName === "setup"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (
            config.setupCompleted
          ) {

            return interaction.reply({
              content:
                "❌ Bu sunucuda zaten Builder kurulumu var.\n" +
                "`/kurulum degistir` kullanabilirsin.",
              ephemeral: true
            });
          }

          setSession(
            interaction,
            {
              changing: false,
              type: null,
              channelStyle:
                "emoji",
              categoryStyle:
                "emoji",
              selectedCategories: [],
              features: [],
              voiceCount: 4
            }
          );

          return interaction.reply({
            content:
              "## 🏗️ Endless Builder\n\n" +
              "Sunucu türünü seç:",
            components: [
              createSetupMenu()
            ],
            ephemeral: true
          });
        }

        // ===============================================
        // SETUP CHANGE
        // ===============================================

        if (
          commandName ===
          "setup-degistir"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (
            !config.setupCompleted
          ) {

            return interaction.reply({
              content:
                "❌ Bu sunucuda aktif bir Builder kurulumu yok.",
              ephemeral: true
            });
          }

          setSession(
            interaction,
            {
              changing: true,
              oldType:
                config.setupType,
              type: null,
              channelStyle:
                "emoji",
              categoryStyle:
                "emoji",
              selectedCategories: [],
              features: [],
              voiceCount: 4
            }
          );

          return interaction.reply({
            content:
              "⚠️ **Builder kurulumu değiştirilecek.**\n\n" +
              "Builder'ın oluşturduğu mevcut yapı temizlenip yeni yapı kurulacak.\n\n" +
              "Yeni sunucu türünü seç:",
            components: [
              createSetupMenu()
            ],
            ephemeral: true
          });
        }

        // ===============================================
        // SETUP STATUS
        // ===============================================

        if (
          commandName ===
          "setup-durum"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (
            !config.setupCompleted
          ) {

            return interaction.reply({
              content:
                "❌ Builder henüz kurulmamış.",
              ephemeral: true
            });
          }

          const template =
            templates[
              config.setupType
            ];

          return interaction.reply({
            content: [
              "## 📊 Endless Builder Durumu",
              "",
              `**Tür:** ${
                template?.emoji ||
                "📦"
              } ${
                template?.name ||
                config.setupType
              }`,
              `**Kategoriler:** ${
                config.selectedCategories
                  ?.length || 0
              }`,
              `**Kayıt:** ${
                config.features?.includes(
                  "registration"
                )
                  ? "🟢"
                  : "🔴"
              }`,
              `**Ticket:** ${
                config.features?.includes(
                  "ticket"
                )
                  ? "🟢"
                  : "🔴"
              }`,
              `**Hoş Geldin:** ${
                config.features?.includes(
                  "welcome"
                )
                  ? "🟢"
                  : "🔴"
              }`,
              `**İstatistik:** ${
                config.stats?.enabled
                  ? "🟢"
                  : "🔴"
              }`,
              `**Rol Paneli:** ${
                config.rolePanel?.messageId
                  ? "🟢"
                  : "🔴"
              }`,
              `**Ses:** ${
                config.voiceCount || 4
              }`,
              `**Kanal stili:** ${
                config.channelStyle
              }`,
              `**Kategori stili:** ${
                config.categoryStyle
              }`,
              "",
              "🟢 Builder aktif."
            ].join("\n"),
            ephemeral: true
          });
        }

        // ===============================================
        // SUNUCU TEMİZLE
        // ===============================================

        if (
          commandName ===
          "sunucu-temizle"
        ) {

          if (!isAdmin(interaction)) {

            return interaction.reply({
              content:
                "❌ Bu komut sadece sunucu sahibi veya Administrator içindir.",
              ephemeral: true
            });
          }

          const row =
            new ActionRowBuilder()
              .addComponents(

                new ButtonBuilder()
                  .setCustomId(
                    "clear_all_confirm"
                  )
                  .setLabel(
                    "EVET, TÜM KANALLARI SİL"
                  )
                  .setStyle(
                    ButtonStyle.Danger
                  ),

                new ButtonBuilder()
                  .setCustomId(
                    "clear_all_cancel"
                  )
                  .setLabel("İptal")
                  .setStyle(
                    ButtonStyle.Secondary
                  )
              );

          return interaction.reply({
            content:
              "⚠️ **DİKKAT!**\n\n" +
              "Bu işlem sunucudaki **TÜM KANALLARI** siler.\n" +
              "Builder'ın oluşturduğu veya senin oluşturduğun fark etmez.\n\n" +
              "**Roller silinmez.**\n\n" +
              "Devam etmek istediğine emin misin?",
            components: [
              row
            ],
            ephemeral: true
          });
        }

        // ===============================================
        // TICKET PANEL
        // ===============================================

        if (
          commandName ===
          "ticket-panel"
        ) {

          if (
            !hasPermission(
              interaction,
              PermissionsBitField.Flags.ManageGuild
            )
          ) {

            return interaction.reply({
              content:
                "❌ Bu komut için yetkin yok.",
              ephemeral: true
            });
          }

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (
            !config.ticket.categoryId
          ) {

            return interaction.reply({
              content:
                "❌ Ticket sistemi kurulu değil. Önce `/kurulum degistir` ile Ticket özelliğini aç.",
              ephemeral: true
            });
          }

          const row = ticketPanelRow();

          return postPanel(
            interaction,
            {
              embeds: [
                new EmbedBuilder()
                  .setTitle(`${EMOJI.ticket} ${EMOJI.dot} Destek Merkezi`)
                  .setDescription(
                    `${EMOJI.spark} **Yardıma mı ihtiyacın var?** Konunu seçip butona bas, özel kanalın hemen açılsın.\n\n` +
                    "🎫 **Destek** ➜ Genel sorular ve sorunlar\n" +
                    "🛒 **Satın Alma** ➜ Ödeme ve ürün işlemleri\n" +
                    "⚠️ **Şikayet** ➜ Kullanıcı / yetkili bildirimi\n" +
                    "📩 **Diğer** ➜ Aklındaki her şey\n\n" +
                    `${EMOJI.shield} Ticketın sadece sen ve yetkililer görebilir.\n` +
                    "🔒 Kapatırken onay istenir, transcript kaydedilir."
                  )
                  .setColor(0x5865f2)
                  .setFooter({ text: BRAND_FOOTER })
              ],
              components: [row]
            },
            `${EMOJI.ok} Ticket paneli bu kanala gönderildi.`
          );
        }

        // ===============================================
        // TICKET DEVRAL
        // ===============================================

        if (
          commandName ===
          "ticket-devral"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          const ticket =
            Object.entries(
              config.tickets || {}
            ).find(
              ([, channelId]) =>
                channelId ===
                interaction.channelId
            );

          if (!ticket) {

            return interaction.reply({
              content:
                "❌ Bu kanal bir ticket değil.",
              ephemeral: true
            });
          }

          const staffRoleId =
            config.ticket
              ?.staffRoleId;

          if (
            !isAdmin(interaction) &&
            !hasRole(
              interaction.member,
              staffRoleId
            )
          ) {

            return interaction.reply({
              content:
                "❌ Ticket devralmak için yetkin yok.",
              ephemeral: true
            });
          }

          config.ticket.claimedBy ??= {};

          const claimed =
            config.ticket.claimedBy[
              interaction.channelId
            ];

          if (claimed) {

            return interaction.reply({
              content:
                `❌ Bu ticket zaten <@${claimed}> tarafından devralındı.`,
              ephemeral: true
            });
          }

          config.ticket.claimedBy[
            interaction.channelId
          ] = interaction.user.id;

          saveServerConfig(
            interaction.guildId,
            config
          );

          await sendLog(
            interaction.guild,
            `🛡️ Ticket ${interaction.user} tarafından devralındı.\n**Kanal:** ${interaction.channel}`
          );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🛡️ Ticket Devralındı"
                )
                .setDescription(
                  `Bu ticket artık ${interaction.user} tarafından yönetiliyor.`
                )
                .setColor(
                  0x5865f2
                )
            ]
          });
        }

        // ===============================================
        // TICKET KAPAT
        // ===============================================

        if (
          commandName ===
          "ticket-kapat"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          const owner =
            Object.entries(
              config.tickets || {}
            ).find(
              ([, channelId]) =>
                channelId ===
                interaction.channelId
            );

          if (!owner) {

            return interaction.reply({
              content:
                "❌ Bu kanal bir ticket değil.",
              ephemeral: true
            });
          }

          const staffRoleId =
            config.ticket
              ?.staffRoleId;

          const isStaff =
            isAdmin(interaction) ||
            hasRole(
              interaction.member,
              staffRoleId
            );

          if (
            !isStaff &&
            owner[0] !==
              interaction.user.id
          ) {

            return interaction.reply({
              content:
                "❌ Bu ticketı kapatma yetkin yok.",
              ephemeral: true
            });
          }

          const row =
            new ActionRowBuilder()
              .addComponents(

                new ButtonBuilder()
                  .setCustomId(
                    "eb_ticket_close_confirm"
                  )
                  .setLabel(
                    "Evet, Kapat"
                  )
                  .setStyle(
                    ButtonStyle.Danger
                  )
                  .setEmoji("🔒"),

                new ButtonBuilder()
                  .setCustomId(
                    "eb_ticket_close_cancel"
                  )
                  .setLabel(
                    "Vazgeç"
                  )
                  .setStyle(
                    ButtonStyle.Secondary
                  )
              );

          return interaction.reply({
            content:
              "⚠️ Bu ticketı kapatmak istediğine emin misin?",
            components: [
              row
            ],
            ephemeral: true
          });
        }

        // ===============================================
        // KAYIT PANEL
        // ===============================================

        if (
          commandName ===
          "kayit-panel"
        ) {

          if (!isAdmin(interaction)) {

            return interaction.reply({
              content:
                "❌ Bu paneli sadece yönetici oluşturabilir.",
              ephemeral: true
            });
          }

          return postPanel(
            interaction,
            {
              embeds: [
                new EmbedBuilder()
                  .setTitle(`${EMOJI.register} ${EMOJI.dot} Kayıt Merkezi`)
                  .setDescription(
                    `${EMOJI.spark} **Sunucuya hoş geldin!**\n\n` +
                    "🔒 Yeni gelenler **Kayıtsız** rolüyle başlar.\n" +
                    "🛡️ Kayıt işlemini sadece yetkililer yapar.\n\n" +
                    "**Yetkililer için:**\n" +
                    "`/kayit et @kullanıcı` → Cinsiyet + isim seçerek kayıt\n" +
                    "`/kayit kayitsizlar` → Kayıtsız üyeleri listele\n" +
                    "`/kayit cinsiyet` → Üyenin cinsiyetini düzelt (yetkili)\n\n" +
                    "🔒 Cinsiyet seçimi herkese açık değildir.\n\n" +
                    "✅ Kayıt olunca **Kayıtlı** + seçilen cinsiyet rolü verilir.\n" +
                    "✏️ İstersen kayıt sırasında isim de değiştirilebilir."
                  )
                  .setColor(0x57f287)
                  .setFooter({ text: BRAND_FOOTER })
              ]
            },
            `${EMOJI.ok} Kayıt paneli bu kanala gönderildi.`
          );
        }

        // ===============================================
        // KAYIT (İnteraktif panel ile)
        // ===============================================

        if (
          commandName ===
          "kayit"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (
            !canRegister(
              interaction,
              config
            )
          ) {

            return interaction.reply({
              content:
                "❌ Kayıt yetkin yok.",
              ephemeral: true
            });
          }

          const user =
            interaction.options.getUser(
              "kullanici"
            );

          const member =
            await interaction.guild.members
              .fetch(user.id)
              .catch(() => null);

          if (!member) {

            return interaction.reply({
              content:
                "❌ Kullanıcı sunucuda bulunamadı.",
              ephemeral: true
            });
          }

          if (user.bot) {
            return interaction.reply({
              content: "❌ Botları kayıt edemezsin.",
              ephemeral: true
            });
          }

          // Cinsiyet rolleri hazır olsun (sadece yetkili kayıt)
          await ensureGenderRoles(interaction.guild, config);

          const genderEnabled = config.registration?.genderEnabled !== false;

          // Zaten kayıtlı mı?
          const unregId = config.registration?.unregisteredRoleId || config.roles?.unregistered;
          const alreadyRegistered = unregId
            ? !member.roles.cache.has(unregId)
            : Boolean(config.roles?.member && member.roles.cache.has(config.roles.member));

          const regKey = `${interaction.user.id}:${user.id}`;
          regSessions.set(regKey, {
            gender: null,
            nick: null,
            staffId: interaction.user.id,
            targetId: user.id,
            createdAt: Date.now()
          });

          const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.register} ${EMOJI.dot} Kayıt Paneli`)
            .setColor(alreadyRegistered ? 0xfaa61a : 0x57f287)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
              `**Kayıt edilecek:** ${user} (\`${user.tag}\`)\n` +
              `**Yetkili:** ${interaction.user}\n` +
              (alreadyRegistered ? `\n⚠️ Bu üye **zaten kayıtlı** görünüyor. Yine de devam edebilirsin.\n` : `\n`) +
              (genderEnabled
                ? `${EMOJI.spark} **Cinsiyet** seç (zorunlu değil), istersen **isim** değiştir.\nSonra **Kayıt Et** ile tamamla.\n\n🔒 Bu panel sadece sana özeldir; üye kendi cinsiyetini seçemez.`
                : `${EMOJI.spark} İstersen isim değiştir, sonra **Kayıt Et** ile tamamla.`) +
              `\n\n**Seçimler:**\n• Cinsiyet: *henüz seçilmedi*\n• İsim: *değiştirilmeyecek*`
            )
            .setFooter({ text: BRAND_FOOTER });

          const rows = [];
          if (genderEnabled) {
            rows.push(new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`eb_reg_g:male:${user.id}`).setLabel("Erkek").setEmoji(EMOJI.male).setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`eb_reg_g:female:${user.id}`).setLabel("Kadın").setEmoji(EMOJI.female).setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId(`eb_reg_g:none:${user.id}`).setLabel("Belirtmek İstemiyorum").setEmoji(EMOJI.unspecified).setStyle(ButtonStyle.Secondary)
            ));
          }
          rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eb_reg_name:${user.id}`).setLabel("İsim Değiştir").setEmoji("✏️").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`eb_reg_ok:${user.id}`).setLabel("Kayıt Et").setEmoji("✅").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`eb_reg_cancel:${user.id}`).setLabel("İptal").setEmoji("❌").setStyle(ButtonStyle.Danger)
          ));

          return interaction.reply({
            embeds: [embed],
            components: rows,
            ephemeral: true
          });
        }

        // ===============================================
        // STREAMER PANEL
        // ===============================================

        if (
          commandName ===
          "streamer-panel"
        ) {

          if (!isAdmin(interaction)) {

            return interaction.reply({
              content:
                "❌ Bu paneli sadece yönetici oluşturabilir.",
              ephemeral: true
            });
          }

          return postPanel(
            interaction,
            {
              embeds: [
                new EmbedBuilder()
                  .setTitle(`${EMOJI.streamer} ${EMOJI.dot} Streamer Paneli`)
                  .setDescription(
                    `${EMOJI.spark} **Yayıncı ailemize katıl!**\n\n` +
                    `Aşağıdaki butona bastığın anda **${EMOJI.streamer} Streamer** rolü sana verilir.\n` +
                    `📋 Form yok • 📨 Başvuru yok • ⚡ Anında aktif`
                  )
                  .setColor(0xff4ecd)
                  .setFooter({ text: BRAND_FOOTER })
              ],
              components: [
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId("eb_streamer_apply")
                    .setLabel("Streamer Ol")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(EMOJI.streamer)
                )
              ]
            },
            `${EMOJI.ok} Streamer paneli bu kanala gönderildi.`
          );
        }

        // ===============================================
        // WELCOME
        // ===============================================

        if (
          commandName ===
          "hosgeldin-ayarla"
        ) {

          if (
            !hasPermission(
              interaction,
              PermissionsBitField.Flags.ManageGuild
            )
          ) {

            return interaction.reply({
              content:
                "❌ Bu komut için yetkin yok.",
              ephemeral: true
            });
          }

          const channel =
            interaction.options.getChannel(
              "kanal"
            );

          const role =
            interaction.options.getRole(
              "rol"
            );

          const config =
            getServerConfig(
              interaction.guildId
            );

          config.welcome = {
            enabled: true,
            channelId:
              channel.id,
            autoRoleId:
              role?.id || null
          };

          saveServerConfig(
            interaction.guildId,
            config
          );

          return interaction.reply({
            content:
              `✅ Hoş geldin sistemi ayarlandı.\n` +
              `📢 Kanal: ${channel}\n` +
              `🎭 Rol: ${
                role || "Yok"
              }`,
            ephemeral: true
          });
        }

        // ===============================================
        // LOG CHANNEL
        // ===============================================

        if (
          commandName ===
          "log-kanal"
        ) {

          if (
            !hasPermission(
              interaction,
              PermissionsBitField.Flags.ManageGuild
            )
          ) {

            return interaction.reply({
              content:
                "❌ Bu komut için yetkin yok.",
              ephemeral: true
            });
          }

          const channel =
            interaction.options.getChannel(
              "kanal"
            );

          const config =
            getServerConfig(
              interaction.guildId
            );

          config.channels.log =
            channel.id;

          saveServerConfig(
            interaction.guildId,
            config
          );

          return interaction.reply({
            content:
              `✅ Log kanalı ${channel} olarak ayarlandı.`,
            ephemeral: true
          });
        }

        // ===============================================
        // ROLE PANEL
        // ===============================================

        if (
          commandName ===
          "rol-panel"
        ) {

          if (!isAdmin(interaction)) {

            return interaction.reply({
              content:
                "❌ Bu komut sadece sunucu sahibi veya Administrator içindir.",
              ephemeral: true
            });
          }

          const channel =
            interaction.options.getChannel(
              "kanal"
            );

          const roles = [
            interaction.options.getRole(
              "rol1"
            ),
            interaction.options.getRole(
              "rol2"
            ),
            interaction.options.getRole(
              "rol3"
            ),
            interaction.options.getRole(
              "rol4"
            ),
            interaction.options.getRole(
              "rol5"
            )
          ].filter(Boolean);

          const botMember =
            interaction.guild.members.me;

          if (!botMember) {
            return interaction.reply({
              content:
                "❌ Bot üyesi bulunamadı.",
              ephemeral: true
            });
          }

          for (
            const role of roles
          ) {

            if (
              role.managed ||
              role.position >=
                botMember.roles.highest
                  .position
            ) {

              return interaction.reply({
                content:
                  `❌ ${role} rolünü yönetemiyorum. Botun rolünü bu rolün üzerine taşı.`,
                ephemeral: true
              });
            }
          }

          const message =
            await createRolePanel(
              channel,
              roles
            );

          const config =
            getServerConfig(
              interaction.guildId
            );

          config.rolePanel = {
            channelId:
              channel.id,
            messageId:
              message.id,
            roles:
              roles.map(
                role =>
                  role.id
              )
          };

          saveServerConfig(
            interaction.guildId,
            config
          );

          await sendLog(
            interaction.guild,
            `🎭 ${interaction.user} tarafından rol paneli oluşturuldu: ${channel}`
          );

          return interaction.reply({
            content:
              `✅ Rol paneli oluşturuldu: ${channel}`,
            ephemeral: true
          });
        }

        // ===============================================
        // STATS SETUP
        // ===============================================

        if (
          commandName ===
          "istatistik-kur"
        ) {

          if (!isAdmin(interaction)) {

            return interaction.reply({
              content:
                "❌ Bu komut sadece sunucu sahibi veya Administrator içindir.",
              ephemeral: true
            });
          }

          await interaction.deferReply({
            ephemeral: true
          });

          const created =
            await setupServerStats(
              interaction.guild
            );

          if (!created) {

            return interaction.editReply({
              content:
                "ℹ️ İstatistik sistemi zaten aktif."
            });
          }

          await sendLog(
            interaction.guild,
            `📊 İstatistik sistemi ${interaction.user} tarafından kuruldu.`
          );

          return interaction.editReply({
            content:
              "✅ Sunucu istatistik sistemi kuruldu.\n\n" +
              "👥 Üye\n" +
              "🤖 Bot\n" +
              "🟢 Online\n" +
              "🔊 Ses\n\n" +
              "İstatistikler otomatik güncellenecek."
          });
        }

        // ===============================================
        // STATS CLOSE
        // ===============================================

        if (
          commandName ===
          "istatistik-kapat"
        ) {

          if (!isAdmin(interaction)) {

            return interaction.reply({
              content:
                "❌ Bu komut sadece sunucu sahibi veya Administrator içindir.",
              ephemeral: true
            });
          }

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (
            !config.stats?.enabled
          ) {

            return interaction.reply({
              content:
                "ℹ️ İstatistik sistemi zaten kapalı.",
              ephemeral: true
            });
          }

          const ids = [
            config.stats.channels.members,
            config.stats.channels.bots,
            config.stats.channels.online,
            config.stats.channels.voice,
            config.stats.categoryId
          ].filter(Boolean);

          let deleted = 0;

          for (
            const id of ids
          ) {

            const channel =
              await interaction.guild
                .channels
                .fetch(id)
                .catch(() => null);

            if (!channel) continue;

            await channel
              .delete(
                "Endless Builder istatistik sistemi kapatıldı"
              )
              .then(() => {
                deleted++;
              })
              .catch(() => {});
          }

          config.stats = {
            enabled: false,
            categoryId: null,
            channels: {
              members: null,
              bots: null,
              online: null,
              voice: null
            }
          };

          saveServerConfig(
            interaction.guildId,
            config
          );

          return interaction.reply({
            content:
              `✅ İstatistik sistemi kapatıldı.\n🗑️ ${deleted} kanal silindi.`,
            ephemeral: true
          });
        }
      }

      // =================================================
      // LEVEL KOMUTLARI
      // =================================================

      if (
        interaction.isChatInputCommand() &&
        ["rank", "leaderboard", "level-sistem"].includes(
          interaction.commandName
        )
      ) {
        return await handleLevelCommand(interaction);
      }

      // =================================================
      // ÇEKİLİŞ
      // =================================================

      if (
        interaction.isChatInputCommand() &&
        ["cekilis", "cekilis-bitir"].includes(
          interaction.commandName
        )
      ) {
        return await handleGiveawayCommand(interaction);
      }

      if (
        interaction.isButton() &&
        interaction.customId === "eb_giveaway_join"
      ) {
        return await handleGiveawayButton(interaction);
      }

      // =================================================
      // EKONOMİ
      // =================================================

      if (
        interaction.isChatInputCommand() &&
        [
          "bakiye",
          "günlük",
          "haftalık",
          "öde",
          "çalış",
          "slots",
          "leaderboard-para"
        ].includes(interaction.commandName)
      ) {
        return await handleEconomyCommand(interaction);
      }

      // =================================================
      // MAĞAZA
      // =================================================

      if (
        interaction.isAutocomplete() &&
        ["satın-al", "mağaza-sil"].includes(
          interaction.commandName
        )
      ) {
        return await handleShopAutocomplete(interaction);
      }

      if (
        interaction.isChatInputCommand() &&
        [
          "mağaza",
          "mağaza-ekle",
          "mağaza-sil",
          "satın-al"
        ].includes(interaction.commandName)
      ) {
        return await handleShopCommand(interaction);
      }

      // =================================================
      // TICKET KULLANICI EKLE / ÇIKAR
      // =================================================

      if (
        interaction.isUserSelectMenu() &&
        [
          "eb_ticket_add_select",
          "eb_ticket_remove_select"
        ].includes(interaction.customId)
      ) {
        return await handleTicketMemberSelect(interaction);
      }

      // =================================================
      // SELECT MENUS
      // =================================================

      if (
        interaction.isStringSelectMenu()
      ) {

        // ===============================================
        // TYPE
        // ===============================================

        if (
          interaction.customId ===
          "setup_type"
        ) {

          const session =
            getSession(
              interaction
            );

          if (!session) {

            return interaction.reply({
              content:
                "❌ Setup oturumun bulunamadı. `/setup` ile tekrar başla.",
              ephemeral: true
            });
          }

          const type =
            interaction.values[0];

          if (
            !templates[type]
          ) {

            return interaction.reply({
              content:
                "❌ Geçersiz sunucu türü.",
              ephemeral: true
            });
          }

          session.type =
            type;

          setSession(
            interaction,
            session
          );

          return interaction.update({
            content:
              "## 🎨 Kanal Stili\n\n" +
              "Kanallar nasıl görünsün?",
            components: [
              createChannelStyleMenu()
            ]
          });
        }

        // ===============================================
        // CHANNEL STYLE
        // ===============================================

        if (
          interaction.customId ===
          "setup_channel_style"
        ) {

          const session =
            getSession(
              interaction
            );

          if (!session) {
            return;
          }

          session.channelStyle =
            interaction.values[0];

          setSession(
            interaction,
            session
          );

          return interaction.update({
            content:
              "## 📁 Kategori Stili\n\n" +
              "Kategoriler nasıl görünsün?",
            components: [
              createCategoryStyleMenu()
            ]
          });
        }

        // ===============================================
        // CATEGORY STYLE
        // ===============================================

        if (
          interaction.customId ===
          "setup_category_style"
        ) {

          const session =
            getSession(
              interaction
            );

          if (!session) {
            return;
          }

          session.categoryStyle =
            interaction.values[0];

          setSession(
            interaction,
            session
          );

          return interaction.update({
            content:
              "## 📂 Kategori Seçimi\n\n" +
              "Oluşturmak istediğin kategorileri seç.",
            components: [
              createCategorySelectMenu(
                session
              )
            ]
          });
        }

        // ===============================================
        // CATEGORIES
        // ===============================================

        if (
          interaction.customId ===
          "setup_categories"
        ) {

          const session =
            getSession(
              interaction
            );

          if (!session) {
            return;
          }

          session.selectedCategories =
            interaction.values;

          setSession(
            interaction,
            session
          );

          return interaction.update({
            content:
              "## ⚙️ Sistemler\n\n" +
              "Kurulum sırasında aktif etmek istediğin sistemleri seç.\n\n" +
              "Birden fazla seçebilirsin.",
            components: [
              createFeatureMenu()
            ]
          });
        }

        // ===============================================
        // FEATURES
        // ===============================================

        if (
          interaction.customId ===
          "setup_features"
        ) {

          const session =
            getSession(
              interaction
            );

          if (!session) {
            return;
          }

          session.features =
            interaction.values;

          setSession(
            interaction,
            session
          );

          return interaction.update({
            content:
              "## 🔊 Ses Kanalları\n\n" +
              "Kaç adet ses kanalı oluşturulsun?",
            components: [
              createVoiceCountMenu()
            ]
          });
        }

        // ===============================================
        // VOICE
        // ===============================================

        if (
          interaction.customId ===
          "setup_voice_count"
        ) {

          const session =
            getSession(
              interaction
            );

          if (!session) {
            return;
          }

          session.voiceCount =
            Number(
              interaction.values[0]
            );

          setSession(
            interaction,
            session
          );

          return interaction.update({
            content:
              createSetupSummary(
                session
              ),
            components: [
              createSetupButtons()
            ]
          });
        }
      }

      // =================================================
      // BUTTONS
      // =================================================

      if (
        interaction.isButton()
      ) {

        // ===============================================
        // ROLE BUTTON
        // ===============================================

        if (
          interaction.customId.startsWith(
            "eb_role_"
          )
        ) {

          const roleId =
            interaction.customId.replace(
              "eb_role_",
              ""
            );

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (
            !config.rolePanel?.roles?.includes(
              roleId
            )
          ) {

            return interaction.reply({
              content:
                "❌ Bu rol panelinde bu rol bulunmuyor.",
              ephemeral: true
            });
          }

          const role =
            interaction.guild.roles.cache.get(
              roleId
            );

          if (!role) {

            return interaction.reply({
              content:
                "❌ Rol bulunamadı.",
              ephemeral: true
            });
          }

          const botMember =
            interaction.guild.members.me;

          if (
            !botMember
          ) {

            return interaction.reply({
              content:
                "❌ Bot üyesi bulunamadı.",
              ephemeral: true
            });
          }

          if (
            role.managed ||
            role.position >=
              botMember.roles.highest.position
          ) {

            return interaction.reply({
              content:
                "❌ Bu rolü yönetemiyorum. Bot rolünü yukarı taşı.",
              ephemeral: true
            });
          }

          if (
            interaction.member.roles.cache.has(
              role.id
            )
          ) {

            await interaction.member.roles
              .remove(role);

            await sendLog(
              interaction.guild,
              `🎭 ${interaction.user} ${role} rolünü kaldırdı.`
            );

            return interaction.reply({
              content:
                `➖ ${role} rolü kaldırıldı.`,
              ephemeral: true
            });
          }

          await interaction.member.roles
            .add(role);

          await sendLog(
            interaction.guild,
            `🎭 ${interaction.user} ${role} rolünü aldı.`
          );

          return interaction.reply({
            content:
              `➕ ${role} rolü verildi.`,
            ephemeral: true
          });
        }

        // ===============================================
        // SETUP CREATE
        // ===============================================

        if (
          interaction.customId ===
          "setup_create"
        ) {

          const session =
            getSession(
              interaction
            );

          if (!session) {

            return interaction.reply({
              content:
                "❌ Setup oturumun bulunamadı.",
              ephemeral: true
            });
          }

          if (
            !session.type ||
            !session.selectedCategories?.length
          ) {

            return interaction.reply({
              content:
                "❌ Kurulum bilgileri eksik.",
              ephemeral: true
            });
          }

          const botMember =
            interaction.guild.members.me;

          if (!botMember) {

            return interaction.reply({
              content:
                "❌ Bot sunucu üyesi olarak bulunamadı.",
              ephemeral: true
            });
          }

          if (
            !botMember.permissions.has(
              PermissionsBitField.Flags.ManageChannels
            )
          ) {

            return interaction.reply({
              content:
                "❌ Botta **Kanalları Yönet** yetkisi yok.",
              ephemeral: true
            });
          }

          if (
            session.features.includes(
              "roles"
            ) &&
            !botMember.permissions.has(
              PermissionsBitField.Flags.ManageRoles
            )
          ) {

            return interaction.reply({
              content:
                "❌ Botta **Rolleri Yönet** yetkisi yok.",
              ephemeral: true
            });
          }

          {
            const lim = getLimits(interaction.guildId);
            const catCount = session.selectedCategories?.length || 0;
            const voice = session.voiceCount || 4;

            if (catCount > lim.categories || voice > lim.voice) {
              return interaction.reply({
                content:
                  `💎 Free planda en fazla **${lim.categories}** kategori ve **${lim.voice}** ses kanalı seçebilirsin.\n` +
                  "Seçimini azaltıp tekrar dene veya `/premium` komutuna bak.",
                ephemeral: true
              });
            }
          }

          await interaction.update({
            content:
              "⏳ **Sunucu hazırlanıyor...**\n\n" +
              "Kanallar, kategoriler ve roller oluşturuluyor.",
            components: []
          });

          try {

            if (
              session.changing
            ) {
              await removeBuilderStructure(
                interaction.guild
              );
            }

            const result =
              await buildServer(
                interaction.guild,
                session.type,
                session
              );

            const config =
              getServerConfig(
                interaction.guildId
              );

            config.setupCompleted =
              true;

            config.setupType =
              session.type;

            config.channelStyle =
              session.channelStyle;

            config.categoryStyle =
              session.categoryStyle;

            config.selectedCategories =
              session.selectedCategories;

            config.features =
              session.features || [];

            config.voiceCount =
              session.voiceCount || 4;

            config.setupDate =
              Date.now();

            saveServerConfig(
              interaction.guildId,
              config
            );

            deleteSession(
              interaction
            );

            await sendLog(
              interaction.guild,
              `🏗️ Builder kurulumu tamamlandı.\n**Tür:** ${templates[session.type].name}\n**Kurulumu yapan:** ${interaction.user}`
            );

            return interaction.editReply({
              content: [
                "## ✅ Endless Builder Tamamlandı",
                "",
                `🎯 **Tür:** ${templates[session.type].emoji} ${templates[session.type].name}`,
                `📁 **Kategori:** ${result.categoriesCreated}`,
                `💬 **Kanal:** ${result.channelsCreated}`,
                `🎭 **Rol:** ${result.rolesCreated}`,
                "",
                "🚀 Sunucu kullanıma hazır!",
                "",
                "`/kurulum durum` ile durumu görebilirsin."
              ].join("\n"),
              components: []
            });

          } catch (error) {

            console.error(
              "SETUP ERROR:",
              error
            );

            return interaction.editReply({
              content:
                "❌ Kurulum sırasında bir hata oluştu.\n\n" +
                `\`${error.message}\``,
              components: []
            });
          }
        }

        // ===============================================
        // SETUP CANCEL
        // ===============================================

        if (
          interaction.customId ===
          "setup_cancel"
        ) {

          deleteSession(
            interaction
          );

          return interaction.update({
            content:
              "❌ Kurulum iptal edildi.",
            components: []
          });
        }

        // ===============================================
        // CLEAR CONFIRM
        // ===============================================

        if (
          interaction.customId ===
          "clear_all_confirm"
        ) {

          if (
            !isAdmin(interaction)
          ) {

            return interaction.update({
              content:
                "❌ Bu işlemi sadece sunucu sahibi veya Administrator yapabilir.",
              components: []
            });
          }

          const botMember =
            interaction.guild.members.me;

          if (
            !botMember?.permissions.has(
              PermissionsBitField.Flags.ManageChannels
            )
          ) {

            return interaction.update({
              content:
                "❌ Botta Kanalları Yönet yetkisi yok.",
              components: []
            });
          }

          await interaction.update({
            content:
              "🧨 **Kanallar temizleniyor...**",
            components: []
          });

          const channels =
            [
              ...interaction.guild
                .channels.cache.values()
            ];

          let deleted = 0;

          // Çocuk kanallar
          for (
            const channel
            of channels
          ) {

            if (
              channel.type ===
              ChannelType.GuildCategory
            ) {
              continue;
            }

            await channel
              .delete(
                "Sunucu temizleme"
              )
              .then(() => {
                deleted++;
              })
              .catch(() => {});
          }

          // Kategoriler
          for (
            const channel
            of channels
          ) {

            if (
              channel.type !==
              ChannelType.GuildCategory
            ) {
              continue;
            }

            await channel
              .delete(
                "Sunucu temizleme"
              )
              .then(() => {
                deleted++;
              })
              .catch(() => {});
          }

          const config =
            getServerConfig(
              interaction.guildId
            );

          config.setupCompleted =
            false;

          config.setupType =
            null;

          config.createdIds = {
            categories: [],
            channels: [],
            roles: []
          };

          config.channels = {
            log: null
          };

          config.ticket = {
            categoryId: null,
            staffRoleId: null,
            claimedBy: {}
          };

          config.welcome = {
            enabled: false,
            channelId: null,
            autoRoleId: null
          };

          config.rolePanel = {
            channelId: null,
            messageId: null,
            roles: []
          };

          config.stats = {
            enabled: false,
            categoryId: null,
            channels: {
              members: null,
              bots: null,
              online: null,
              voice: null
            }
          };

          config.tickets = {};
          if (config.ticket) {
            config.ticket.records = {};
            config.ticket.claimedBy = {};
          }

          saveServerConfig(
            interaction.guildId,
            config
          );

          return interaction.editReply({
            content:
              `🧹 Temizleme tamamlandı.\n\n**Silinen kanal:** ${deleted}`,
            components: []
          });
        }

        // ===============================================
        // CLEAR CANCEL
        // ===============================================

        if (
          interaction.customId ===
          "clear_all_cancel"
        ) {

          return interaction.update({
            content:
              "✅ İşlem iptal edildi. Hiçbir kanal silinmedi.",
            components: []
          });
        }

        // ===============================================
        // STREAMER
        // ===============================================

        if (
          interaction.customId ===
          "eb_streamer_apply"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          let role =
            config.roles?.streamer
              ? interaction.guild.roles.cache.get(
                  config.roles.streamer
                )
              : null;

          if (!role) {

            role =
              interaction.guild.roles.cache.find(
                r =>
                  r.name ===
                  "🎥 Streamer"
              );
          }

          if (!role) {

            return interaction.reply({
              content:
                "❌ Streamer rolü ayarlı değil. Yetkililer `/yonetim rol-ayarla streamer:` ile rolü seçmeli.",
              ephemeral: true
            });
          }

          if (
            interaction.member.roles.cache.has(
              role.id
            )
          ) {

            return interaction.reply({
              content:
                "ℹ️ Zaten Streamer rolün var.",
              ephemeral: true
            });
          }

          const botMember =
            interaction.guild.members.me;

          if (
            !botMember ||
            role.position >=
              botMember.roles.highest.position
          ) {

            return interaction.reply({
              content:
                "❌ Streamer rolünü veremiyorum. Bot rolünü Streamer rolünün üzerine taşı.",
              ephemeral: true
            });
          }

          await interaction.member.roles
            .add(role);

          await sendLog(
            interaction.guild,
            `🎥 ${interaction.user} Streamer rolünü aldı.`
          );

          return interaction.reply({
            content:
              "🎥 Streamer rolün verildi! Yayıncı kanalına hoş geldin.",
            ephemeral: true
          });
        }

        // ===============================================
        // TICKET OPEN / TRANSCRIPT / EKLE / ÇIKAR
        // ===============================================

        if (
          TICKET_OPEN_IDS[
            interaction.customId
          ]
        ) {
          return await openTicket(
            interaction,
            TICKET_OPEN_IDS[
              interaction.customId
            ]
          );
        }

        if (
          interaction.customId ===
          "eb_ticket_transcript"
        ) {
          return await handleTicketTranscript(
            interaction
          );
        }

        if (
          interaction.customId ===
          "eb_ticket_add"
        ) {
          return await handleTicketMemberButton(
            interaction,
            "add"
          );
        }

        if (
          interaction.customId ===
          "eb_ticket_remove"
        ) {
          return await handleTicketMemberButton(
            interaction,
            "remove"
          );
        }

        // ===============================================
        // TICKET CLAIM
        // ===============================================

        if (
          interaction.customId ===
          "eb_ticket_claim"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          const owner =
            Object.entries(
              config.tickets || {}
            ).find(
              ([, channelId]) =>
                channelId ===
                interaction.channelId
            );

          if (!owner) {

            return interaction.reply({
              content:
                "❌ Bu kanal ticket değil.",
              ephemeral: true
            });
          }

          const staffRoleId =
            config.ticket
              ?.staffRoleId;

          if (
            !isAdmin(interaction) &&
            !hasRole(
              interaction.member,
              staffRoleId
            )
          ) {

            return interaction.reply({
              content:
                "❌ Ticket devralmak için yetkin yok.",
              ephemeral: true
            });
          }

          config.ticket.claimedBy ??= {};

          const claimedBy =
            config.ticket.claimedBy[
              interaction.channelId
            ];

          if (claimedBy) {

            if (
              claimedBy ===
              interaction.user.id
            ) {

              return interaction.reply({
                content:
                  "ℹ️ Bu ticket zaten sende.",
                ephemeral: true
              });
            }

            return interaction.reply({
              content:
                `❌ Bu ticket <@${claimedBy}> tarafından devralınmış.`,
              ephemeral: true
            });
          }

          config.ticket.claimedBy[
            interaction.channelId
          ] = interaction.user.id;

          saveServerConfig(
            interaction.guildId,
            config
          );

          await sendLog(
            interaction.guild,
            `🛡️ ${interaction.user} ticketı devraldı.\n**Kanal:** ${interaction.channel}`
          );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🛡️ Ticket Devralındı"
                )
                .setDescription(
                  `Bu ticket artık ${interaction.user} tarafından yönetiliyor.`
                )
                .setColor(
                  0x5865f2
                )
            ]
          });
        }

        // ===============================================
        // TICKET CLOSE
        // ===============================================

        if (
          interaction.customId ===
          "eb_ticket_close"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          const staffRoleId =
            config.ticket
              ?.staffRoleId;

          const isStaff =
            isAdmin(interaction) ||
            hasRole(
              interaction.member,
              staffRoleId
            );

          const owner =
            Object.entries(
              config.tickets || {}
            ).find(
              ([, channelId]) =>
                channelId ===
                interaction.channelId
            );

          if (
            !isStaff &&
            (!owner ||
              owner[0] !==
                interaction.user.id)
          ) {

            return interaction.reply({
              content:
                "❌ Bu ticketı kapatma yetkin yok.",
              ephemeral: true
            });
          }

          const row =
            new ActionRowBuilder()
              .addComponents(

                new ButtonBuilder()
                  .setCustomId(
                    "eb_ticket_close_confirm"
                  )
                  .setLabel(
                    "Evet, Kapat"
                  )
                  .setStyle(
                    ButtonStyle.Danger
                  )
                  .setEmoji("🔒"),

                new ButtonBuilder()
                  .setCustomId(
                    "eb_ticket_close_cancel"
                  )
                  .setLabel(
                    "Vazgeç"
                  )
                  .setStyle(
                    ButtonStyle.Secondary
                  )
              );

          return interaction.reply({
            content:
              "⚠️ Ticketı kapatmak istediğine emin misin?",
            components: [
              row
            ],
            ephemeral: true
          });
        }

        // ===============================================
        // TICKET CLOSE CONFIRM
        // ===============================================

        if (
          interaction.customId ===
          "eb_ticket_close_confirm"
        ) {
          return await closeTicketConfirmed(
            interaction
          );
        }

        // ===============================================
        // TICKET CLOSE CANCEL
        // ===============================================

        if (
          interaction.customId ===
          "eb_ticket_close_cancel"
        ) {

          return interaction.update({
            content:
              "✅ Ticket kapatma işlemi iptal edildi.",
            components: []
          });
        }
      }

    } catch (error) {

      console.error(
        "INTERACTION ERROR:",
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {

        await interaction
          .followUp({
            content:
              "❌ İşlem başarısız oldu.",
            ephemeral: true
          })
          .catch(() => {});

      } else {

        await interaction
          .reply({
            content:
              "❌ İşlem başarısız oldu.",
            ephemeral: true
          })
          .catch(() => {});
      }
    }
  }
);

// ======================================================
// MEMBER JOIN
// ======================================================

client.on(
  "guildMemberAdd",
  async member => {

    try {

      const config =
        getServerConfig(
          member.guild.id
        );

      // Anti-Raid: raid sırasında giren üye atıldıysa devam etme
      if (await antiRaidOnJoin(member)) {
        return;
      }

      // Davet takibi
      if (typeof handleInviteJoin === "function") {
        await handleInviteJoin(member).catch(() => {});
      }

      // -----------------------------------------------
      // KAYITSIZ ROL
      // -----------------------------------------------

      if (
        config.registration
          ?.unregisteredRoleId &&
        config.toggles?.registration !== false
      ) {

        const role =
          member.guild.roles.cache.get(
            config.registration
              .unregisteredRoleId
          );

        if (role) {

          await member.roles
            .add(role)
            .catch(() => {});
        }
      }

      // -----------------------------------------------
      // OTOMATİK ROL
      // -----------------------------------------------

      if (
        config.welcome
          ?.autoRoleId
      ) {

        const role =
          member.guild.roles.cache.get(
            config.welcome
              .autoRoleId
          );

        if (role) {

          await member.roles
            .add(role)
            .catch(() => {});
        }
      }

      // -----------------------------------------------
      // HOŞ GELDİN
      // -----------------------------------------------

      if (
        config.welcome?.enabled &&
        config.welcome?.channelId
      ) {

        const channel =
          member.guild.channels.cache.get(
            config.welcome
              .channelId
          );

        if (channel) {

          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "👋 Hoş Geldin!"
                )
                .setDescription(
                  `Sunucumuza hoş geldin ${member}!\n\n` +
                  `Seninle beraber **${member.guild.memberCount}** kişi olduk. 🎉`
                )
                .setColor(
                  0x57f287
                )
                .setThumbnail(
                  member.user.displayAvatarURL()
                )
                .setTimestamp()
            ]
          });
        }
      }

      await sendLog(
        member.guild,
        `👋 ${member.user} sunucuya katıldı.`
      );

      // İstatistiği güncelle
      await updateServerStats(
        member.guild
      );

    } catch (error) {

      console.error(
        "MEMBER JOIN ERROR:",
        error
      );
    }
  }
);

// ======================================================
// MEMBER REMOVE
// ======================================================

client.on(
  "guildMemberRemove",
  async member => {

    try {

      await sendLog(
        member.guild,
        `📤 ${member.user} sunucudan ayrıldı.`
      );

      await updateServerStats(
        member.guild
      );

    } catch (error) {

      console.error(
        "MEMBER REMOVE ERROR:",
        error
      );
    }
  }
);

// ======================================================
// MESSAGE CREATE
// (Sonraki aşamalardaki mesaj sistemleri de buraya eklenecek)
// ======================================================

client.on(
  "messageCreate",
  async message => {

    try {
      // PREFIX EKSIK
      try {
        const low = (message.content||"").trim().toLowerCase();
        if (low === ".eksik" || low.startsWith(".eksik ")) {
          if (message.guild && !message.author.bot) {
            const analysis = buildEksikAnalysis(message.guild);
            eksikAnalyses.set(message.guild.id, analysis);
            const typeStr = analysis.typeInfo.types.map(t=>t.charAt(0).toUpperCase()+t.slice(1)).join(" + ");
            let desc = `**Bu sunucu ${typeStr} yapısına benziyor.**\n**Üye:** ${analysis.memberCount}\n\n`;
            if (!analysis.missing.length) desc += "✅ Eksik yok.";
            else {
              for (const g of analysis.missing) {
                desc += `• **${g.label}**: ${g.channels.map(c=>smartChannelName(c.name, analysis.naming, analysis.typeInfo.types)).join(", ")}\n`;
              }
              desc += `\nToplam ${analysis.missing.reduce((s,g)=>s+g.channels.length,0)} eksik. \`.eksikkur\` ile kur.`;
            }
            const embed = new EmbedBuilder().setTitle(`🔍 ${message.guild.name} - Eksik Analizi`).setDescription(desc.slice(0,4000)).setColor(0x5865f2);
            await message.reply({ embeds:[embed] });
            return;
          }
        }
        if (low === ".eksikkur" || low.startsWith(".eksikkur ")) {
          if (message.guild && !message.author.bot) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
              await message.reply("❌ Yetkin yok.").catch(()=>{});
              return;
            }
            const analysis = eksikAnalyses.get(message.guild.id);
            if (!analysis) { await message.reply("❌ Önce `.eksik` komutunu çalıştırmalısın.").catch(()=>{}); return; }
            let preview = "";
            for (const g of analysis.missing) preview += `\n**${g.label}**: ${g.channels.map(c=>smartChannelName(c.name, analysis.naming, analysis.typeInfo.types)).join(", ")}`;
            const embed2 = new EmbedBuilder().setTitle("⚙️ Onay").setDescription(`Oluşturulacaklar:${preview.slice(0,3000)}\n\nOnay için butonları kullan.`).setColor(0xfee75c);
            const { ActionRowBuilder: ARB, ButtonBuilder: BB, ButtonStyle: BS } = require("discord.js");
            const row = new ARB().addComponents(
              new BB().setCustomId(`eksikkur_confirm:${message.author.id}`).setLabel("Onayla").setStyle(BS.Success).setEmoji("✅"),
              new BB().setCustomId(`eksikkur_cancel:${message.author.id}`).setLabel("İptal").setStyle(BS.Danger).setEmoji("❌")
            );
            await message.reply({ embeds:[embed2], components:[row] });
            return;
          }
        }
      } catch (e) { console.error("PREFIX EKSIK", e); }


      // Güvenlik sistemleri önce çalışır
      if (await handleAutoMod(message)) return;
      if (await handleAntiRaidMessage(message)) return;
      if (await handleCountingMessage(message)) return;

      // .prefix komutları (XP'den önce — komut mesajı spam olmasın)
      if (typeof handlePrefixMessage === "function" && await handlePrefixMessage(message)) return;

      await handleAfkMessage(message);
      await handleXp(message);

      // AI kanalı
      await handleAiChannelMessage(message);

    } catch (error) {

      console.error(
        "MESSAGE CREATE ERROR:",
        error
      );
    }
  }
);

// ======================================================
// AUTO STATS
// ======================================================

setInterval(
  async () => {
    if (!client.isReady()) return;
    for (const guild of client.guilds.cache.values()) {
      const config = getServerConfig(guild.id);
      if (!config.stats?.enabled) continue;
      await updateServerStats(guild);
      await new Promise(r => setTimeout(r, 400));
    }
  },
  60 * 1000
);

// ======================================================
// ERRORS
// ======================================================

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "UNHANDLED REJECTION:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );
  }
);

client.on("error", error => console.error("CLIENT ERROR:", error));
client.on("shardError", error => console.error("SHARD ERROR:", error));

// ======================================================
// ÖZEL ODA (TEMP VOICE / SECRET ROOM) SİSTEMİ
// ======================================================
// /özel-oda-kur ile kurulum. Belirlenen ses kanalına girince
// kullanıcının adında özel oda oluşur. Metin kanalından yönetilir.

const tempVoiceOwners = new Map(); // channelId -> ownerId

function tvCfg(config) {
  config.tempVoice ??= { enabled: false, joinChannelId: null, categoryId: null, textChannelId: null, panelMessageId: null, rooms: {} };
  config.tempVoice.rooms ??= {};
  return config.tempVoice;
}

async function setupTempVoice(interaction) {
  if (!canManageGuild(interaction)) {
    return interaction.reply({ content: `${EMOJI.no} Bu komut için **Sunucuyu Yönet** yetkisi gerekir.`, ephemeral: true });
  }

  const textCh = interaction.options.getChannel("metin");
  const voiceCh = interaction.options.getChannel("ses");
  const category = interaction.options.getChannel("kategori");

  if (!textCh?.isTextBased()) {
    return interaction.reply({ content: `${EMOJI.no} Geçerli bir metin kanalı seç.`, ephemeral: true });
  }
  if (!voiceCh || voiceCh.type !== ChannelType.GuildVoice) {
    return interaction.reply({ content: `${EMOJI.no} Geçerli bir ses kanalı seç (giriş noktası).`, ephemeral: true });
  }

  const config = getServerConfig(interaction.guildId);
  const tv = tvCfg(config);

  tv.enabled = true;
  tv.joinChannelId = voiceCh.id;
  tv.textChannelId = textCh.id;
  if (category && category.type === ChannelType.GuildCategory) {
    tv.categoryId = category.id;
  } else {
    // Otomatik kategori oluştur
    try {
      const cat = await interaction.guild.channels.create({
        name: `${EMOJI.room} Özel Odalar`,
        type: ChannelType.GuildCategory,
        reason: "Endless Builder özel oda sistemi"
      });
      tv.categoryId = cat.id;
      config.createdIds ??= { categories: [], channels: [], roles: [] };
      config.createdIds.categories.push(cat.id);
    } catch (e) {
      console.error("TEMP VOICE CAT ERROR:", e.message);
    }
  }

  saveServerConfig(interaction.guildId, config);

  // Panel gönder
  const panel = {
    embeds: [
      new EmbedBuilder()
        .setTitle(`${EMOJI.room} ${EMOJI.dot} Özel Oda Sistemi`)
        .setColor(0x5865f2)
        .setDescription(
          `${EMOJI.spark} **Nasıl çalışır?**\n\n` +
          `1. <#${voiceCh.id}> ses kanalına gir\n` +
          `2. Senin adına özel oda otomatik oluşur\n` +
          `3. Bu kanaldan odanı yönet (limit, kilit, isim, at)\n\n` +
          `🔒 Odan sadece sen ve davet ettiklerin içindir.\n` +
          `🗑️ Odadan herkes çıkınca oda silinir.`
        )
        .setFooter({ text: BRAND_FOOTER })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("eb_tv_limit").setLabel("Limit Ayarla").setEmoji("👥").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("eb_tv_lock").setLabel("Kilitle / Aç").setEmoji("🔒").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("eb_tv_rename").setLabel("İsim Değiştir").setEmoji("✏️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("eb_tv_kick").setLabel("Üye At").setEmoji("👢").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("eb_tv_allow").setLabel("İzin Ver").setEmoji("✅").setStyle(ButtonStyle.Success)
      )
    ]
  };

  const msg = await textCh.send(panel);
  tv.panelMessageId = msg.id;
  saveServerConfig(interaction.guildId, config);

  await interaction.reply({
    content: `${EMOJI.ok} Özel oda sistemi kuruldu!\n📢 Panel: ${textCh}\n🔊 Giriş: ${voiceCh}`,
    ephemeral: true
  });
}

async function handleTempVoiceState(oldState, newState) {
  try {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;
    const config = getServerConfig(guild.id);
    const tv = tvCfg(config);
    if (!tv.enabled || !tv.joinChannelId) return;

    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    // Giriş kanalına girdi → oda oluştur
    if (newState.channelId === tv.joinChannelId && oldState.channelId !== tv.joinChannelId) {
      // Zaten odası var mı?
      const existing = Object.entries(tv.rooms).find(([, r]) => r.ownerId === member.id);
      if (existing) {
        const ch = guild.channels.cache.get(existing[0]);
        if (ch) {
          await member.voice.setChannel(ch).catch(() => {});
          return;
        }
        delete tv.rooms[existing[0]];
      }

      const parent = tv.categoryId || null;
      const roomName = `${EMOJI.room} ${member.displayName}`.slice(0, 100);

      const room = await guild.channels.create({
        name: roomName,
        type: ChannelType.GuildVoice,
        parent: parent || undefined,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.Connect] },
          { id: member.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.ManageChannels] },
          { id: guild.members.me.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers] }
        ],
        reason: `Özel oda: ${member.user.tag}`
      });

      tv.rooms[room.id] = { ownerId: member.id, createdAt: Date.now(), locked: true };
      tempVoiceOwners.set(room.id, member.id);
      saveServerConfig(guild.id, config);

      await member.voice.setChannel(room).catch(() => {});
      await sendLog(guild, `${EMOJI.room} ${member} özel oda oluşturdu: ${room}`);
    }

    // Odadan çıktı / boşaldı mı kontrol
    const leftChannelId = oldState.channelId;
    if (leftChannelId && tv.rooms[leftChannelId]) {
      const ch = guild.channels.cache.get(leftChannelId);
      if (ch && ch.members.filter(m => !m.user.bot).size === 0) {
        delete tv.rooms[leftChannelId];
        tempVoiceOwners.delete(leftChannelId);
        saveServerConfig(guild.id, config);
        await ch.delete("Özel oda boş kaldı").catch(() => {});
      }
    }
  } catch (error) {
    console.error("TEMP VOICE STATE ERROR:", error);
  }

  // Ses değişince istatistik kanallarını güncelle
  try {
    const g = newState.guild || oldState.guild;
    if (g && getServerConfig(g.id).stats?.enabled) {
      await updateServerStats(g);
    }
  } catch {}
}


async function handleTempVoiceButton(interaction) {
  const config = getServerConfig(interaction.guildId);
  const tv = tvCfg(config);
  if (!tv.enabled) return interaction.reply({ content: `${EMOJI.no} Özel oda sistemi kapalı.`, ephemeral: true });

  const ownerRoom = Object.entries(tv.rooms).find(([, r]) => r.ownerId === interaction.user.id);
  if (!ownerRoom) {
    return interaction.reply({ content: `${EMOJI.no} Aktif özel odan yok. Önce giriş kanalına gir.`, ephemeral: true });
  }

  const [roomId, roomData] = ownerRoom;
  const channel = interaction.guild.channels.cache.get(roomId);
  if (!channel) {
    delete tv.rooms[roomId];
    saveServerConfig(interaction.guildId, config);
    return interaction.reply({ content: `${EMOJI.no} Odan bulunamadı, silinmiş olabilir.`, ephemeral: true });
  }

  const id = interaction.customId;

  if (id === "eb_tv_limit") {
    await interaction.showModal(
      new ModalBuilder().setCustomId("eb_tv_limit_modal").setTitle("Üye Limiti")
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("limit").setLabel("Limit (0 = sınırsız, max 99)").setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2)
        ))
    );
    return true;
  }

  if (id === "eb_tv_lock") {
    roomData.locked = !roomData.locked;
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: roomData.locked ? false : null
    }).catch(() => {});
    saveServerConfig(interaction.guildId, config);
    return interaction.reply({
      content: roomData.locked ? `${EMOJI.ok} Oda kilitlendi. Sadece sen + izin verdiklerin girebilir.` : `${EMOJI.ok} Oda açıldı. Herkes girebilir.`,
      ephemeral: true
    });
  }

  if (id === "eb_tv_rename") {
    await interaction.showModal(
      new ModalBuilder().setCustomId("eb_tv_rename_modal").setTitle("Oda İsmi")
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("name").setLabel("Yeni isim").setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(90)
        ))
    );
    return true;
  }

  if (id === "eb_tv_kick") {
    await interaction.reply({
      content: "Atılacak üyeyi seç:",
      components: [new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder().setCustomId("eb_tv_kick_select").setPlaceholder("Üye seç").setMinValues(1).setMaxValues(1)
      )],
      ephemeral: true
    });
    return true;
  }

  if (id === "eb_tv_allow") {
    await interaction.reply({
      content: "Odaya giriş izni verilecek üyeyi seç:",
      components: [new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder().setCustomId("eb_tv_allow_select").setPlaceholder("Üye seç").setMinValues(1).setMaxValues(1)
      )],
      ephemeral: true
    });
    return true;
  }

  return false;
}

async function handleTempVoiceModal(interaction) {
  const config = getServerConfig(interaction.guildId);
  const tv = tvCfg(config);
  const ownerRoom = Object.entries(tv.rooms).find(([, r]) => r.ownerId === interaction.user.id);
  if (!ownerRoom) return interaction.reply({ content: `${EMOJI.no} Aktif özel odan yok.`, ephemeral: true });

  const [roomId] = ownerRoom;
  const channel = interaction.guild.channels.cache.get(roomId);
  if (!channel) return interaction.reply({ content: `${EMOJI.no} Oda bulunamadı.`, ephemeral: true });

  if (interaction.customId === "eb_tv_limit_modal") {
    const val = parseInt(interaction.fields.getTextInputValue("limit"), 10);
    if (!Number.isFinite(val) || val < 0 || val > 99) {
      return interaction.reply({ content: `${EMOJI.no} 0-99 arası sayı gir.`, ephemeral: true });
    }
    await channel.setUserLimit(val).catch(() => {});
    return interaction.reply({ content: `${EMOJI.ok} Limit **${val === 0 ? "sınırsız" : val}** olarak ayarlandı.`, ephemeral: true });
  }

  if (interaction.customId === "eb_tv_rename_modal") {
    const name = interaction.fields.getTextInputValue("name").trim().slice(0, 90);
    if (!name) return interaction.reply({ content: `${EMOJI.no} İsim boş olamaz.`, ephemeral: true });
    await channel.setName(`${EMOJI.room} ${name}`).catch(() => {});
    return interaction.reply({ content: `${EMOJI.ok} Oda ismi güncellendi.`, ephemeral: true });
  }

  return false;
}

async function handleTempVoiceSelect(interaction) {
  const isKick = interaction.customId === "eb_tv_kick_select";
  const isAllow = interaction.customId === "eb_tv_allow_select";
  if (!isKick && !isAllow) return false;

  const config = getServerConfig(interaction.guildId);
  const tv = tvCfg(config);
  const ownerRoom = Object.entries(tv.rooms).find(([, r]) => r.ownerId === interaction.user.id);
  if (!ownerRoom) return interaction.reply({ content: `${EMOJI.no} Aktif özel odan yok.`, ephemeral: true });

  const [roomId] = ownerRoom;
  const channel = interaction.guild.channels.cache.get(roomId);
  if (!channel) return interaction.reply({ content: `${EMOJI.no} Oda bulunamadı.`, ephemeral: true });

  const targetId = interaction.values[0];

  if (isAllow) {
    if (targetId === interaction.user.id) {
      return interaction.reply({ content: `${EMOJI.no} Kendine zaten izin var.`, ephemeral: true });
    }
    await channel.permissionOverwrites.edit(targetId, {
      Connect: true,
      Speak: true,
      Stream: true
    }).catch(() => {});
    return interaction.reply({
      content: `${EMOJI.ok} <@${targetId}> odana giriş izni aldı.`,
      ephemeral: true
    });
  }

  if (targetId === interaction.user.id) return interaction.reply({ content: `${EMOJI.no} Kendini atamazsın.`, ephemeral: true });

  const target = channel.members.get(targetId);
  if (!target) return interaction.reply({ content: `${EMOJI.no} Bu üye odanda değil.`, ephemeral: true });

  await target.voice.disconnect("Oda sahibi tarafından atıldı").catch(() => {});
  // İzni de kaldır
  await channel.permissionOverwrites.delete(targetId).catch(() => {});
  return interaction.reply({ content: `${EMOJI.ok} <@${targetId}> odadan atıldı.`, ephemeral: true });
}

// Voice state listener
client.on("voiceStateUpdate", async (oldState, newState) => {
  await handleTempVoiceState(oldState, newState);
});

// ======================================================
// EĞLENCE KOMUTLARI (Owo tarzı)
// ======================================================

const FUN_GIFS = {
  hug: [
    "https://media.tenor.com/kCZjTqCKiggAAAAC/hug.gif",
    "https://media.tenor.com/J7eGDvGeP9kAAAAC/anime-hug.gif",
    "https://media.tenor.com/8o4fWGwAY6EAAAAC/hug-anime.gif"
  ],
  kiss: [
    "https://media.tenor.com/T_16WAFUo-YAAAAC/anime-kiss.gif",
    "https://media.tenor.com/1YMrMsJwtG0AAAAC/kiss-anime.gif",
    "https://media.tenor.com/OQ0xWk_nWOcAAAAC/anime-kiss.gif"
  ],
  slap: [
    "https://media.tenor.com/XiYuU9h44-AAAAAC/anime-slap.gif",
    "https://media.tenor.com/EfgK5t5O3yIAAAAC/slap-anime.gif",
    "https://media.tenor.com/WsIR5nUsV88AAAAC/anime-slap.gif"
  ],
  pat: [
    "https://media.tenor.com/0Z0vTQkQYqIAAAAC/pat-anime.gif",
    "https://media.tenor.com/7xqK9QwQyGcAAAAC/anime-pat.gif",
    "https://media.tenor.com/2oOTpioFAacAAAAC/pat-head-anime.gif"
  ],
  punch: [
    "https://media.tenor.com/6a42QlkAsT8AAAAC/anime-punch.gif",
    "https://media.tenor.com/1V0J5V5V5V4AAAAC/punch.gif"
  ],
  dance: [
    "https://media.tenor.com/0Z0vTQkQYqIAAAAC/dance-anime.gif",
    "https://media.tenor.com/V5V5V5V5V5UAAAAC/anime-dance.gif"
  ]
};

function pickGif(type) {
  const list = FUN_GIFS[type] || FUN_GIFS.hug;
  return list[Math.floor(Math.random() * list.length)];
}

const FUN_ACTIONS = {
  sarıl: { emoji: EMOJI.hug, verb: "sarıldı", gif: "hug", color: 0xff9ff3 },
  öp: { emoji: EMOJI.kiss, verb: "öpücük gönderdi", gif: "kiss", color: 0xff6b6b },
  tokat: { emoji: EMOJI.slap, verb: "tokat attı", gif: "slap", color: 0xfeca57 },
  okşa: { emoji: EMOJI.pat, verb: "okşadı", gif: "pat", color: 0x48dbfb },
  yumruk: { emoji: "👊", verb: "yumruk attı", gif: "punch", color: 0xff6348 },
  dans: { emoji: "💃", verb: "dans etti", gif: "dance", color: 0x5f27cd }
};

async function handleFunCommand(interaction) {
  const name = interaction.commandName;
  const config = getServerConfig(interaction.guildId);
  if (config.toggles?.fun === false) {
    return interaction.reply({ content: `${EMOJI.no} Eğlence komutları bu sunucuda kapalı.`, ephemeral: true });
  }

  // /eglence ship
  if (name === "ship") {
    const u1 = interaction.options.getUser("kisi1") || interaction.user;
    const u2 = interaction.options.getUser("kisi2");
    if (!u2) return interaction.reply({ content: `${EMOJI.no} İkinci kişiyi seç.`, ephemeral: true });
    const score = Math.floor(Math.random() * 101);
    const bar = "█".repeat(Math.floor(score / 10)) + "░".repeat(10 - Math.floor(score / 10));
    let comment = score > 80 ? "💘 Aşk mı bu?!" : score > 50 ? "💕 İyi gidiyor..." : score > 20 ? "🤔 Bir şans verilebilir." : "💔 Pek tutmadı...";
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${EMOJI.ship} Ship`)
          .setColor(0xff6b81)
          .setDescription(`**${u1.username}** 💕 **${u2.username}**\n\n\`${bar}\` **${score}%**\n${comment}`)
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // /eglence 8ball
  if (name === "8ball") {
    const q = interaction.options.getString("soru");
    const answers = [
      "Kesinlikle evet.", "Evet.", "Belki.", "Muhtemelen.", "Şüpheli...",
      "Hayır.", "Asla.", "Tekrar sor.", "Cevabı bilmiyorum.", "Şansın yüksek!",
      "Kaderinde yok.", "Emin değilim.", "Olumlu görünüyor.", "Olumsuz."
    ];
    const ans = answers[Math.floor(Math.random() * answers.length)];
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${EMOJI.eightBall} 8Ball`)
          .setColor(0x2c2f33)
          .addFields(
            { name: "Soru", value: q.slice(0, 500) },
            { name: "Cevap", value: ans }
          )
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // /eglence zar
  if (name === "zar") {
    const sides = interaction.options.getInteger("yuz") || 6;
    const result = Math.floor(Math.random() * sides) + 1;
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${EMOJI.dice} Zar`)
          .setColor(0x5865f2)
          .setDescription(`**${sides}** yüzlü zar → **${result}**`)
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // /eglence yazitura
  if (name === "yazıtura") {
    const result = Math.random() < 0.5 ? "Yazı" : "Tura";
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${EMOJI.coinFlip} Yazı Tura`)
          .setColor(0xfee75c)
          .setDescription(`Sonuç: **${result}**`)
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // /eglence rate
  if (name === "rate") {
    const what = interaction.options.getString("ne");
    const score = Math.floor(Math.random() * 101);
    const stars = "⭐".repeat(Math.ceil(score / 20)) + "☆".repeat(5 - Math.ceil(score / 20));
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 Rate")
          .setColor(0xfee75c)
          .setDescription(`**${what.slice(0, 100)}**\n\n${stars}\n**${score}/100**`)
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // /eglence howgay
  if (name === "howgay") {
    const target = interaction.options.getUser("kullanici") || interaction.user;
    const score = Math.floor(Math.random() * 101);
    const bar = "█".repeat(Math.floor(score / 10)) + "░".repeat(10 - Math.floor(score / 10));
    let msg = score > 90 ? "🏳️‍🌈 Efsane!" : score > 60 ? "🌈 Oldukça gay" : score > 30 ? "🙂 Biraz gay" : "😐 Gay değil gibi";
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🌈 How Gay")
          .setColor(0xff6b81)
          .setDescription(`**${target.username}**\n\n\`${bar}\` **${score}%**\n${msg}`)
          .setThumbnail(target.displayAvatarURL())
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // /eglence askolcer (ship alias with better name)
  if (name === "aşkölçer") {
    const u1 = interaction.options.getUser("kisi1");
    const u2 = interaction.options.getUser("kisi2");
    const score = Math.floor(Math.random() * 101);
    const bar = "❤️".repeat(Math.floor(score / 20)) + "🤍".repeat(5 - Math.floor(score / 20));
    let comment = score >= 90 ? "💍 Evlenin artık!" : score >= 70 ? "💘 Gerçek aşk!" : score >= 40 ? "💕 Umut var" : "💔 Zor...";
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("💘 Aşk Ölçer")
          .setColor(0xff6b81)
          .setDescription(`**${u1.username}** × **${u2.username}**\n\n${bar}\n**${score}%**\n${comment}`)
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // Action commands
  const action = FUN_ACTIONS[name];
  if (action) {
    const target = interaction.options.getUser("kullanici") || interaction.user;
    const self = target.id === interaction.user.id;
    const gif = pickGif(action.gif);

    const embed = new EmbedBuilder()
      .setColor(action.color)
      .setDescription(
        self
          ? `${action.emoji} **${interaction.user.username}** kendine ${action.verb}!`
          : `${action.emoji} **${interaction.user.username}**, **${target.username}** kişisine ${action.verb}!`
      )
      .setImage(gif)
      .setFooter({ text: BRAND_FOOTER });

    return interaction.reply({ embeds: [embed] });
  }

  return false;
}

// ======================================================
// CİNSİYET ROLLERİ + KAYIT PANELİ GELİŞTİRME
// ======================================================

async function ensureGenderRoles(guild, config) {
  const names = {
    male: `${EMOJI.male} Erkek`,
    female: `${EMOJI.female} Kadın`,
    unspecified: `${EMOJI.unspecified} Belirtmek İstemiyorum`
  };
  for (const [key, name] of Object.entries(names)) {
    if (config.roles[key] && guild.roles.cache.get(config.roles[key])) continue;
    let role = guild.roles.cache.find(r => r.name === name);
    if (!role) {
      role = await guild.roles.create({ name, reason: "Endless Builder cinsiyet rolü" }).catch(() => null);
      if (role) {
        config.createdIds ??= { categories: [], channels: [], roles: [] };
        config.createdIds.roles.push(role.id);
      }
    }
    if (role) config.roles[key] = role.id;
  }
  saveServerConfig(guild.id, config);
}

function genderLabel(key) {
  if (key === "male") return `${EMOJI.male} Erkek`;
  if (key === "female") return `${EMOJI.female} Kadın`;
  if (key === "unspecified" || key === "none") return `${EMOJI.unspecified} Belirtmedi`;
  return "*henüz seçilmedi*";
}

function buildRegEmbed(user, staffUser, session, genderEnabled, alreadyRegistered = false) {
  const genderText = genderLabel(session?.gender);
  const nickText = session?.nick ? `**${session.nick}**` : "*değiştirilmeyecek*";
  return new EmbedBuilder()
    .setTitle(`${EMOJI.register} ${EMOJI.dot} Kayıt Paneli`)
    .setColor(alreadyRegistered ? 0xfaa61a : 0x57f287)
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      `**Kayıt edilecek:** ${user} (\`${user.tag}\`)\n` +
      `**Yetkili:** ${staffUser}\n` +
      (alreadyRegistered ? `\n⚠️ Bu üye **zaten kayıtlı** görünüyor. Yine de devam edebilirsin.\n` : `\n`) +
      (genderEnabled
        ? `${EMOJI.spark} **Cinsiyet** seç (zorunlu değil), istersen **isim** değiştir.\nSonra **Kayıt Et** ile tamamla.\n\n🔒 Bu panel sadece sana özeldir; üye kendi cinsiyetini seçemez.`
        : `${EMOJI.spark} İstersen isim değiştir, sonra **Kayıt Et** ile tamamla.`) +
      `\n\n**Seçimler:**\n• Cinsiyet: ${genderText}\n• İsim: ${nickText}`
    )
    .setFooter({ text: BRAND_FOOTER });
}

function buildRegRows(targetId, genderEnabled, session) {
  const rows = [];
  if (genderEnabled) {
    const g = session?.gender;
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`eb_reg_g:male:${targetId}`)
        .setLabel(g === "male" ? "Erkek ✓" : "Erkek")
        .setEmoji(EMOJI.male)
        .setStyle(g === "male" ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`eb_reg_g:female:${targetId}`)
        .setLabel(g === "female" ? "Kadın ✓" : "Kadın")
        .setEmoji(EMOJI.female)
        .setStyle(g === "female" ? ButtonStyle.Success : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`eb_reg_g:none:${targetId}`)
        .setLabel(g === "unspecified" ? "Belirtmedi ✓" : "Belirtmek İstemiyorum")
        .setEmoji(EMOJI.unspecified)
        .setStyle(g === "unspecified" ? ButtonStyle.Success : ButtonStyle.Secondary)
    ));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`eb_reg_name:${targetId}`)
      .setLabel(session?.nick ? ("İsim: " + String(session.nick).slice(0, 18)) : "İsim Değiştir")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`eb_reg_ok:${targetId}`).setLabel("Kayıt Et").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`eb_reg_cancel:${targetId}`).setLabel("İptal").setEmoji("❌").setStyle(ButtonStyle.Danger)
  ));
  return rows;
}

// Herkese açık cinsiyet paneli kaldırıldı.
// Cinsiyet yalnızca yetkili /kayit et ve /kayit cinsiyet ile atanır.

commands.push(
  new SlashCommandBuilder()
    .setName("ozel-oda-kur")
    .setDescription("Özel oda (secret room) sistemini kur")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .setDMPermission(false)
    .addChannelOption(o => o.setName("metin").setDescription("Yönetim panelinin gideceği metin kanalı").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption(o => o.setName("ses").setDescription("Giriş ses kanalı (buraya girince oda oluşur)").addChannelTypes(ChannelType.GuildVoice).setRequired(true))
    .addChannelOption(o => o.setName("kategori").setDescription("Odaların oluşacağı kategori (boşsa otomatik)").addChannelTypes(ChannelType.GuildCategory).setRequired(false)),

  new SlashCommandBuilder().setName("sarıl").setDescription("Birine sarıl").setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Hedef")),
  new SlashCommandBuilder().setName("öp").setDescription("Birini öp").setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Hedef")),
  new SlashCommandBuilder().setName("tokat").setDescription("Birine tokat at").setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Hedef")),
  new SlashCommandBuilder().setName("okşa").setDescription("Birini okşa").setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Hedef")),
  new SlashCommandBuilder().setName("yumruk").setDescription("Birine yumruk at").setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Hedef")),
  new SlashCommandBuilder().setName("dans").setDescription("Dans et").setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Hedef (opsiyonel)")),
  new SlashCommandBuilder().setName("ship").setDescription("İki kişiyi ship'le").setDMPermission(false)
    .addUserOption(o => o.setName("kisi1").setDescription("1. kişi"))
    .addUserOption(o => o.setName("kisi2").setDescription("2. kişi").setRequired(true)),
  new SlashCommandBuilder().setName("8ball").setDescription("Sihirli 8 topa sor").setDMPermission(false)
    .addStringOption(o => o.setName("soru").setDescription("Sorun").setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder().setName("zar").setDescription("Zar at").setDMPermission(false)
    .addIntegerOption(o => o.setName("yuz").setDescription("Yüz sayısı (varsayılan 6)").setMinValue(2).setMaxValue(100)),
  new SlashCommandBuilder().setName("yazıtura").setDescription("Yazı tura at").setDMPermission(false),
  new SlashCommandBuilder().setName("kayitsizlar").setDescription("Kayıtsız üyeleri listele (yetkili)")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles).setDMPermission(false),
  new SlashCommandBuilder().setName("rate").setDescription("Birini veya bir şeyi puanla (0-100)")
    .setDMPermission(false)
    .addStringOption(o => o.setName("ne").setDescription("Ne puanlanacak?").setRequired(true).setMaxLength(100)),
  new SlashCommandBuilder().setName("howgay").setDescription("Ne kadar gay? 🌈")
    .setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Hedef")),
  new SlashCommandBuilder().setName("aşkölçer").setDescription("İki kişi arasındaki aşkı ölç")
    .setDMPermission(false)
    .addUserOption(o => o.setName("kisi1").setDescription("1. kişi").setRequired(true))
    .addUserOption(o => o.setName("kisi2").setDescription("2. kişi").setRequired(true)),
  // Yetkili: kayıt sonrası cinsiyet düzeltme (herkese açık panel yerine)
  new SlashCommandBuilder()
    .setName("cinsiyet-degistir")
    .setDescription("Üyenin cinsiyet rolünü değiştir (yalnızca yetkili)")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Üye").setRequired(true))
    .addStringOption(o =>
      o.setName("cinsiyet")
        .setDescription("Yeni cinsiyet")
        .setRequired(true)
        .addChoices(
          { name: "Erkek", value: "male" },
          { name: "Kadın", value: "female" },
          { name: "Belirtmek İstemiyorum", value: "unspecified" }
        )
    )
);

async function applyRegistration(guild, member, staffUser, genderKey = null, newNick = null) {
  const config = getServerConfig(guild.id);
  await ensureGenderRoles(guild, config);

  const registeredRole = config.registration?.registeredRoleId || config.roles?.member;
  const unregisteredRole = config.registration?.unregisteredRoleId || config.roles?.unregistered;

  if (unregisteredRole) await member.roles.remove(unregisteredRole).catch(() => {});
  if (registeredRole) await member.roles.add(registeredRole).catch(() => {});

  if (genderKey) {
    const normalized = genderKey === "none" ? "unspecified" : genderKey;
    for (const k of ["male", "female", "unspecified"]) {
      const rid = config.roles[k];
      if (rid && member.roles.cache.has(rid) && k !== normalized) {
        await member.roles.remove(rid).catch(() => {});
      }
    }
    const gRole = config.roles[normalized];
    if (gRole) await member.roles.add(gRole).catch(() => {});
  }

  if (newNick && newNick.length >= 1 && newNick.length <= 32) {
    const me = guild.members.me;
    if (me && member.roles.highest.position < me.roles.highest.position) {
      await member.setNickname(newNick, `Kayıt: ${staffUser.tag}`).catch(() => {});
    }
  }

  await sendLog(
    guild,
    `📝 ${member.user} kayıt edildi.\n**Yetkili:** ${staffUser}\n**Cinsiyet:** ${genderLabel(genderKey)}${newNick ? `\n**İsim:** ${newNick}` : ""}`
  );
  return true;
}

async function applyGenderOnly(guild, member, staffUser, genderKey) {
  const config = getServerConfig(guild.id);
  await ensureGenderRoles(guild, config);
  const normalized = genderKey === "none" ? "unspecified" : genderKey;
  for (const k of ["male", "female", "unspecified"]) {
    const rid = config.roles[k];
    if (rid && member.roles.cache.has(rid) && k !== normalized) {
      await member.roles.remove(rid).catch(() => {});
    }
  }
  const gRole = config.roles[normalized];
  if (gRole) await member.roles.add(gRole).catch(() => {});
  await sendLog(
    guild,
    `🎭 ${member.user} cinsiyeti güncellendi: ${genderLabel(normalized)}\n**Yetkili:** ${staffUser}`
  );
  return true;
}

async function handleRegPanel(interaction) {
  const id = interaction.customId || "";
  if (!id.startsWith("eb_reg_")) return false;

  const parts = id.split(":");
  const action = parts[0];
  let genderKey = null;
  let targetId = null;

  if (action === "eb_reg_g") {
    genderKey = parts[1];
    targetId = parts[2];
  } else {
    targetId = parts[1];
  }

  if (!targetId) {
    return interaction.reply({ content: `${EMOJI.no} Geçersiz işlem.`, ephemeral: true });
  }

  const config = getServerConfig(interaction.guildId);
  if (!canRegister(interaction, config)) {
    return interaction.reply({ content: `${EMOJI.no} Kayıt yetkin yok.`, ephemeral: true });
  }

  const regKey = `${interaction.user.id}:${targetId}`;
  let session = regSessions.get(regKey);
  if (!session) {
    session = { gender: null, nick: null, staffId: interaction.user.id, targetId, createdAt: Date.now() };
    regSessions.set(regKey, session);
  }

  if (id.startsWith("eb_reg_cancel:")) {
    regSessions.delete(regKey);
    return interaction.update({ content: "❌ Kayıt iptal edildi.", embeds: [], components: [] });
  }

  const member = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!member) {
    regSessions.delete(regKey);
    return interaction.update({ content: `${EMOJI.no} Kullanıcı artık sunucuda değil.`, embeds: [], components: [] });
  }

  const genderEnabled = config.registration?.genderEnabled !== false;
  const unregId = config.registration?.unregisteredRoleId || config.roles?.unregistered;
  const alreadyRegistered = unregId
    ? !member.roles.cache.has(unregId)
    : Boolean(config.roles?.member && member.roles.cache.has(config.roles.member));

  if (id.startsWith("eb_reg_name:")) {
    const nickInput = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Yeni isim (1-32 karakter)")
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(32)
      .setRequired(true)
      .setPlaceholder(member.displayName);
    if (session.nick) nickInput.setValue(String(session.nick).slice(0, 32));

    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(`eb_reg_nick:${targetId}`)
        .setTitle("Kayıt İsmi")
        .addComponents(new ActionRowBuilder().addComponents(nickInput))
    );
    return true;
  }

  if (action === "eb_reg_g") {
    const map = { male: "male", female: "female", none: "unspecified" };
    session.gender = map[genderKey] || null;
    regSessions.set(regKey, session);
    return interaction.update({
      embeds: [buildRegEmbed(member.user, interaction.user, session, genderEnabled, alreadyRegistered)],
      components: buildRegRows(targetId, genderEnabled, session)
    });
  }

  if (id.startsWith("eb_reg_ok:")) {
    await applyRegistration(interaction.guild, member, interaction.user, session.gender, session.nick);
    regSessions.delete(regKey);
    const nickLine = session.nick ? `\nİsim: **${session.nick}**` : "";
    return interaction.update({
      content: `${EMOJI.ok} **${member.user.tag}** başarıyla kayıt edildi!\nCinsiyet: ${genderLabel(session.gender)}${nickLine}`,
      embeds: [],
      components: []
    });
  }

  return false;
}

async function handleRegModal(interaction) {
  if (!interaction.customId.startsWith("eb_reg_nick:")) return false;
  const targetId = interaction.customId.split(":")[1];
  const config = getServerConfig(interaction.guildId);
  if (!canRegister(interaction, config)) {
    return interaction.reply({ content: `${EMOJI.no} Kayıt yetkin yok.`, ephemeral: true });
  }

  const nick = interaction.fields.getTextInputValue("nick").trim();
  if (!nick || nick.length > 32) {
    return interaction.reply({ content: `${EMOJI.no} Geçersiz isim.`, ephemeral: true });
  }

  const member = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!member) {
    return interaction.reply({ content: `${EMOJI.no} Kullanıcı bulunamadı.`, ephemeral: true });
  }

  const regKey = `${interaction.user.id}:${targetId}`;
  let session = regSessions.get(regKey);
  if (!session) {
    session = { gender: null, nick: null, staffId: interaction.user.id, targetId, createdAt: Date.now() };
  }
  session.nick = nick;
  regSessions.set(regKey, session);

  return interaction.reply({
    content:
      `${EMOJI.ok} İsim **${nick}** olarak ayarlandı.\n` +
      `Cinsiyet: ${genderLabel(session.gender)}\n\n` +
      `Kaydı tamamlamak için paneldeki **Kayıt Et** butonuna bas.`,
    ephemeral: true
  });
}

setInterval(() => {
  const limit = Date.now() - 30 * 60 * 1000;
  for (const [key, s] of regSessions) {
    if ((s.createdAt || 0) < limit) regSessions.delete(key);
  }
}, 10 * 60 * 1000).unref();

client.on("interactionCreate", async (interaction) => {

      // ===== EKSIK / EKSIKKUR YENI SISTEM =====
      try {
        if (interaction.isChatInputCommand()) {
          if (interaction.commandName === "eksik") {
            return await handleEksikSlash(interaction);
          }
          if (interaction.commandName === "eksikkur") {
            return await handleEksikKurSlash(interaction);
          }
        }
        if (interaction.isButton()) {
          if (interaction.customId.startsWith("eksikkur_confirm:")) {
            const parts = interaction.customId.split(":");
            const uid = parts[1];
            if (interaction.user.id !== uid && !isAdmin(interaction)) {
              return interaction.reply({ content:"❌ Sadece komutu kullanan kişi onaylayabilir.", ephemeral:true });
            }
            const analysis = eksikAnalyses.get(interaction.guildId);
            if (!analysis) return interaction.reply({ content:"❌ Analiz bulunamadı, tekrar `/eksik` çalıştır.", ephemeral:true });
            return await executeEksikKur(interaction, analysis);
          }
          if (interaction.customId.startsWith("eksikkur_cancel:")) {
            const parts = interaction.customId.split(":");
            const uid = parts[1];
            if (interaction.user.id !== uid && !isAdmin(interaction)) {
              return interaction.reply({ content:"❌ Sadece komutu kullanan kişi iptal edebilir.", ephemeral:true });
            }
            eksikAnalyses.delete(interaction.guildId);
            return interaction.update({ content:"❌ Kurulum iptal edildi.", embeds:[], components:[] });
          }
        }
      } catch (e) {
        console.error("EKSIK HANDLER ERROR", e);
      }
      // ===== END YENI SISTEM =====
  try {
    if (!interaction.guild) return;
    // Ana handler zaten cevapladıysa tekrar işleme (çift dinleyici güvenliği)
    if (interaction.replied || interaction.deferred) return;

    // Özel oda buton / modal / select
    if (interaction.isButton() && interaction.customId.startsWith("eb_tv_")) {
      await handleTempVoiceButton(interaction);
      return;
    }
    if (interaction.isButton() && interaction.customId.startsWith("eb_m_")) {
      await handleMusicButton(interaction);
      return;
    }
    if (interaction.isModalSubmit() && interaction.customId.startsWith("eb_tv_")) {
      await handleTempVoiceModal(interaction);
      return;
    }
    if (interaction.isUserSelectMenu() && (interaction.customId === "eb_tv_kick_select" || interaction.customId === "eb_tv_allow_select")) {
      await handleTempVoiceSelect(interaction);
      return;
    }

    // Kayıt paneli
    if (interaction.isButton() && interaction.customId.startsWith("eb_reg_")) {
      await handleRegPanel(interaction);
      return;
    }
    if (interaction.isModalSubmit() && interaction.customId.startsWith("eb_reg_")) {
      await handleRegModal(interaction);
      return;
    }


    // Eğlence + özel oda kur komutları
    if (interaction.isChatInputCommand()) {
      const n = interaction.commandName;
      if (typeof GROUPED_TOP_LEVEL !== "undefined" && GROUPED_TOP_LEVEL.includes(n)) {
        await handleGroupedCommand(interaction);
        return;
      }
      if (n === "özel-oda-kur" || n === "ozel-oda-kur") {
        await setupTempVoice(interaction);
        return;
      }
      if (n === "cinsiyet-degistir") {
        const config = getServerConfig(interaction.guildId);
        if (!canRegister(interaction, config) && !canManageGuild(interaction)) {
          return interaction.reply({ content: `${EMOJI.no} Bu komut için kayıt yetkisi gerekir.`, ephemeral: true });
        }
        if (config.registration?.genderEnabled === false) {
          return interaction.reply({ content: `${EMOJI.no} Cinsiyet sistemi bu sunucuda kapalı.`, ephemeral: true });
        }
        const target = interaction.options.getUser("kullanici");
        const gender = interaction.options.getString("cinsiyet");
        if (!target || target.bot) {
          return interaction.reply({ content: `${EMOJI.no} Geçerli bir üye seç.`, ephemeral: true });
        }
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) {
          return interaction.reply({ content: `${EMOJI.no} Kullanıcı sunucuda değil.`, ephemeral: true });
        }
        await applyGenderOnly(interaction.guild, member, interaction.user, gender);
        return interaction.reply({
          content: `${EMOJI.ok} ${target} cinsiyeti güncellendi: ${genderLabel(gender)}`,
          ephemeral: true,
          allowedMentions: { users: [] }
        });
      }
      if (["sarıl", "öp", "tokat", "okşa", "yumruk", "dans", "ship", "8ball", "zar", "yazıtura", "rate", "howgay", "aşkölçer"].includes(n)) {
        await handleFunCommand(interaction);
        return;
      }
      if (UTILITY_COMMANDS.includes(n)) {
        await handleUtilityCommand(interaction);
        return;
      }
      if (typeof MUSIC_COMMANDS !== "undefined" && MUSIC_COMMANDS.includes(n)) {
        await handleMusicCommand(interaction);
        return;
      }
      if (n === "öneri" || n === "öneri-kanal" || n === "oneri" || n === "oneri-kanal") {
        await handleOneriCommand(interaction);
        return;
      }
      if (n === "kayitsizlar") {
        const config = getServerConfig(interaction.guildId);
        if (!canRegister(interaction, config) && !canManageGuild(interaction)) {
          return interaction.reply({ content: `${EMOJI.no} Yetkin yok.`, ephemeral: true });
        }
        const unregId = config.registration?.unregisteredRoleId || config.roles?.unregistered;
        if (!unregId) {
          return interaction.reply({ content: `${EMOJI.no} Kayıtsız rolü ayarlı değil.`, ephemeral: true });
        }
        const role = interaction.guild.roles.cache.get(unregId);
        if (!role) {
          return interaction.reply({ content: `${EMOJI.no} Kayıtsız rolü bulunamadı.`, ephemeral: true });
        }
        const members = [...role.members.values()].filter(m => !m.user.bot).slice(0, 30);
        if (!members.length) {
          return interaction.reply({ content: `${EMOJI.ok} Kayıtsız üye yok!`, ephemeral: true });
        }
        const lines = members.map((m, i) => `${i + 1}. ${m} (\`${m.user.tag}\`)`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`${EMOJI.register} Kayıtsız Üyeler`)
              .setColor(0xfaa61a)
              .setDescription(lines.join("\n") + (role.members.size > 30 ? `\n\n... ve ${role.members.size - 30} kişi daha` : ""))
              .setFooter({ text: `Toplam: ${role.members.filter(m => !m.user.bot).size} • ${BRAND_FOOTER}` })
          ],
          ephemeral: true,
          allowedMentions: { parse: [] }
        });
      }
    }
  } catch (error) {
    console.error("EXTRA FEATURES INTERACTION ERROR:", error);
    if (interaction.isRepliable?.() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `${EMOJI.no} Bir hata oluştu.`, ephemeral: true }).catch(() => {});
    }
  }
});


// ======================================================
// YARDIMCI SİSTEMLER (AFK, Snipe, Bilgi, Anket, Hatırlatıcı...)
// ======================================================

const afkMap = new Map(); // `${guildId}:${userId}` -> { reason, since }
const snipeMap = new Map(); // channelId -> { content, authorTag, authorId, avatar, createdAt, deletedAt, attachments }
const remindTimers = new Map(); // id -> timeout handle
let remindSeq = 1;

function afkKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function setAfk(guildId, userId, reason) {
  afkMap.set(afkKey(guildId, userId), {
    reason: (reason || "Sebep belirtilmedi").slice(0, 200),
    since: Date.now()
  });
}

function clearAfk(guildId, userId) {
  return afkMap.delete(afkKey(guildId, userId));
}

function getAfk(guildId, userId) {
  return afkMap.get(afkKey(guildId, userId)) || null;
}

function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}g`);
  if (h) parts.push(`${h}s`);
  if (m) parts.push(`${m}dk`);
  if (!d && !h) parts.push(`${sec}sn`);
  return parts.join(" ") || "0sn";
}

async function handleAfkMessage(message) {
  if (!message.guild || message.author.bot) return;

  // Kendi AFK'sını kaldır
  if (clearAfk(message.guild.id, message.author.id)) {
    await message.reply({
      content: `${EMOJI.ok} AFK modundan çıktın.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
  }

  // Etiketlenen AFK üyeleri bildir
  const mentioned = message.mentions.users;
  if (!mentioned.size) return;

  const lines = [];
  for (const user of mentioned.values()) {
    if (user.bot || user.id === message.author.id) continue;
    const data = getAfk(message.guild.id, user.id);
    if (!data) continue;
    lines.push(
      `💤 **${user.username}** AFK: ${data.reason}\n` +
      `⏱️ <t:${Math.floor(data.since / 1000)}:R>`
    );
    if (lines.length >= 5) break;
  }

  if (lines.length) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x99aab5)
          .setDescription(lines.join("\n\n"))
          .setFooter({ text: BRAND_FOOTER })
      ],
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
  }
}

async function handleSnipeStore(message) {
  if (!message.guild || message.author?.bot) return;
  if (!message.content && !message.attachments?.size) return;

  snipeMap.set(message.channel.id, {
    content: (message.content || "").slice(0, 1000) || null,
    authorTag: message.author.tag,
    authorId: message.author.id,
    avatar: message.author.displayAvatarURL(),
    createdAt: message.createdTimestamp,
    deletedAt: Date.now(),
    attachments: [...(message.attachments?.values() || [])]
      .slice(0, 3)
      .map(a => a.url)
  });

  // 5 dk sonra otomatik temizle
  setTimeout(() => {
    const cur = snipeMap.get(message.channel.id);
    if (cur && cur.deletedAt && Date.now() - cur.deletedAt >= 5 * 60 * 1000 - 1000) {
      snipeMap.delete(message.channel.id);
    }
  }, 5 * 60 * 1000).unref?.();
}

async function handleUtilityCommand(interaction) {
  const name = interaction.commandName;
  if (!interaction.guild) {
    return interaction.reply({ content: "❌ Bu komut sadece sunucuda kullanılabilir.", ephemeral: true });
  }

  // ---------- /arac afk ----------
  if (name === "afk") {
    const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi";
    setAfk(interaction.guildId, interaction.user.id, reason);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("💤 AFK")
          .setColor(0x99aab5)
          .setDescription(`${interaction.user} artık **AFK**.\n**Sebep:** ${reason.slice(0, 200)}`)
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // ---------- /arac avatar ----------
  if (name === "avatar") {
    const user = interaction.options.getUser("kullanici") || interaction.user;
    const url = user.displayAvatarURL({ size: 4096 });
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🖼️ ${user.username} • Avatar`)
          .setColor(0x5865f2)
          .setImage(url)
          .setDescription(`[PNG](${user.displayAvatarURL({ size: 4096, extension: "png" })}) • [JPG](${user.displayAvatarURL({ size: 4096, extension: "jpg" })}) • [WEBP](${user.displayAvatarURL({ size: 4096, extension: "webp" })})`)
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // ---------- /arac kullanici ----------
  if (name === "kullanici") {
    const user = interaction.options.getUser("kullanici") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const roles = member
      ? [...member.roles.cache.values()]
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .slice(0, 15)
          .map(r => `${r}`)
          .join(" ") || "Yok"
      : "Sunucuda değil";

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(member?.displayColor || 0x5865f2)
      .addFields(
        { name: "ID", value: `\`${user.id}\``, inline: true },
        { name: "Bot", value: user.bot ? "Evet" : "Hayır", inline: true },
        { name: "Hesap", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: BRAND_FOOTER })
      .setTimestamp();

    if (member) {
      embed.addFields(
        { name: "Katılma", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: "Takma ad", value: member.nickname || "—", inline: true },
        { name: "Boost", value: member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : "Yok", inline: true },
        { name: `Roller (${member.roles.cache.size - 1})`, value: roles.slice(0, 1024) }
      );
    }

    return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }

  // ---------- /arac sunucu ----------
  if (name === "sunucu") {
    const g = interaction.guild;
    await g.members.fetch().catch(() => {});
    const owner = await g.fetchOwner().catch(() => null);
    const text = g.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voice = g.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const cats = g.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
    const bots = g.members.cache.filter(m => m.user.bot).size;
    const humans = (g.memberCount || g.members.cache.size) - bots;

    const embed = new EmbedBuilder()
      .setTitle(`🌐 ${g.name}`)
      .setColor(0x5865f2)
      .setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: "Sahip", value: owner ? `${owner.user.tag}` : "—", inline: true },
        { name: "ID", value: `\`${g.id}\``, inline: true },
        { name: "Oluşturulma", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Üye", value: `👤 ${humans} • 🤖 ${bots} • Toplam **${g.memberCount}**`, inline: false },
        { name: "Kanallar", value: `💬 ${text} • 🔊 ${voice} • 📁 ${cats}`, inline: true },
        { name: "Roller", value: String(g.roles.cache.size), inline: true },
        { name: "Emoji", value: String(g.emojis.cache.size), inline: true },
        { name: "Boost", value: `Seviye **${g.premiumTier}** • ${g.premiumSubscriptionCount || 0} boost`, inline: true },
        { name: "Doğrulama", value: String(g.verificationLevel), inline: true }
      )
      .setFooter({ text: BRAND_FOOTER })
      .setTimestamp();

    if (g.bannerURL()) embed.setImage(g.bannerURL({ size: 1024 }));
    return interaction.reply({ embeds: [embed] });
  }

  // ---------- /arac snipe ----------
  if (name === "snipe") {
    const data = snipeMap.get(interaction.channelId);
    if (!data) {
      return interaction.reply({
        content: "📭 Bu kanalda yakın zamanda silinen mesaj yok (en fazla 5 dk hatırlanır).",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🔫 Snipe")
      .setColor(0xed4245)
      .setAuthor({ name: data.authorTag, iconURL: data.avatar })
      .setDescription(data.content || "*[sadece medya]*")
      .addFields(
        { name: "Yazılma", value: `<t:${Math.floor(data.createdAt / 1000)}:R>`, inline: true },
        { name: "Silinme", value: `<t:${Math.floor(data.deletedAt / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: BRAND_FOOTER });

    if (data.attachments?.[0]) embed.setImage(data.attachments[0]);

    return interaction.reply({ embeds: [embed] });
  }

  // ---------- /arac anket ----------
  if (name === "anket") {
    if (!hasPermission(interaction, PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({
        content: "❌ Anket için **Mesajları Yönet** yetkisi gerekir.",
        ephemeral: true
      });
    }

    const soru = interaction.options.getString("soru").trim();
    const optsRaw = [
      interaction.options.getString("secenek1"),
      interaction.options.getString("secenek2"),
      interaction.options.getString("secenek3"),
      interaction.options.getString("secenek4"),
      interaction.options.getString("secenek5")
    ].filter(Boolean).map(s => s.trim()).filter(Boolean);

    if (optsRaw.length < 2) {
      return interaction.reply({ content: "❌ En az 2 seçenek gerekli.", ephemeral: true });
    }

    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
    const lines = optsRaw.map((o, i) => `${emojis[i]} ${o}`);

    await interaction.deferReply({ ephemeral: true });

    const msg = await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 Anket")
          .setColor(0x5865f2)
          .setDescription(`**${soru.slice(0, 250)}**\n\n${lines.join("\n")}`)
          .setFooter({ text: `Anket • ${interaction.user.username} • ${BRAND_FOOTER}` })
          .setTimestamp()
      ]
    });

    for (let i = 0; i < optsRaw.length; i++) {
      await msg.react(emojis[i]).catch(() => {});
    }

    return interaction.editReply({ content: `${EMOJI.ok} Anket gönderildi: ${msg.url}` });
  }

  // ---------- /arac rastgele ----------
  if (name === "rastgele") {
    const members = [...interaction.guild.members.cache.filter(m => !m.user.bot).values()];
    if (!members.length) {
      return interaction.reply({ content: "❌ Üye bulunamadı.", ephemeral: true });
    }
    const pick = members[Math.floor(Math.random() * members.length)];
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎲 Rastgele Üye")
          .setColor(0xfee75c)
          .setDescription(`${pick}`)
          .setThumbnail(pick.user.displayAvatarURL())
          .setFooter({ text: BRAND_FOOTER })
      ],
      allowedMentions: { parse: [] }
    });
  }

  // ---------- /arac hesapla ----------
  if (name === "hesapla") {
    const expr = interaction.options.getString("islem").trim();
    // Sadece güvenli matematiksel ifadeler
    if (!/^[\d\s+\-*/().%,^]+$/.test(expr) || expr.length > 80) {
      return interaction.reply({
        content: "❌ Geçersiz ifade. Sadece sayılar ve + - * / ( ) % kullan.",
        ephemeral: true
      });
    }
    try {
      const safe = expr.replace(/\^/g, "**").replace(/%/g, "/100*");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${safe})`)();
      if (!Number.isFinite(result)) throw new Error("NaN");
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🧮 Hesap")
            .setColor(0x57f287)
            .addFields(
              { name: "İşlem", value: `\`${expr}\`` },
              { name: "Sonuç", value: `**${result}**` }
            )
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
    } catch {
      return interaction.reply({ content: "❌ Hesaplanamadı.", ephemeral: true });
    }
  }

  // ---------- /arac hatirlat ----------
  if (name === "hatirlat") {
    const dakika = interaction.options.getInteger("dakika");
    const not = (interaction.options.getString("not") || "Hatırlatma!").slice(0, 200);
    if (dakika < 1 || dakika > 10080) {
      return interaction.reply({ content: "❌ Süre 1 dk – 7 gün arasında olmalı.", ephemeral: true });
    }

    const id = remindSeq++;
    const when = Date.now() + dakika * 60 * 1000;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const timer = setTimeout(async () => {
      remindTimers.delete(id);
      try {
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(channelId);
        if (channel?.isTextBased()) {
          await channel.send({
            content: `⏰ <@${userId}> **Hatırlatma:** ${not}`,
            allowedMentions: { users: [userId] }
          });
        }
      } catch (e) {
        console.error("REMIND ERROR:", e.message);
      }
    }, dakika * 60 * 1000);

    if (typeof timer.unref === "function") timer.unref();
    remindTimers.set(id, timer);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("⏰ Hatırlatıcı")
          .setColor(0xfaa61a)
          .setDescription(`**${not}**\n⏱️ <t:${Math.floor(when / 1000)}:R> seni etiketleyeceğim.`)
          .setFooter({ text: BRAND_FOOTER })
      ],
      ephemeral: true
    });
  }

  // ---------- /arac emojiler ----------
  if (name === "emojiler") {
    const emojis = [...interaction.guild.emojis.cache.values()];
    if (!emojis.length) {
      return interaction.reply({ content: "📭 Bu sunucuda özel emoji yok.", ephemeral: true });
    }
    const staticE = emojis.filter(e => !e.animated).slice(0, 40);
    const animE = emojis.filter(e => e.animated).slice(0, 20);
    const embed = new EmbedBuilder()
      .setTitle(`😀 Emojiler (${emojis.length})`)
      .setColor(0x5865f2)
      .setFooter({ text: BRAND_FOOTER });
    if (staticE.length) {
      embed.addFields({
        name: `Statik (${staticE.length})`,
        value: staticE.map(e => `${e}`).join(" ").slice(0, 1024) || "—"
      });
    }
    if (animE.length) {
      embed.addFields({
        name: `Animasyonlu (${animE.length})`,
        value: animE.map(e => `${e}`).join(" ").slice(0, 1024) || "—"
      });
    }
    return interaction.reply({ embeds: [embed] });
  }

  // ---------- /arac ping ----------
  if (name === "ping") {
    const sent = await interaction.reply({
      content: "🏓 Ölçülüyor...",
      fetchReply: true
    });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    return interaction.editReply({
      content: null,
      embeds: [
        new EmbedBuilder()
          .setTitle("🏓 Ping")
          .setColor(0x57f287)
          .addFields(
            { name: "Bot", value: `**${roundtrip}** ms`, inline: true },
            { name: "WebSocket", value: `**${Math.round(client.ws.ping)}** ms`, inline: true }
          )
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  // ---------- /arac say ----------
  if (name === "say") {
    if (!hasPermission(interaction, PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: "❌ **Mesajları Yönet** yetkisi gerekir.", ephemeral: true });
    }
    const textMsg = interaction.options.getString("mesaj").slice(0, 2000);
    await interaction.reply({ content: `${EMOJI.ok} Gönderildi.`, ephemeral: true });
    await interaction.channel.send({ content: textMsg, allowedMentions: { parse: [] } }).catch(() => {});
    return true;
  }

  return false;
}

const UTILITY_COMMANDS = [
  "afk", "avatar", "kullanici", "sunucu", "snipe", "anket",
  "rastgele", "hesapla", "hatirlat", "emojiler", "ping", "say"
];



commands.push(
  new SlashCommandBuilder()
    .setName("afk")
    .setDescription("AFK moduna geç")
    .setDMPermission(false)
    .addStringOption(o => o.setName("sebep").setDescription("AFK sebebi").setMaxLength(200)),
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Avatarını veya birinin avatarını göster")
    .setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı")),
  new SlashCommandBuilder()
    .setName("kullanici")
    .setDescription("Kullanıcı bilgilerini göster")
    .setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı")),
  new SlashCommandBuilder()
    .setName("sunucu")
    .setDescription("Sunucu bilgilerini göster")
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Bu kanalda son silinen mesajı göster")
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName("anket")
    .setDescription("Anket oluştur (yetkili)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .addStringOption(o => o.setName("soru").setDescription("Anket sorusu").setRequired(true).setMaxLength(250))
    .addStringOption(o => o.setName("secenek1").setDescription("1. seçenek").setRequired(true).setMaxLength(80))
    .addStringOption(o => o.setName("secenek2").setDescription("2. seçenek").setRequired(true).setMaxLength(80))
    .addStringOption(o => o.setName("secenek3").setDescription("3. seçenek").setMaxLength(80))
    .addStringOption(o => o.setName("secenek4").setDescription("4. seçenek").setMaxLength(80))
    .addStringOption(o => o.setName("secenek5").setDescription("5. seçenek").setMaxLength(80)),
  new SlashCommandBuilder()
    .setName("rastgele")
    .setDescription("Rastgele bir üye seç")
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName("hesapla")
    .setDescription("Basit matematik hesabı yap")
    .setDMPermission(false)
    .addStringOption(o => o.setName("islem").setDescription("Örn: (12+8)*3").setRequired(true).setMaxLength(80)),
  new SlashCommandBuilder()
    .setName("hatirlat")
    .setDescription("Belirtilen süre sonra hatırlat")
    .setDMPermission(false)
    .addIntegerOption(o => o.setName("dakika").setDescription("Kaç dakika sonra (1-10080)").setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(o => o.setName("not").setDescription("Hatırlatma notu").setMaxLength(200)),
  new SlashCommandBuilder()
    .setName("emojiler")
    .setDescription("Sunucu emojilerini listele")
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Bot gecikmesini göster")
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Bot adına mesaj gönder (yetkili)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .addStringOption(o => o.setName("mesaj").setDescription("Gönderilecek mesaj").setRequired(true).setMaxLength(2000))
);


client.on("messageDelete", async (message) => {
  try {
    await handleSnipeStore(message);
  } catch (error) {
    console.error("SNIPE STORE ERROR:", error);
  }
});


// ======================================================
// MÜZİK SİSTEMİ (@discordjs/voice + play-dl)
// Bağımlılıklar: npm i @discordjs/voice play-dl opusscript
// Sunucuda FFmpeg kurulu olmalı (apt install ffmpeg)
// ======================================================

let voiceLib = null;
let playdl = null;
let musicDepsOk = false;

try {
  voiceLib = require("@discordjs/voice");
  playdl = require("play-dl");
  musicDepsOk = true;
  console.log("✅ Müzik bağımlılıkları yüklendi.");
} catch (e) {
  console.warn(
    "⚠️ Müzik sistemi kapalı. Kurulum: npm i @discordjs/voice play-dl opusscript  |  FFmpeg gerekli."
  );
}

/** @type {Map<string, GuildMusic>} */
const musicQueues = new Map();

class GuildMusic {
  constructor(guildId) {
    this.guildId = guildId;
    this.queue = [];
    this.playing = null;
    this.textChannelId = null;
    this.volume = 80;
    this.loop = "off"; // off | track | queue
    this.player = null;
    this.connection = null;
    this.paused = false;
    this.skipVotes = new Set();
  }

  ensurePlayer() {
    if (this.player) return this.player;
    const { createAudioPlayer, AudioPlayerStatus, NoSubscriberBehavior } = voiceLib;
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });

    this.player.on(AudioPlayerStatus.Idle, () => {
      this._onTrackEnd().catch(err => console.error("MUSIC IDLE ERROR:", err));
    });
    this.player.on("error", err => {
      console.error("MUSIC PLAYER ERROR:", err.message);
      this._onTrackEnd().catch(() => {});
    });
    return this.player;
  }

  async connect(voiceChannel) {
    const {
      joinVoiceChannel,
      entersState,
      VoiceConnectionStatus
    } = voiceLib;

    if (this.connection) {
      try {
        this.connection.destroy();
      } catch {}
      this.connection = null;
    }

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    this.connection.on("error", err => console.error("VOICE CONN ERROR:", err.message));

    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    this.connection.subscribe(this.ensurePlayer());
    return this.connection;
  }

  async _onTrackEnd() {
    if (this.loop === "track" && this.playing) {
      this.queue.unshift(this.playing);
    } else if (this.loop === "queue" && this.playing) {
      this.queue.push(this.playing);
    }
    this.playing = null;
    this.skipVotes.clear();
    await this.playNext();
  }

  async playNext() {
    if (!this.queue.length) {
      this.playing = null;
      // 60 sn boşsa çık
      setTimeout(() => {
        if (!this.playing && !this.queue.length && this.connection) {
          try { this.connection.destroy(); } catch {}
          this.connection = null;
          musicQueues.delete(this.guildId);
        }
      }, 60_000).unref?.();
      return;
    }

    const track = this.queue.shift();
    this.playing = track;
    this.paused = false;
    this.skipVotes.clear();

    try {
      const { createAudioResource, StreamType } = voiceLib;
      let streamInfo;
      if (track.source === "yt" || track.url.includes("youtu")) {
        streamInfo = await playdl.stream(track.url, { quality: 2 });
      } else {
        streamInfo = await playdl.stream(track.url);
      }

      const resource = createAudioResource(streamInfo.stream, {
        inputType: streamInfo.type,
        inlineVolume: true
      });
      resource.volume?.setVolume(this.volume / 100);
      this._resource = resource;
      this.ensurePlayer().play(resource);

      const ch = track.guild?.channels?.cache?.get(this.textChannelId);
      if (ch?.isTextBased?.()) {
        await ch.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎵 Çalıyor")
              .setColor(0x1db954)
              .setDescription(`**[${track.title}](${track.url})**`)
              .addFields(
                { name: "Süre", value: track.duration || "—", inline: true },
                { name: "İsteyen", value: track.requestedBy ? `<@${track.requestedBy}>` : "—", inline: true },
                { name: "Kuyruk", value: String(this.queue.length), inline: true }
              )
              .setThumbnail(track.thumbnail || null)
              .setFooter({ text: BRAND_FOOTER })
          ]
        }).catch(() => {});
      }
    } catch (error) {
      console.error("MUSIC PLAY ERROR:", error.message);
      const ch = track.guild?.channels?.cache?.get(this.textChannelId);
      if (ch?.isTextBased?.()) {
        await ch.send(`❌ **${track.title}** çalınamadı, sıradakine geçiliyor.`).catch(() => {});
      }
      this.playing = null;
      await this.playNext();
    }
  }

  setVolume(v) {
    this.volume = Math.max(1, Math.min(150, v));
    if (this._resource?.volume) this._resource.volume.setVolume(this.volume / 100);
  }

  destroy() {
    try { this.player?.stop(true); } catch {}
    try { this.connection?.destroy(); } catch {}
    this.queue = [];
    this.playing = null;
    this.connection = null;
    this.player = null;
    musicQueues.delete(this.guildId);
  }
}

function getMusic(guildId) {
  let q = musicQueues.get(guildId);
  if (!q) {
    q = new GuildMusic(guildId);
    musicQueues.set(guildId, q);
  }
  return q;
}

function formatDurationSec(sec) {
  if (!sec || !Number.isFinite(sec)) return "—";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

async function resolveTracks(query, requestedBy, guild) {
  const tracks = [];

  // URL?
  if (playdl.yt_validate(query) === "video" || /youtu(\.be|be\.com)/i.test(query)) {
    const info = await playdl.video_info(query);
    const v = info.video_details;
    tracks.push({
      title: v.title || "YouTube",
      url: v.url,
      duration: formatDurationSec(Number(v.durationInSec)),
      thumbnail: v.thumbnails?.[0]?.url || null,
      source: "yt",
      requestedBy,
      guild
    });
    return tracks;
  }

  if (playdl.yt_validate(query) === "playlist") {
    const pl = await playdl.playlist_info(query, { incomplete: true });
    const videos = await pl.all_videos();
    for (const v of videos.slice(0, 50)) {
      tracks.push({
        title: v.title || "YouTube",
        url: v.url,
        duration: formatDurationSec(Number(v.durationInSec)),
        thumbnail: v.thumbnails?.[0]?.url || null,
        source: "yt",
        requestedBy,
        guild
      });
    }
    return tracks;
  }

  // Arama
  const results = await playdl.search(query, { limit: 1, source: { youtube: "video" } });
  if (!results?.length) return [];
  const v = results[0];
  tracks.push({
    title: v.title || query,
    url: v.url,
    duration: formatDurationSec(Number(v.durationInSec)),
    thumbnail: v.thumbnails?.[0]?.url || null,
    source: "yt",
    requestedBy,
    guild
  });
  return tracks;
}

function musicPanelRow(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("eb_m_pause").setEmoji("⏸️").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
      new ButtonBuilder().setCustomId("eb_m_resume").setEmoji("▶️").setStyle(ButtonStyle.Success).setDisabled(disabled),
      new ButtonBuilder().setCustomId("eb_m_skip").setEmoji("⏭️").setStyle(ButtonStyle.Primary).setDisabled(disabled),
      new ButtonBuilder().setCustomId("eb_m_stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger).setDisabled(disabled),
      new ButtonBuilder().setCustomId("eb_m_loop").setEmoji("🔁").setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    )
  ];
}

async function handleMusicCommand(interaction) {
  if (!musicDepsOk) {
    return interaction.reply({
      content:
        "❌ Müzik sistemi için paketler eksik.\n" +
        "```bash\nnpm i @discordjs/voice play-dl opusscript\n```\n" +
        "Ayrıca sunucuda **FFmpeg** kurulu olmalı.",
      ephemeral: true
    });
  }

  if (!interaction.guild) {
    return interaction.reply({ content: "❌ Sadece sunucuda kullanılabilir.", ephemeral: true });
  }

  // /muzik <altkomut>  — eski tekil isimler de desteklenir
  const sub = interaction.options?.getSubcommand?.(false) || null;
  const name = sub || interaction.commandName;
  const member = interaction.member;
  const voiceChannel = member?.voice?.channel;

  // ---------- /muzik cal  veya eski /çal ----------
  if (name === "cal" || name === "çal") {
    if (!voiceChannel) {
      return interaction.reply({ content: "❌ Önce bir ses kanalına gir.", ephemeral: true });
    }
    const me = interaction.guild.members.me;
    const perms = voiceChannel.permissionsFor(me);
    if (!perms?.has(PermissionsBitField.Flags.Connect) || !perms?.has(PermissionsBitField.Flags.Speak)) {
      return interaction.reply({ content: "❌ Bu ses kanalında **Bağlan** / **Konuş** yetkim yok.", ephemeral: true });
    }

    const query = interaction.options.getString("sarki")?.trim();
    if (!query) {
      return interaction.reply({ content: "❌ Şarkı adı veya URL gir.", ephemeral: true });
    }

    await interaction.deferReply();

    let tracks;
    try {
      tracks = await resolveTracks(query, interaction.user.id, interaction.guild);
    } catch (e) {
      console.error("RESOLVE ERROR:", e.message);
      return interaction.editReply({ content: `❌ Arama/yükleme hatası: \`${e.message.slice(0, 100)}\`` });
    }

    if (!tracks.length) {
      return interaction.editReply({ content: "❌ Sonuç bulunamadı." });
    }

    const mq = getMusic(interaction.guildId);
    mq.textChannelId = interaction.channelId;

    try {
      if (!mq.connection) await mq.connect(voiceChannel);
      else if (mq.connection.joinConfig.channelId !== voiceChannel.id) {
        await mq.connect(voiceChannel);
      }
    } catch (e) {
      console.error("CONNECT ERROR:", e.message);
      return interaction.editReply({ content: `❌ Ses kanalına bağlanılamadı: \`${e.message.slice(0, 80)}\`` });
    }

    const wasEmpty = !mq.playing && !mq.queue.length;
    mq.queue.push(...tracks);

    if (wasEmpty) {
      await mq.playNext();
      const t = mq.playing || tracks[0];
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🎶 Müzik Başladı")
            .setColor(0x1db954)
            .setDescription(`**[${t.title}](${t.url})**`)
            .addFields(
              { name: "Süre", value: t.duration || "—", inline: true },
              { name: "Eklenen", value: String(tracks.length), inline: true },
              { name: "Ses", value: `%${mq.volume}`, inline: true }
            )
            .setThumbnail(t.thumbnail || null)
            .setFooter({ text: BRAND_FOOTER })
        ],
        components: musicPanelRow()
      });
    }

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("➕ Kuyruğa Eklendi")
          .setColor(0x5865f2)
          .setDescription(
            tracks.length === 1
              ? `**[${tracks[0].title}](${tracks[0].url})**`
              : `**${tracks.length}** parça kuyruğa eklendi.\nİlk: **${tracks[0].title}**`
          )
          .addFields({ name: "Kuyruk uzunluğu", value: String(mq.queue.length + (mq.playing ? 1 : 0)), inline: true })
          .setThumbnail(tracks[0].thumbnail || null)
          .setFooter({ text: BRAND_FOOTER })
      ]
    });
  }

  const mq = musicQueues.get(interaction.guildId);

  // ---------- /şimdi ----------
  if (name === "simdi" || name === "şimdi") {
    if (!mq?.playing) {
      return interaction.reply({ content: "📭 Şu an çalan şarkı yok.", ephemeral: true });
    }
    const t = mq.playing;
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(mq.paused ? "⏸️ Duraklatıldı" : "🎵 Şimdi Çalıyor")
          .setColor(0x1db954)
          .setDescription(`**[${t.title}](${t.url})**`)
          .addFields(
            { name: "Süre", value: t.duration || "—", inline: true },
            { name: "İsteyen", value: t.requestedBy ? `<@${t.requestedBy}>` : "—", inline: true },
            { name: "Ses", value: `%${mq.volume}`, inline: true },
            { name: "Döngü", value: mq.loop === "off" ? "Kapalı" : mq.loop === "track" ? "Parça" : "Kuyruk", inline: true },
            { name: "Kuyruk", value: String(mq.queue.length), inline: true }
          )
          .setThumbnail(t.thumbnail || null)
          .setFooter({ text: BRAND_FOOTER })
      ],
      components: musicPanelRow()
    });
  }

  // ---------- /kuyruk ----------
  if (name === "kuyruk") {
    if (!mq || (!mq.playing && !mq.queue.length)) {
      return interaction.reply({ content: "📭 Kuyruk boş.", ephemeral: true });
    }
    const lines = [];
    if (mq.playing) {
      lines.push(`**Çalıyor:** [${mq.playing.title}](${mq.playing.url}) \`${mq.playing.duration || "?"}\``);
    }
    mq.queue.slice(0, 15).forEach((t, i) => {
      lines.push(`**${i + 1}.** [${t.title}](${t.url}) \`${t.duration || "?"}\``);
    });
    if (mq.queue.length > 15) lines.push(`\n... ve **${mq.queue.length - 15}** parça daha`);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📜 Kuyruk")
          .setColor(0x5865f2)
          .setDescription(lines.join("\n").slice(0, 4000))
          .setFooter({ text: `Toplam: ${(mq.playing ? 1 : 0) + mq.queue.length} • Döngü: ${mq.loop} • ${BRAND_FOOTER}` })
      ]
    });
  }

  // Ses kanalı kontrolü (yönetim komutları)
  if (["durdur", "devam", "geç", "gec", "çık", "cik", "muzik-ses", "ses", "karıştır", "karistir", "tekrar", "kuyruk-temizle", "temizle"].includes(name)) {
    if (!mq?.connection) {
      return interaction.reply({ content: "❌ Bot bir ses kanalında değil.", ephemeral: true });
    }
    if (!voiceChannel || voiceChannel.id !== mq.connection.joinConfig.channelId) {
      if (!isAdmin(interaction)) {
        return interaction.reply({ content: "❌ Bot ile aynı ses kanalında olmalısın.", ephemeral: true });
      }
    }
  }

  if (name === "durdur") {
    if (!mq?.playing) return interaction.reply({ content: "❌ Çalan şarkı yok.", ephemeral: true });
    mq.player.pause();
    mq.paused = true;
    return interaction.reply({ content: "⏸️ Duraklatıldı." });
  }

  if (name === "devam") {
    if (!mq?.playing) return interaction.reply({ content: "❌ Çalan şarkı yok.", ephemeral: true });
    mq.player.unpause();
    mq.paused = false;
    return interaction.reply({ content: "▶️ Devam ediyor." });
  }

  if (name === "geç" || name === "gec") {
    if (!mq?.playing) return interaction.reply({ content: "❌ Çalan şarkı yok.", ephemeral: true });
    mq.player.stop(true);
    return interaction.reply({ content: "⏭️ Sonraki parçaya geçildi." });
  }

  if (name === "çık" || name === "cik") {
    mq?.destroy();
    return interaction.reply({ content: "👋 Ses kanalından ayrıldım, kuyruk temizlendi." });
  }

  if (name === "muzik-ses" || name === "ses") {
    const vol = interaction.options.getInteger("seviye");
    if (!mq) return interaction.reply({ content: "❌ Aktif müzik yok.", ephemeral: true });
    mq.setVolume(vol);
    return interaction.reply({ content: `🔊 Ses seviyesi **%${mq.volume}**` });
  }

  if (name === "karıştır" || name === "karistir") {
    if (!mq || mq.queue.length < 2) {
      return interaction.reply({ content: "❌ Karıştırmak için kuyrukta en az 2 şarkı olmalı.", ephemeral: true });
    }
    for (let i = mq.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mq.queue[i], mq.queue[j]] = [mq.queue[j], mq.queue[i]];
    }
    return interaction.reply({ content: "🔀 Kuyruk karıştırıldı." });
  }

  if (name === "tekrar") {
    if (!mq) return interaction.reply({ content: "❌ Aktif müzik yok.", ephemeral: true });
    const mode = interaction.options.getString("mod") || "off";
    mq.loop = mode;
    const labels = { off: "Kapalı", track: "Parça tekrarı", queue: "Kuyruk tekrarı" };
    return interaction.reply({ content: `🔁 Döngü: **${labels[mode] || mode}**` });
  }

  if (name === "kuyruk-temizle" || name === "temizle") {
    if (!mq) return interaction.reply({ content: "❌ Kuyruk zaten boş.", ephemeral: true });
    mq.queue = [];
    return interaction.reply({ content: "🧹 Kuyruk temizlendi (çalan şarkı duruyor)." });
  }

  return false;
}

async function handleMusicButton(interaction) {
  if (!musicDepsOk) {
    return interaction.reply({ content: "❌ Müzik paketleri yüklü değil.", ephemeral: true });
  }
  const mq = musicQueues.get(interaction.guildId);
  if (!mq?.playing && interaction.customId !== "eb_m_stop") {
    return interaction.reply({ content: "❌ Çalan şarkı yok.", ephemeral: true });
  }

  const member = interaction.member;
  const voiceChannel = member?.voice?.channel;
  if (!isAdmin(interaction) && (!voiceChannel || voiceChannel.id !== mq?.connection?.joinConfig?.channelId)) {
    return interaction.reply({ content: "❌ Bot ile aynı ses kanalında olmalısın.", ephemeral: true });
  }

  const id = interaction.customId;
  if (id === "eb_m_pause") {
    mq.player.pause();
    mq.paused = true;
    return interaction.reply({ content: "⏸️ Duraklatıldı.", ephemeral: true });
  }
  if (id === "eb_m_resume") {
    mq.player.unpause();
    mq.paused = false;
    return interaction.reply({ content: "▶️ Devam.", ephemeral: true });
  }
  if (id === "eb_m_skip") {
    mq.player.stop(true);
    return interaction.reply({ content: "⏭️ Geçildi.", ephemeral: true });
  }
  if (id === "eb_m_stop") {
    mq.destroy();
    return interaction.reply({ content: "⏹️ Durduruldu, kanaldan çıkıldı.", ephemeral: true });
  }
  if (id === "eb_m_loop") {
    mq.loop = mq.loop === "off" ? "track" : mq.loop === "track" ? "queue" : "off";
    const labels = { off: "Kapalı", track: "Parça", queue: "Kuyruk" };
    return interaction.reply({ content: `🔁 Döngü: **${labels[mq.loop]}**`, ephemeral: true });
  }
  return false;
}

const MUSIC_COMMANDS = ["muzik"];

// ======================================================
// ÖNERİ SİSTEMİ + BOT DURUMU
// ======================================================

async function handleOneriCommand(interaction) {
  const config = getServerConfig(interaction.guildId);
  config.suggestions ??= { channelId: null, count: 0 };

  if (interaction.commandName === "öneri-kanal" || interaction.commandName === "oneri-kanal") {
    if (!hasPermission(interaction, PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: "❌ **Sunucuyu Yönet** yetkisi gerekir.", ephemeral: true });
    }
    const ch = interaction.options.getChannel("kanal");
    config.suggestions.channelId = ch.id;
    saveServerConfig(interaction.guildId, config);
    return interaction.reply({ content: `✅ Öneri kanalı ${ch} olarak ayarlandı.`, ephemeral: true });
  }

  if (interaction.commandName === "öneri" || interaction.commandName === "oneri") {
    const text = interaction.options.getString("metin")?.trim();
    if (!text || text.length < 5) {
      return interaction.reply({ content: "❌ Öneri en az 5 karakter olmalı.", ephemeral: true });
    }
    const channelId = config.suggestions.channelId;
    if (!channelId) {
      return interaction.reply({
        content: "❌ Öneri kanalı ayarlı değil. Yetkili `/öneri-kanal` ile ayarlasın.",
        ephemeral: true
      });
    }
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) {
      return interaction.reply({ content: "❌ Öneri kanalı bulunamadı.", ephemeral: true });
    }

    config.suggestions.count = (config.suggestions.count || 0) + 1;
    const num = config.suggestions.count;
    saveServerConfig(interaction.guildId, config);

    const msg = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`💡 Öneri #${num}`)
          .setColor(0xfee75c)
          .setDescription(text.slice(0, 2000))
          .addFields({ name: "Gönderen", value: `${interaction.user} (\`${interaction.user.tag}\`)` })
          .setFooter({ text: BRAND_FOOTER })
          .setTimestamp()
      ]
    });
    await msg.react("✅").catch(() => {});
    await msg.react("❌").catch(() => {});

    return interaction.reply({ content: `${EMOJI.ok} Önerin gönderildi: ${msg.url}`, ephemeral: true });
  }

  return false;
}

function startPresenceRotation() {
  const states = [
    () => ({ name: `${client.guilds.cache.size} sunucu • /yardım`, type: 3 }), // Watching
    () => ({ name: "Endless Builder", type: 0 }), // Playing
    () => {
      let members = 0;
      for (const g of client.guilds.cache.values()) members += g.memberCount || 0;
      return { name: `${members.toLocaleString("tr-TR")} üye`, type: 3 };
    },
    () => ({ name: "müzik • /çal", type: 2 }), // Listening
    () => ({ name: "/setup ile sunucu kur", type: 0 })
  ];
  let i = 0;
  const tick = () => {
    if (!client.user) return;
    try {
      const s = states[i % states.length]();
      client.user.setPresence({
        activities: [{ name: s.name, type: s.type }],
        status: "online"
      });
      i++;
    } catch {}
  };
  tick();
  setInterval(tick, 2 * 60 * 1000).unref?.();
}



commands.push(
  new SlashCommandBuilder()
    .setName("muzik")
    .setDescription("Müzik sistemi")
    .setDMPermission(false)
    .addSubcommand(s =>
      s.setName("cal")
        .setDescription("Şarkı çal / kuyruğa ekle")
        .addStringOption(o => o.setName("sarki").setDescription("Şarkı adı veya YouTube linki").setRequired(true).setMaxLength(200))
    )
    .addSubcommand(s => s.setName("durdur").setDescription("Müziği duraklat"))
    .addSubcommand(s => s.setName("devam").setDescription("Müziği devam ettir"))
    .addSubcommand(s => s.setName("gec").setDescription("Sıradaki şarkıya geç"))
    .addSubcommand(s => s.setName("kuyruk").setDescription("Müzik kuyruğunu göster"))
    .addSubcommand(s => s.setName("simdi").setDescription("Şu an çalan şarkı"))
    .addSubcommand(s => s.setName("cik").setDescription("Ses kanalından ayrıl"))
    .addSubcommand(s =>
      s.setName("ses")
        .setDescription("Ses seviyesi (1-150)")
        .addIntegerOption(o => o.setName("seviye").setDescription("1-150").setRequired(true).setMinValue(1).setMaxValue(150))
    )
    .addSubcommand(s => s.setName("karistir").setDescription("Kuyruğu karıştır"))
    .addSubcommand(s =>
      s.setName("tekrar")
        .setDescription("Döngü modu")
        .addStringOption(o =>
          o.setName("mod").setDescription("Mod").setRequired(true)
            .addChoices(
              { name: "Kapalı", value: "off" },
              { name: "Parça", value: "track" },
              { name: "Kuyruk", value: "queue" }
            )
        )
    )
    .addSubcommand(s => s.setName("temizle").setDescription("Kuyruğu temizle")),
  new SlashCommandBuilder()
    .setName("oneri")
    .setDescription("Sunucuya öneri gönder")
    .setDMPermission(false)
    .addStringOption(o => o.setName("metin").setDescription("Önerin").setRequired(true).setMaxLength(1000)),
  new SlashCommandBuilder()
    .setName("oneri-kanal")
    .setDescription("Öneri kanalını ayarla (yetkili)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addChannelOption(o => o.setName("kanal").setDescription("Öneri kanalı").addChannelTypes(ChannelType.GuildText).setRequired(true))
);




// ======================================================
// KOMUT GRUPLAMA KATMANI (100 komut limiti çözümü)
// Eski tekil komutlar → tek komut altında alt komutlar.
// Eski handler'lar aynen çalışır: gelen etkileşim çalışma anında
// eski komut adına çevrilir (commandName + subcommand yeniden yazılır).
// ======================================================

// sub adı → eski komut adı
const COMMAND_GROUPS = [
  { name: "mod", description: "Moderasyon komutları", subs: {
    ban: "ban", unban: "unban", kick: "kick", timeout: "timeout", mute: "mute", unmute: "unmute",
    warn: "warn", uyarilar: "warnings", "warn-sil": "warn-sil", temizle: "clear" } },
  { name: "kayit", description: "Kayıt sistemi", subs: {
    et: "kayit", panel: "kayit-panel", kayitsizlar: "kayitsizlar", cinsiyet: "cinsiyet-degistir" } },
  { name: "ticket", description: "Ticket (destek) sistemi", subs: {
    panel: "ticket-panel", devral: "ticket-devral", kapat: "ticket-kapat" } },
  { name: "streamer", description: "Streamer sistemi", subs: {
    panel: "streamer-panel", "basvuru-panel": "streamer-basvuru-panel", "basvuru-ayarla": "streamer-basvuru-ayarla",
    "yas-panel": "yas-panel", profil: "streamer-profil", liste: "streamer-liste",
    duyur: "yayin-duyur", "duyuru-ayarla": "yayin-ayarla", "bildirim-panel": "yayin-bildirim-panel" } },
  { name: "kurulum", description: "Sunucu kurulum komutları", subs: {
    degistir: "setup-degistir", durum: "setup-durum", tamamla: "kurulum-tamamla", temizle: "sunucu-temizle",
    streamer: "streamer-kur", "streamer-18": "streamer-kur-18", public: "public-kur", "public-18": "public-kur-18",
    sil: "kurulum-sil", "kur-durum": "kurulum-durum" } },
  { name: "yonetim", description: "Sunucu yönetim ayarları", subs: {
    hosgeldin: "hosgeldin-ayarla", log: "log-kanal", "rol-panel": "rol-panel",
    "istatistik-kur": "istatistik-kur", "istatistik-kapat": "istatistik-kapat",
    "oneri-kanal": "oneri-kanal", "itiraf-kanal": "itiraf-ayarla", "boost-kanal": "boost-kanal", "ai-kanal": "ai-kanal", "komut-yenile": "komut-yenile", "rol-ayarla": "rol-ayarla", "rol-liste": "rol-liste" } },
  { name: "level", description: "Level ve XP sistemi", subs: {
    rank: "rank", siralama: "leaderboard", ayarla: "level-sistem" } },
  { name: "cekilis", description: "Çekiliş sistemi", subs: {
    baslat: "cekilis", bitir: "cekilis-bitir" } },
  { name: "magaza", description: "Mağaza sistemi", subs: {
    liste: "mağaza", ekle: "mağaza-ekle", sil: "mağaza-sil", "satin-al": "satın-al" } }
];

// Zaten alt komutlu olarak tanımlı grupların eski tekil kopyaları (payload'dan atılır)
const LEGACY_DUPLICATES = [
  "bakiye", "günlük", "haftalık", "öde", "çalış", "slots", "leaderboard-para", "para-ver",
  "sarıl", "öp", "tokat", "okşa", "yumruk", "dans", "ship", "8ball", "zar", "yazıtura", "rate", "howgay", "aşkölçer",
  "afk", "avatar", "kullanici", "sunucu", "snipe", "anket", "rastgele", "hesapla", "hatirlat", "emojiler", "ping", "say"
];

// "grup/sub" → { old, nested, perms }
const GROUP_ROUTES = new Map();

function groupPayloadInto(byName) {
  const cleanOpt = (o) => o;
  for (const g of COMMAND_GROUPS) {
    const options = [];
    for (const [subName, oldName] of Object.entries(g.subs)) {
      const old = byName.get(oldName);
      if (!old) { console.warn("⚠️ Gruplanacak komut bulunamadı:", oldName); continue; }
      const oldOpts = (old.options || []).map(cleanOpt);
      const hasSubs = oldOpts.some(o => o.type === 1 || o.type === 2);
      const desc = String(old.description || subName).slice(0, 100);
      if (hasSubs) {
        // alt komutlu eski komut → alt komut GRUBU (type 2)
        options.push({ type: 2, name: subName, description: desc, options: oldOpts });
      } else {
        options.push({ type: 1, name: subName, description: desc, options: oldOpts });
      }
      GROUP_ROUTES.set(g.name + "/" + subName, {
        old: oldName,
        nested: hasSubs,
        perms: old.default_member_permissions || null
      });
      if (oldName !== g.name) byName.delete(oldName);
    }
    byName.set(g.name, {
      name: g.name,
      description: g.description,
      dm_permission: false,
      options: options.slice(0, 25)
    });
  }
  for (const n of LEGACY_DUPLICATES) byName.delete(n);
}

/** Gelen gruplu etkileşimi eski komut adına çevirir. false dönerse etkileşim işlendi (engellendi). */
function routeGroupedInteraction(interaction) {
  try {
    const parent = interaction.commandName;
    if (!COMMAND_GROUPS.some(g => g.name === parent)) return true;
    const opts = interaction.options;
    const grp = opts?._group || null;
    const sub = opts?._subcommand || null;
    if (!sub && !grp) return true; // eski istemci önbelleği: olduğu gibi geç
    const route = GROUP_ROUTES.get(parent + "/" + (grp || sub));
    if (!route) return true;

    // Yetki kontrolü (tek komut altında farklı yetkiler olduğu için çalışma anında)
    if (route.perms && interaction.isChatInputCommand?.()) {
      let ok = true;
      try { ok = Boolean(interaction.memberPermissions?.has(BigInt(route.perms))); } catch { ok = false; }
      if (!ok) {
        interaction.reply({ content: "❌ Bu komut için yetkin yok.", ephemeral: true }).catch(() => {});
        return false;
      }
    }

    const innerSub = route.nested ? sub : null;
    interaction.commandName = route.old;
    opts._group = null;
    opts._subcommand = innerSub;
    return true;
  } catch (e) {
    console.error("GROUP ROUTE ERROR:", e.message);
    return true;
  }
}

{
  const _origEmit = client.emit.bind(client);
  client.emit = function (event, ...args) {
    if (event === "interactionCreate") {
      const i = args[0];
      if (i && (i.isChatInputCommand?.() || i.isAutocomplete?.())) {
        if (routeGroupedInteraction(i) === false) return true;
        if (i.isChatInputCommand?.() && i.guildId) {
          if (i.commandName === "komut-yenile") { handleCommandRefresh(i); return true; }
          if (i.commandName === "rol-ayarla") { handleRoleSettings(i); return true; }
          if (i.commandName === "rol-liste") { handleRoleList(i); return true; }
        }
      }
    }
    return _origEmit(event, ...args);
  };
}

// ======================================================
// KOMUT KAYIT SİSTEMİ (gruplu + güvenli)
// ======================================================

/** Discord'a gidecek nihai komut listesini üretir */
function buildSlashPayload() {
  const byName = new Map();

  const add = (item) => {
    if (!item) return;
    let data;
    try {
      data = typeof item.toJSON === "function" ? item.toJSON() : item;
    } catch (e) {
      console.warn("⚠️ Komut serialize hatası:", e.message);
      return;
    }
    if (!data?.name) return;
    data.name = String(data.name).toLowerCase().trim();
    if (!data.name || data.name.length > 32) return;
    byName.set(data.name, data);
  };

  // 1) Dosyadaki tüm commands[]
  for (const c of commands) add(c);

  // 2) Gruplu ekstra komutlar (aynı isim varsa ezer — güncel tanım)
  for (const c of GROUPED_COMMANDS) add(c);

  // Tekil komutları gruplu komutlara çevir (100 limit çözümü)
  groupPayloadInto(byName);

  // Öncelik sırası — kesilirse bile bunlar kalsın
  const priority = [
    "setup", "kurulum", "yonetim", "yardim", "yardım", "ayarlar",
    "mod", "kayit", "ticket", "streamer", "level", "cekilis", "magaza",
    "ekonomi", "eglence", "arac", "muzik", "ozel-oda-kur",
    "automod", "antiraid", "starboard", "davet", "sayma", "kanal", "itiraf", "ima", "ai", "oneri", "premium"
  ];

  const rest = [...byName.values()].filter(c => !priority.includes(c.name));
  const pri = priority.map(n => byName.get(n)).filter(Boolean);
  let out = [...pri, ...rest];

  const seen = new Set();
  out = out.filter(c => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  if (out.length > 100) {
    console.warn(`⚠️ ${out.length} komut → 100 limite kesildi (öncelikliler korundu)`);
    out = out.slice(0, 100);
  }
  return out;
}

/** Kayıttan önce Discord kurallarını kontrol eder (hata olursa hangi komut olduğunu söyler) */
function validatePayload(payload) {
  const problems = [];
  const nameRe = /^[-_'\p{L}\p{N}]{1,32}$/u;
  const walk = (opts, path) => {
    const names = new Set();
    let seenOptional = false;
    for (const o of opts || []) {
      if (!nameRe.test(o.name) || o.name !== o.name.toLowerCase()) problems.push(`${path}/${o.name}: geçersiz isim`);
      if (names.has(o.name)) problems.push(`${path}/${o.name}: aynı isim tekrar`);
      names.add(o.name);
      if (!o.description || o.description.length > 100) problems.push(`${path}/${o.name}: açıklama boş veya 100+ karakter`);
      if (o.type > 2) {
        if (!o.required) seenOptional = true;
        else if (seenOptional) problems.push(`${path}/${o.name}: zorunlu seçenek isteğe bağlıdan sonra geliyor`);
      } else walk(o.options, `${path}/${o.name}`);
    }
    if ((opts || []).length > 25) problems.push(`${path}: 25'ten fazla seçenek`);
  };
  for (const c of payload) walk(c.options, c.name);
  return problems;
}

async function registerCommandsEverywhere() {
  const payload = buildSlashPayload();
  console.log(`📋 Kayıt paketi: ${payload.length} komut`);
  console.log("📋 " + payload.map(c => c.name).sort().join(", "));

  const problems = validatePayload(payload);
  if (problems.length) {
    console.error("❌ Komut tanımlarında hata var, Discord reddedebilir:");
    for (const p of problems) console.error("   • " + p);
  }

  const guildId = process.env.GUILD_ID;
  const guilds = [...client.guilds.cache.values()];
  if (guildId) {
    try {
      const g = await client.guilds.fetch(guildId);
      if (!guilds.find(x => x.id === g.id)) guilds.unshift(g);
    } catch (e) {
      console.warn("GUILD_ID alınamadı:", e.message);
    }
  }

  // Sadece SUNUCU bazlı kayıt (anında görünür). Global kayıt yapılmaz → komutlar çift görünmez.
  let okCount = 0;
  for (const guild of guilds) {
    try {
      await client.application.commands.set(payload, guild.id);
      okCount++;
      console.log(`✅ ${payload.length} komut yüklendi → ${guild.name} (${guild.id})`);
    } catch (e) {
      console.error(`❌ Kayıt hatası [${guild.name}]:`, e.message);
      if (e.code === 50001) console.error("   ↳ Missing Access: botu 'applications.commands' yetkisiyle yeniden davet et.");
      if (e.rawError) console.error(JSON.stringify(e.rawError).slice(0, 3000));
    }
  }

  // Hiçbir sunucuya yazılamadıysa (ör. davette applications.commands yetkisi yok) global'e yaz
  if (okCount === 0) {
    console.warn("⚠️ Sunucu kaydı başarısız → GLOBAL kayıt deneniyor (görünmesi 1 saate kadar sürebilir).");
    console.warn("⚠️ Asıl çözüm: botu şu linkle yeniden davet et → scope: bot + applications.commands");
    try {
      await client.application.commands.set(payload);
      console.log(`✅ Global kayıt: ${payload.length} komut`);
    } catch (e) {
      console.error("❌ Global kayıt hatası:", e.message);
      if (e.rawError) console.error(JSON.stringify(e.rawError).slice(0, 3000));
    }
  }

  // Eski global komutları temizle (çift görünme / eski komutların kalması buradan geliyordu)
  if (okCount > 0) {
    try {
      const old = await client.application.commands.fetch();
      if (old.size) {
        await client.application.commands.set([]);
        console.log(`🧹 ${old.size} eski global komut silindi (sunucu komutları kalıyor)`);
      }
    } catch (e) {
      console.warn("Global temizleme hatası:", e.message);
    }
  }

  if (!guilds.length) {
    console.warn("⚠️ Bot hiç sunucuda değil. Davet edip yeniden başlat.");
  }
}

client.on("guildCreate", async guild => {
  try {
    const payload = buildSlashPayload();
    await client.application.commands.set(payload, guild.id);
    console.log(`✅ Yeni sunucu komutları: ${guild.name}`);
  } catch (e) {
    console.error("guildCreate kayıt hatası:", e.message);
  }
});

// ---- GRUPLU KOMUT TANIMLARI (garanti kayıt) ----
const GROUPED_COMMANDS = [
  // Müzik
  new SlashCommandBuilder()
    .setName("muzik")
    .setDescription("Müzik sistemi")
    .setDMPermission(false)
    .addSubcommand(s => s.setName("cal").setDescription("Şarkı çal / kuyruğa ekle")
      .addStringOption(o => o.setName("sarki").setDescription("Şarkı adı veya YouTube linki").setRequired(true).setMaxLength(200)))
    .addSubcommand(s => s.setName("durdur").setDescription("Duraklat"))
    .addSubcommand(s => s.setName("devam").setDescription("Devam et"))
    .addSubcommand(s => s.setName("gec").setDescription("Sonraki şarkı"))
    .addSubcommand(s => s.setName("kuyruk").setDescription("Kuyruğu göster"))
    .addSubcommand(s => s.setName("simdi").setDescription("Çalan şarkı"))
    .addSubcommand(s => s.setName("cik").setDescription("Kanaldan ayrıl"))
    .addSubcommand(s => s.setName("ses").setDescription("Ses seviyesi")
      .addIntegerOption(o => o.setName("seviye").setDescription("1-150").setRequired(true).setMinValue(1).setMaxValue(150)))
    .addSubcommand(s => s.setName("karistir").setDescription("Kuyruğu karıştır"))
    .addSubcommand(s => s.setName("tekrar").setDescription("Döngü")
      .addStringOption(o => o.setName("mod").setDescription("Mod").setRequired(true)
        .addChoices({ name: "Kapalı", value: "off" }, { name: "Parça", value: "track" }, { name: "Kuyruk", value: "queue" })))
    .addSubcommand(s => s.setName("temizle").setDescription("Kuyruğu temizle")),

  // Özel oda
  new SlashCommandBuilder()
    .setName("ozel-oda-kur")
    .setDescription("Özel oda sistemini kur")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addChannelOption(o => o.setName("metin").setDescription("Yönetim paneli metin kanalı").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption(o => o.setName("ses").setDescription("Giriş ses kanalı").addChannelTypes(ChannelType.GuildVoice).setRequired(true))
    .addChannelOption(o => o.setName("kategori").setDescription("Odaların kategorisi (opsiyonel)").addChannelTypes(ChannelType.GuildCategory).setRequired(false)),

  // Ekonomi grubu
  new SlashCommandBuilder()
    .setName("ekonomi")
    .setDescription("Ekonomi komutları")
    .setDMPermission(false)
    .addSubcommand(s => s.setName("bakiye").setDescription("Bakiyeni göster")
      .addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı")))
    .addSubcommand(s => s.setName("gunluk").setDescription("Günlük ödül"))
    .addSubcommand(s => s.setName("haftalik").setDescription("Haftalık ödül"))
    .addSubcommand(s => s.setName("calis").setDescription("Çalışarak coin kazan"))
    .addSubcommand(s => s.setName("ode").setDescription("Birine coin gönder")
      .addUserOption(o => o.setName("kullanici").setDescription("Alıcı").setRequired(true))
      .addIntegerOption(o => o.setName("miktar").setDescription("Miktar").setRequired(true).setMinValue(1).setMaxValue(1000000)))
    .addSubcommand(s => s.setName("slots").setDescription("Slot oyna")
      .addIntegerOption(o => o.setName("bahis").setDescription("Bahis").setRequired(true).setMinValue(1).setMaxValue(1000000)))
    .addSubcommand(s => s.setName("siralama").setDescription("En zengin 10"))
    .addSubcommand(s => s.setName("para-ver").setDescription("Yönetici: coin ver")
      .addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı").setRequired(true))
      .addIntegerOption(o => o.setName("miktar").setDescription("Miktar").setRequired(true).setMinValue(1))),

  // Eğlence grubu
  new SlashCommandBuilder()
    .setName("eglence")
    .setDescription("Eğlence komutları")
    .setDMPermission(false)
    .addSubcommand(s => s.setName("saril").setDescription("Sarıl").addUserOption(o => o.setName("kullanici").setDescription("Hedef")))
    .addSubcommand(s => s.setName("op").setDescription("Öp").addUserOption(o => o.setName("kullanici").setDescription("Hedef")))
    .addSubcommand(s => s.setName("tokat").setDescription("Tokat").addUserOption(o => o.setName("kullanici").setDescription("Hedef")))
    .addSubcommand(s => s.setName("oksa").setDescription("Okşa").addUserOption(o => o.setName("kullanici").setDescription("Hedef")))
    .addSubcommand(s => s.setName("yumruk").setDescription("Yumruk").addUserOption(o => o.setName("kullanici").setDescription("Hedef")))
    .addSubcommand(s => s.setName("dans").setDescription("Dans").addUserOption(o => o.setName("kullanici").setDescription("Hedef")))
    .addSubcommand(s => s.setName("ship").setDescription("Ship")
      .addUserOption(o => o.setName("kisi2").setDescription("Ship'lenecek kişi").setRequired(true))
      .addUserOption(o => o.setName("kisi1").setDescription("İlk kişi (boş bırakırsan sen)")))
    .addSubcommand(s => s.setName("8ball").setDescription("8ball").addStringOption(o => o.setName("soru").setDescription("Soru").setRequired(true).setMaxLength(500)))
    .addSubcommand(s => s.setName("zar").setDescription("Zar").addIntegerOption(o => o.setName("yuz").setDescription("Yüz").setMinValue(2).setMaxValue(100)))
    .addSubcommand(s => s.setName("yazitura").setDescription("Yazı tura"))
    .addSubcommand(s => s.setName("rate").setDescription("Puanla").addStringOption(o => o.setName("ne").setDescription("Ne").setRequired(true).setMaxLength(100)))
    .addSubcommand(s => s.setName("howgay").setDescription("How gay").addUserOption(o => o.setName("kullanici").setDescription("Hedef")))
    .addSubcommand(s => s.setName("askolcer").setDescription("Aşk ölçer")
      .addUserOption(o => o.setName("kisi1").setDescription("1").setRequired(true))
      .addUserOption(o => o.setName("kisi2").setDescription("2").setRequired(true))),

  // Araçlar grubu
  new SlashCommandBuilder()
    .setName("arac")
    .setDescription("Yardımcı araçlar")
    .setDMPermission(false)
    .addSubcommand(s => s.setName("afk").setDescription("AFK ol").addStringOption(o => o.setName("sebep").setDescription("Sebep").setMaxLength(200)))
    .addSubcommand(s => s.setName("avatar").setDescription("Avatar").addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı")))
    .addSubcommand(s => s.setName("kullanici").setDescription("Kullanıcı bilgisi").addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı")))
    .addSubcommand(s => s.setName("sunucu").setDescription("Sunucu bilgisi"))
    .addSubcommand(s => s.setName("snipe").setDescription("Son silinen mesaj"))
    .addSubcommand(s => s.setName("anket").setDescription("Anket")
      .addStringOption(o => o.setName("soru").setDescription("Soru").setRequired(true).setMaxLength(250))
      .addStringOption(o => o.setName("secenek1").setDescription("1").setRequired(true).setMaxLength(80))
      .addStringOption(o => o.setName("secenek2").setDescription("2").setRequired(true).setMaxLength(80))
      .addStringOption(o => o.setName("secenek3").setDescription("3").setMaxLength(80))
      .addStringOption(o => o.setName("secenek4").setDescription("4").setMaxLength(80))
      .addStringOption(o => o.setName("secenek5").setDescription("5").setMaxLength(80)))
    .addSubcommand(s => s.setName("rastgele").setDescription("Rastgele üye"))
    .addSubcommand(s => s.setName("hesapla").setDescription("Hesap makinesi").addStringOption(o => o.setName("islem").setDescription("İşlem").setRequired(true).setMaxLength(80)))
    .addSubcommand(s => s.setName("hatirlat").setDescription("Hatırlatıcı")
      .addIntegerOption(o => o.setName("dakika").setDescription("Dakika").setRequired(true).setMinValue(1).setMaxValue(10080))
      .addStringOption(o => o.setName("not").setDescription("Not").setMaxLength(200)))
    .addSubcommand(s => s.setName("emojiler").setDescription("Sunucu emojileri"))
    .addSubcommand(s => s.setName("ping").setDescription("Bot gecikmesi"))
    .addSubcommand(s => s.setName("botbilgi").setDescription("Bot bilgileri ve istatistikleri"))
    .addSubcommand(s => s.setName("say").setDescription("Bot adına yaz").addStringOption(o => o.setName("mesaj").setDescription("Mesaj").setRequired(true).setMaxLength(2000))),

  // Rol ayarları (yetkili) — /yonetim rol-ayarla, /yonetim rol-liste
  new SlashCommandBuilder()
    .setName("rol-ayarla")
    .setDescription("Sistem rollerini seç / değiştir (boş bıraktığın değişmez)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addRoleOption(o => o.setName("streamer").setDescription("Streamer rolü (panel/başvuru onayında verilir)"))
    .addRoleOption(o => o.setName("kayitli").setDescription("Kayıt olunca verilen rol (üye rolü)"))
    .addRoleOption(o => o.setName("kayitsiz").setDescription("Yeni gelene verilen kayıtsız rolü"))
    .addRoleOption(o => o.setName("erkek").setDescription("Erkek cinsiyet rolü"))
    .addRoleOption(o => o.setName("kadin").setDescription("Kadın cinsiyet rolü"))
    .addRoleOption(o => o.setName("belirsiz").setDescription("Belirtmek istemiyorum rolü"))
    .addRoleOption(o => o.setName("yetkili").setDescription("Genel yetkili rolü"))
    .addRoleOption(o => o.setName("destek").setDescription("Ticket / destek ekibi rolü"))
    .addRoleOption(o => o.setName("kayit_yetkili").setDescription("Kayıt yapabilen yetkili rolü"))
    .addRoleOption(o => o.setName("otorol").setDescription("Sunucuya girene otomatik verilen rol"))
    .addRoleOption(o => o.setName("yas18").setDescription("+18 doğrulama rolü"))
    .addRoleOption(o => o.setName("yayin_bildirim").setDescription("Yayın bildirim rolü"))
    .addRoleOption(o => o.setName("basvuru_yetkili").setDescription("Streamer başvurularına bakan rol"))
    .addRoleOption(o => o.setName("booster").setDescription("Booster rolü"))
    .addStringOption(o => o.setName("temizle").setDescription("Seçilen rol ayarını kaldır")
      .addChoices(
        { name: "Streamer", value: "streamer" },
        { name: "Kayıtlı", value: "kayitli" },
        { name: "Kayıtsız", value: "kayitsiz" },
        { name: "Erkek", value: "erkek" },
        { name: "Kadın", value: "kadin" },
        { name: "Belirsiz", value: "belirsiz" },
        { name: "Yetkili", value: "yetkili" },
        { name: "Destek", value: "destek" },
        { name: "Kayıt yetkili", value: "kayit_yetkili" },
        { name: "Otorol", value: "otorol" },
        { name: "+18", value: "yas18" },
        { name: "Yayın bildirim", value: "yayin_bildirim" },
        { name: "Başvuru yetkili", value: "basvuru_yetkili" },
        { name: "Booster", value: "booster" }
      )),
  new SlashCommandBuilder()
    .setName("rol-liste")
    .setDescription("Ayarlı sistem rollerini göster")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  // Komutları yenile (yetkili) — /yonetim komut-yenile
  new SlashCommandBuilder()
    .setName("komut-yenile")
    .setDescription("Bu sunucunun slash komutlarını yeniden yükle")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  // Yardım (ASCII alias)
  new SlashCommandBuilder()
    .setName("yardim")
    .setDescription("Komut yardım menüsü")
    .setDMPermission(false),

  // Starboard
  new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("Yıldız panosu ayarları")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand(s => s.setName("ayarla").setDescription("Starboard kanalı")
      .addChannelOption(o => o.setName("kanal").setDescription("Kanal").addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addIntegerOption(o => o.setName("minimum").setDescription("Min yıldız (varsayılan 3)").setMinValue(1).setMaxValue(20)))
    .addSubcommand(s => s.setName("kapat").setDescription("Starboard kapat"))
    .addSubcommand(s => s.setName("durum").setDescription("Starboard durumu")),

  // Davet
  new SlashCommandBuilder()
    .setName("davet")
    .setDescription("Davet takip sistemi")
    .setDMPermission(false)
    .addSubcommand(s => s.setName("ayarla").setDescription("Davet log kanalı")
      .addChannelOption(o => o.setName("kanal").setDescription("Kanal").addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName("kapat").setDescription("Davet takibini kapat"))
    .addSubcommand(s => s.setName("bilgi").setDescription("Davet sayın")
      .addUserOption(o => o.setName("kullanici").setDescription("Kullanıcı")))
    .addSubcommand(s => s.setName("siralama").setDescription("Davet sıralaması")),

  // Sayma
  new SlashCommandBuilder()
    .setName("sayma")
    .setDescription("Sayı sayma oyunu")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand(s => s.setName("ayarla").setDescription("Sayma kanalı")
      .addChannelOption(o => o.setName("kanal").setDescription("Kanal").addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName("kapat").setDescription("Saymayı kapat"))
    .addSubcommand(s => s.setName("sifirla").setDescription("Sayacı sıfırla")),

  // İtiraf
  new SlashCommandBuilder()
    .setName("itiraf")
    .setDescription("Anonim itiraf gönder")
    .setDMPermission(false)
    .addStringOption(o => o.setName("mesaj").setDescription("İtirafın").setRequired(true).setMaxLength(1000)),
  new SlashCommandBuilder()
    .setName("itiraf-ayarla")
    .setDescription("İtiraf kanalını ayarla")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addChannelOption(o => o.setName("kanal").setDescription("İtiraf kanalı").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption(o => o.setName("log").setDescription("Yetkili log kanalı (kim yazdı)").addChannelTypes(ChannelType.GuildText)),

  // Kanal araçları
  new SlashCommandBuilder()
    .setName("kanal")
    .setDescription("Kanal kilitle / yavaş mod")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addSubcommand(s => s.setName("kilitle").setDescription("Kanalı kilitle")
      .addChannelOption(o => o.setName("kanal").setDescription("Kanal").addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName("ac").setDescription("Kilidi aç")
      .addChannelOption(o => o.setName("kanal").setDescription("Kanal").addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName("yavaş").setDescription("Yavaş mod")
      .addIntegerOption(o => o.setName("saniye").setDescription("0-21600").setRequired(true).setMinValue(0).setMaxValue(21600))
      .addChannelOption(o => o.setName("kanal").setDescription("Kanal").addChannelTypes(ChannelType.GuildText))),

  // Boost
  new SlashCommandBuilder()
    .setName("boost-kanal")
    .setDescription("Boost teşekkür kanalını ayarla")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addChannelOption(o => o.setName("kanal").setDescription("Kanal").addChannelTypes(ChannelType.GuildText).setRequired(true)),

  // Endless İma — özgün imza kartı
  new SlashCommandBuilder()
    .setName("ima")
    .setDescription("Endless İma: kişiye özel imza / aura kartı")
    .setDMPermission(false)
    .addUserOption(o => o.setName("kullanici").setDescription("Bakılacak kullanıcı")),
];



async function handleGroupedCommand(interaction) {
  const n = interaction.commandName;
  const sub = interaction.options?.getSubcommand?.(false) || null;

  // /yardim alias
  if (n === "yardim" || n === "yardım") {
    return interaction.reply(helpHome());
  }

  // /ekonomi
  if (n === "ekonomi") {
    // map sub -> fake commandName for existing handlers
    const map = {
      bakiye: "bakiye",
      gunluk: "günlük",
      haftalik: "haftalık",
      calis: "çalış",
      ode: "öde",
      slots: "slots",
      siralama: "leaderboard-para",
      "para-ver": "para-ver"
    };
    const mapped = map[sub];
    if (!mapped) return interaction.reply({ content: "❌ Bilinmeyen ekonomi komutu.", ephemeral: true });
    if (mapped === "para-ver") return handleParaVer(interaction);
    // Monkey-patch commandName for handler
    Object.defineProperty(interaction, "commandName", { value: mapped, configurable: true });
    return handleEconomyCommand(interaction);
  }

  // /eglence
  if (n === "eglence") {
    const map = {
      saril: "sarıl", op: "öp", tokat: "tokat", oksa: "okşa", yumruk: "yumruk", dans: "dans",
      ship: "ship", "8ball": "8ball", zar: "zar", yazitura: "yazıtura", rate: "rate",
      howgay: "howgay", askolcer: "aşkölçer"
    };
    const mapped = map[sub];
    if (!mapped) return interaction.reply({ content: "❌ Bilinmeyen eğlence komutu.", ephemeral: true });
    Object.defineProperty(interaction, "commandName", { value: mapped, configurable: true });
    return handleFunCommand(interaction);
  }

  // /arac
  if (n === "arac") {
    if (sub === "botbilgi") return handleBotInfo(interaction);
    const map = {
      afk: "afk", avatar: "avatar", kullanici: "kullanici", sunucu: "sunucu", snipe: "snipe",
      anket: "anket", rastgele: "rastgele", hesapla: "hesapla", hatirlat: "hatirlat",
      emojiler: "emojiler", ping: "ping", say: "say"
    };
    const mapped = map[sub];
    if (!mapped) return interaction.reply({ content: "❌ Bilinmeyen araç komutu.", ephemeral: true });
    Object.defineProperty(interaction, "commandName", { value: mapped, configurable: true });
    return handleUtilityCommand(interaction);
  }

  // /muzik
  if (n === "muzik") {
    return handleMusicCommand(interaction);
  }

  // /ozel-oda-kur
  if (n === "ozel-oda-kur" || n === "özel-oda-kur") {
    return setupTempVoice(interaction);
  }

  // /ima
  if (n === "ima") {
    return handleImaSlash(interaction);
  }

  // Starboard / davet / sayma / itiraf / kanal / boost
  if (typeof EXTRA_TOP_LEVEL !== "undefined" && EXTRA_TOP_LEVEL.includes(n)) {
    return handleExtraSystemsCommand(interaction);
  }

  return false;
}

const GROUPED_TOP_LEVEL = ["ekonomi", "eglence", "arac", "muzik", "ozel-oda-kur", "yardim", "starboard", "davet", "sayma", "itiraf", "itiraf-ayarla", "kanal", "boost-kanal", "ima"];


// ======================================================
// EXTRA SİSTEMLER: Starboard, Davet, Kilit, Sayma, İtiraf, Boost
// ======================================================

function ensureExtraSystems(config) {
  config.starboard ??= { enabled: false, channelId: null, minStars: 3, map: {} };
  config.starboard.map ??= {};
  config.invites ??= { enabled: false, channelId: null, cache: {}, counts: {} };
  config.counting ??= { enabled: false, channelId: null, count: 0, lastUserId: null };
  config.confess ??= { enabled: false, channelId: null, logChannelId: null, counter: 0 };
  config.boost ??= { enabled: true, channelId: null };
  return config;
}

// ---------- STARBOARD ----------
async function handleStarboardReaction(reaction, user, added) {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => null);
    if (reaction.emoji?.name !== "⭐") return;
    const message = reaction.message;
    if (!message?.guild || message.author?.bot) return;
    if (message.partial) await message.fetch().catch(() => null);

    const config = ensureExtraSystems(getServerConfig(message.guild.id));
    const sb = config.starboard;
    if (!sb.enabled || !sb.channelId) return;

    const count = reaction.count || 0;
    const min = Math.max(1, Number(sb.minStars) || 3);
    const board = message.guild.channels.cache.get(sb.channelId);
    if (!board?.isTextBased()) return;

    const existingId = sb.map[message.id];

    if (count < min) {
      if (existingId) {
        const old = await board.messages.fetch(existingId).catch(() => null);
        if (old) await old.delete().catch(() => {});
        delete sb.map[message.id];
        saveServerConfig(message.guild.id, config);
      }
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({
        name: message.author?.tag || "Bilinmeyen",
        iconURL: message.author?.displayAvatarURL?.() || undefined
      })
      .setDescription(
        (message.content || "").slice(0, 1500) ||
        (message.attachments?.size ? "*[medya]*" : "*[içerik yok]*")
      )
      .addFields(
        { name: "⭐ Yıldız", value: String(count), inline: true },
        { name: "Kanal", value: `${message.channel}`, inline: true },
        { name: "Mesaj", value: `[Atla](${message.url})`, inline: true }
      )
      .setFooter({ text: BRAND_FOOTER })
      .setTimestamp(message.createdAt);

    const img = message.attachments?.find?.(a => a.contentType?.startsWith("image/"));
    if (img) embed.setImage(img.url);

    if (existingId) {
      const old = await board.messages.fetch(existingId).catch(() => null);
      if (old) {
        await old.edit({ content: `⭐ **${count}** | ${message.channel}`, embeds: [embed] }).catch(() => {});
        return;
      }
    }

    const sent = await board.send({ content: `⭐ **${count}** | ${message.channel}`, embeds: [embed] });
    sb.map[message.id] = sent.id;
    // map şişmesin
    const keys = Object.keys(sb.map);
    if (keys.length > 200) {
      for (const k of keys.slice(0, keys.length - 150)) delete sb.map[k];
    }
    saveServerConfig(message.guild.id, config);
  } catch (e) {
    console.error("STARBOARD ERROR:", e.message);
  }
}

// ---------- DAVET TAKİBİ ----------
const inviteCache = new Map(); // guildId -> Map<code, uses>

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    for (const inv of invites.values()) map.set(inv.code, inv.uses || 0);
    inviteCache.set(guild.id, map);
  } catch {
    inviteCache.set(guild.id, new Map());
  }
}

async function handleInviteJoin(member) {
  try {
    const config = ensureExtraSystems(getServerConfig(member.guild.id));
    if (!config.invites?.enabled) return;

    let inviterId = null;
    let code = null;
    try {
      const newInvites = await member.guild.invites.fetch();
      const old = inviteCache.get(member.guild.id) || new Map();
      for (const inv of newInvites.values()) {
        const prev = old.get(inv.code) || 0;
        if ((inv.uses || 0) > prev) {
          inviterId = inv.inviter?.id || null;
          code = inv.code;
          break;
        }
      }
      const map = new Map();
      for (const inv of newInvites.values()) map.set(inv.code, inv.uses || 0);
      inviteCache.set(member.guild.id, map);
    } catch {}

    if (inviterId) {
      config.invites.counts[inviterId] = (config.invites.counts[inviterId] || 0) + 1;
      saveServerConfig(member.guild.id, config);
    }

    const chId = config.invites.channelId;
    if (!chId) return;
    const ch = member.guild.channels.cache.get(chId);
    if (!ch?.isTextBased()) return;

    await ch.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("📨 Yeni Davet")
          .setDescription(
            `${member} sunucuya katıldı.\n` +
            (inviterId
              ? `**Davet eden:** <@${inviterId}>\n**Kod:** \`${code}\`\n**Toplam daveti:** **${config.invites.counts[inviterId] || 1}**`
              : "Davet eden tespit edilemedi (özel/vanity).")
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setFooter({ text: BRAND_FOOTER })
          .setTimestamp()
      ]
    }).catch(() => {});
  } catch (e) {
    console.error("INVITE JOIN ERROR:", e.message);
  }
}

// ---------- SAYMA OYUNU ----------
async function handleCountingMessage(message) {
  if (!message.guild || message.author.bot) return false;
  const config = ensureExtraSystems(getServerConfig(message.guild.id));
  const c = config.counting;
  if (!c.enabled || !c.channelId || message.channel.id !== c.channelId) return false;

  const text = (message.content || "").trim();
  if (!/^\d+$/.test(text)) {
    await message.delete().catch(() => {});
    return true;
  }
  const num = parseInt(text, 10);
  const expected = (c.count || 0) + 1;

  if (message.author.id === c.lastUserId) {
    await message.delete().catch(() => {});
    await message.channel.send({
      content: `❌ ${message.author} art arda iki kez yazamazsın! Sayı **${c.count}**'da kaldı.`
    }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
    return true;
  }

  if (num !== expected) {
    c.count = 0;
    c.lastUserId = null;
    saveServerConfig(message.guild.id, config);
    await message.react("❌").catch(() => {});
    await message.channel.send({
      content: `💥 ${message.author} bozdu! Beklenen **${expected}** idi. Sayaç sıfırlandı → **0**`
    }).catch(() => {});
    return true;
  }

  c.count = num;
  c.lastUserId = message.author.id;
  saveServerConfig(message.guild.id, config);
  await message.react("✅").catch(() => {});

  if (num % 50 === 0) {
    await message.channel.send(`🎉 **${num}**! Harika gidiyorsunuz!`).catch(() => {});
  }
  return true;
}

// ---------- İTİRAF ----------
async function handleConfessCommand(interaction) {
  const config = ensureExtraSystems(getServerConfig(interaction.guildId));
  const conf = config.confess;

  if (!conf.enabled || !conf.channelId) {
    return interaction.reply({
      content: "❌ İtiraf sistemi kapalı veya kanal ayarlı değil. Yetkili: `/yonetim itiraf-kanal`",
      ephemeral: true
    });
  }

  const text = interaction.options.getString("mesaj")?.trim();
  if (!text || text.length < 3) {
    return interaction.reply({ content: "❌ İtiraf çok kısa.", ephemeral: true });
  }

  const channel = interaction.guild.channels.cache.get(conf.channelId);
  if (!channel?.isTextBased()) {
    return interaction.reply({ content: "❌ İtiraf kanalı bulunamadı.", ephemeral: true });
  }

  conf.counter = (conf.counter || 0) + 1;
  const num = conf.counter;
  saveServerConfig(interaction.guildId, config);

  const embed = new EmbedBuilder()
    .setTitle(`🙈 İtiraf #${num}`)
    .setColor(0x9b59b6)
    .setDescription(text.slice(0, 2000))
    .setFooter({ text: BRAND_FOOTER })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await msg.react("💜").catch(() => {});

  if (conf.logChannelId) {
    const log = interaction.guild.channels.cache.get(conf.logChannelId);
    if (log?.isTextBased()) {
      await log.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🔒 İtiraf Log #${num}`)
            .setColor(0xed4245)
            .setDescription(text.slice(0, 1500))
            .addFields({ name: "Yazan", value: `${interaction.user} (\`${interaction.user.id}\`)` })
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  }

  return interaction.reply({ content: `${EMOJI.ok} İtirafın anonim olarak gönderildi (#${num}).`, ephemeral: true });
}

// ---------- BOOST ----------
async function handleBoost(oldMember, newMember) {
  try {
    const was = Boolean(oldMember.premiumSince);
    const now = Boolean(newMember.premiumSince);
    if (was || !now) return;

    const config = ensureExtraSystems(getServerConfig(newMember.guild.id));
    if (config.boost?.enabled === false) return;

    const chId = config.boost.channelId || config.welcome?.channelId;
    if (!chId) return;
    const ch = newMember.guild.channels.cache.get(chId);
    if (!ch?.isTextBased()) return;

    await ch.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚀 Sunucu Boost!")
          .setColor(0xf47fff)
          .setDescription(
            `${newMember} sunucuyu **boostladı**! Teşekkürler 💜\n` +
            `Boost seviyesi: **${newMember.guild.premiumTier}** • Toplam: **${newMember.guild.premiumSubscriptionCount || "?"}**`
          )
          .setThumbnail(newMember.user.displayAvatarURL())
          .setFooter({ text: BRAND_FOOTER })
          .setTimestamp()
      ]
    }).catch(() => {});
  } catch (e) {
    console.error("BOOST ERROR:", e.message);
  }
}

// ---------- KANAL KİLİT / SLOWMODE ----------
async function handleChannelTools(interaction) {
  const sub = interaction.options.getSubcommand();
  const channel = interaction.options.getChannel("kanal") || interaction.channel;
  const me = interaction.guild.members.me;

  if (!hasPermission(interaction, PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: "❌ **Kanalları Yönet** yetkisi gerekir.", ephemeral: true });
  }
  if (!channel?.isTextBased?.() && channel.type !== ChannelType.GuildVoice) {
    return interaction.reply({ content: "❌ Geçerli bir kanal seç.", ephemeral: true });
  }
  if (!me?.permissionsIn(channel).has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: "❌ Bu kanalda **Kanalları Yönet** yetkim yok.", ephemeral: true });
  }

  if (sub === "kilitle") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      SendMessages: false,
      AddReactions: false
    }).catch(() => {});
    return interaction.reply({ content: `🔒 ${channel} kilitlendi.` });
  }
  if (sub === "ac") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      SendMessages: null,
      AddReactions: null
    }).catch(() => {});
    return interaction.reply({ content: `🔓 ${channel} kilidi açıldı.` });
  }
  if (sub === "yavaş") {
    const sn = interaction.options.getInteger("saniye") ?? 5;
    await channel.setRateLimitPerUser(sn).catch(() => {});
    return interaction.reply({ content: `🐢 ${channel} yavaş mod: **${sn}s**` });
  }
  return interaction.reply({ content: "❌ Bilinmeyen işlem.", ephemeral: true });
}

// ---------- EXTRA KOMUT YÖNLENDİRİCİ ----------
async function handleExtraSystemsCommand(interaction) {
  const n = interaction.commandName;
  const sub = interaction.options?.getSubcommand?.(false);
  const config = ensureExtraSystems(getServerConfig(interaction.guildId));

  if (n === "starboard") {
    if (!hasPermission(interaction, PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: "❌ **Sunucuyu Yönet** yetkisi gerekir.", ephemeral: true });
    }
    if (sub === "ayarla") {
      const ch = interaction.options.getChannel("kanal");
      const min = interaction.options.getInteger("minimum") ?? 3;
      config.starboard.enabled = true;
      config.starboard.channelId = ch.id;
      config.starboard.minStars = min;
      saveServerConfig(interaction.guildId, config);
      return interaction.reply({
        content: `✅ Starboard açıldı → ${ch}\nMinimum ⭐: **${min}**`,
        ephemeral: true
      });
    }
    if (sub === "kapat") {
      config.starboard.enabled = false;
      saveServerConfig(interaction.guildId, config);
      return interaction.reply({ content: "✅ Starboard kapatıldı.", ephemeral: true });
    }
    if (sub === "durum") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⭐ Starboard")
            .setColor(0xf1c40f)
            .addFields(
              { name: "Durum", value: config.starboard.enabled ? "🟢 Açık" : "🔴 Kapalı", inline: true },
              { name: "Kanal", value: config.starboard.channelId ? `<#${config.starboard.channelId}>` : "—", inline: true },
              { name: "Min ⭐", value: String(config.starboard.minStars || 3), inline: true }
            )
            .setFooter({ text: BRAND_FOOTER })
        ],
        ephemeral: true
      });
    }
  }

  if (n === "davet") {
    if (sub === "ayarla") {
      if (!hasPermission(interaction, PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: "❌ Yetkin yok.", ephemeral: true });
      }
      const ch = interaction.options.getChannel("kanal");
      config.invites.enabled = true;
      config.invites.channelId = ch.id;
      saveServerConfig(interaction.guildId, config);
      await cacheGuildInvites(interaction.guild);
      return interaction.reply({ content: `✅ Davet takibi açıldı → ${ch}`, ephemeral: true });
    }
    if (sub === "kapat") {
      if (!hasPermission(interaction, PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: "❌ Yetkin yok.", ephemeral: true });
      }
      config.invites.enabled = false;
      saveServerConfig(interaction.guildId, config);
      return interaction.reply({ content: "✅ Davet takibi kapatıldı.", ephemeral: true });
    }
    if (sub === "bilgi") {
      const user = interaction.options.getUser("kullanici") || interaction.user;
      const count = config.invites.counts?.[user.id] || 0;
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("📨 Davet Bilgisi")
            .setColor(0x5865f2)
            .setDescription(`${user} → **${count}** davet`)
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
    }
    if (sub === "siralama") {
      const top = Object.entries(config.invites.counts || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      if (!top.length) {
        return interaction.reply({ content: "📭 Henüz davet kaydı yok.", ephemeral: true });
      }
      const lines = top.map(([id, c], i) => `**${i + 1}.** <@${id}> — **${c}** davet`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🏆 Davet Sıralaması")
            .setColor(0xfee75c)
            .setDescription(lines.join("\n"))
            .setFooter({ text: BRAND_FOOTER })
        ],
        allowedMentions: { parse: [] }
      });
    }
  }

  if (n === "sayma") {
    if (!hasPermission(interaction, PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: "❌ Yetkin yok.", ephemeral: true });
    }
    if (sub === "ayarla") {
      const ch = interaction.options.getChannel("kanal");
      config.counting.enabled = true;
      config.counting.channelId = ch.id;
      config.counting.count = 0;
      config.counting.lastUserId = null;
      saveServerConfig(interaction.guildId, config);
      await ch.send("🔢 **Sayma oyunu başladı!** İlk sayı: **1**").catch(() => {});
      return interaction.reply({ content: `✅ Sayma kanalı: ${ch}`, ephemeral: true });
    }
    if (sub === "kapat") {
      config.counting.enabled = false;
      saveServerConfig(interaction.guildId, config);
      return interaction.reply({ content: "✅ Sayma kapatıldı.", ephemeral: true });
    }
    if (sub === "sifirla") {
      config.counting.count = 0;
      config.counting.lastUserId = null;
      saveServerConfig(interaction.guildId, config);
      return interaction.reply({ content: "✅ Sayaç sıfırlandı.", ephemeral: true });
    }
  }

  if (n === "itiraf") {
    return handleConfessCommand(interaction);
  }

  if (n === "itiraf-ayarla") {
    if (!hasPermission(interaction, PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: "❌ Yetkin yok.", ephemeral: true });
    }
    const ch = interaction.options.getChannel("kanal");
    const log = interaction.options.getChannel("log");
    config.confess.enabled = true;
    config.confess.channelId = ch.id;
    if (log) config.confess.logChannelId = log.id;
    saveServerConfig(interaction.guildId, config);
    return interaction.reply({
      content: `✅ İtiraf kanalı: ${ch}${log ? `\n🔒 Log: ${log}` : ""}`,
      ephemeral: true
    });
  }

  if (n === "kanal") {
    return handleChannelTools(interaction);
  }

  if (n === "boost-kanal") {
    if (!hasPermission(interaction, PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: "❌ Yetkin yok.", ephemeral: true });
    }
    const ch = interaction.options.getChannel("kanal");
    config.boost.enabled = true;
    config.boost.channelId = ch.id;
    saveServerConfig(interaction.guildId, config);
    return interaction.reply({ content: `✅ Boost duyuru kanalı: ${ch}`, ephemeral: true });
  }

  return false;
}

const EXTRA_TOP_LEVEL = [
  "starboard", "davet", "sayma", "itiraf", "itiraf-ayarla", "kanal", "boost-kanal"
];



// Starboard reactions
client.on("messageReactionAdd", async (reaction, user) => {
  try { await handleStarboardReaction(reaction, user, true); } catch (e) { console.error(e); }
});
client.on("messageReactionRemove", async (reaction, user) => {
  try { await handleStarboardReaction(reaction, user, false); } catch (e) { console.error(e); }
});

// Boost
client.on("guildMemberUpdate", async (oldM, newM) => {
  try { await handleBoost(oldM, newM); } catch (e) { console.error(e); }
});

// Invite cache refresh periodically
client.on("inviteCreate", async inv => {
  try { await cacheGuildInvites(inv.guild); } catch {}
});
client.on("inviteDelete", async inv => {
  try { await cacheGuildInvites(inv.guild); } catch {}
});



// ======================================================
// PREFIX KOMUTLARI (.) + ENDLESS İMA
// ======================================================
// Kullanım: .yardim  |  .bakiye  |  .rank  |  .ima @kişi

const PREFIX = ".";

const PREFIX_MAP = {
  // yardım
  yardim: "help", yardım: "help", help: "help",
  // ekonomi
  bakiye: "bakiye", bal: "bakiye", para: "bakiye",
  gunluk: "günlük", günlük: "günlük", daily: "günlük",
  haftalik: "haftalık", haftalık: "haftalık", weekly: "haftalık",
  calis: "çalış", çalış: "çalış", work: "çalış",
  slots: "slots", slot: "slots",
  // level
  rank: "rank", level: "rank", seviye: "rank",
  top: "leaderboard", lb: "leaderboard", siralama: "leaderboard",
  // araç
  avatar: "avatar", av: "avatar",
  user: "kullanici", kullanici: "kullanici", kim: "kullanici",
  sunucu: "sunucu", server: "sunucu",
  ping: "ping",
  afk: "afk",
  snipe: "snipe",
  // istatistik
  istatistik: "stats", stats: "stats", stat: "stats",
  // ima (özgün)
  ima: "ima", aura: "ima", imprint: "ima", signature: "ima"
};

function progressBarIma(pct, size = 10) {
  const f = Math.max(0, Math.min(size, Math.round((pct / 100) * size)));
  return "▓".repeat(f) + "░".repeat(size - f);
}

function endlessImaSeed(userId, guildId) {
  // stabil ama kişiye özel "imza"
  let h = 0;
  const s = `${userId}:${guildId}:endless`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildImaProfile(member, config) {
  const user = member.user;
  const seed = endlessImaSeed(user.id, member.guild.id);
  const ls = config.levelSystem?.users?.[user.id] || { xp: 0, level: 0, messages: 0 };
  const eco = config.economy?.users?.[user.id] || { balance: 0 };
  const invites = config.invites?.counts?.[user.id] || 0;

  const traits = [
    ["⚡", "Volt", "Anlık enerji, hızlı tepki"],
    ["🌊", "Akış", "Sakin ama derin etki"],
    ["🔥", "Kıvılcım", "Ortama ateş katan tip"],
    ["🌑", "Gölge", "Az konuşur, çok iz bırakır"],
    ["✦", "Nova", "Parlak, dikkat çeken aura"],
    ["🍃", "Esinti", "Hafif, ferah, rahatlatıcı"],
    ["🧿", "Mavi", "Koruyucu, dengeli imza"],
    ["⟡", "Echo", "Söyledikleri uzun süre kalır"]
  ];
  const trait = traits[seed % traits.length];

  const colors = [0x7c5cff, 0xff4ecd, 0x00d4aa, 0xf5a623, 0x3498db, 0xe74c3c, 0x9b59b6, 0x1abc9c];
  const color = colors[seed % colors.length];

  // skalar (0-100) — aktiviteye göre
  const levelScore = Math.min(100, (ls.level || 0) * 4 + Math.min(40, Math.floor((ls.xp || 0) / 200)));
  const coinScore = Math.min(100, Math.floor(Math.log10(Math.max(10, eco.balance || 0)) * 20));
  const socialScore = Math.min(100, (ls.messages || 0) / 20 + invites * 8);
  const voiceBonus = member.voice?.channel ? 12 : 0;
  const imprint = Math.min(100, Math.floor((levelScore * 0.35 + coinScore * 0.2 + socialScore * 0.35 + voiceBonus + (seed % 17)) ));

  const titles = [
    "Sonsuz İz", "Dijital İmza", "Endless Çekirdek", "Aura Bağı",
    "Kuantum İma", "Gece Frekansı", "Neon Nabız", "Void Fısıltısı"
  ];
  const title = titles[seed % titles.length];

  const quotes = [
    "İzler silinmez; sadece katmanlaşır.",
    "Bu sunucuda senin frekansın farklı titriyor.",
    "Endless, iz bırakanları hatırlar.",
    "Az görün, çok etki bırak.",
    "İma: söylenmeyenin de bir rengi vardır."
  ];
  const quote = quotes[seed % quotes.length];

  const code = `IMA-${(seed % 0xFFFF).toString(16).toUpperCase().padStart(4, "0")}`;

  return {
    embed: new EmbedBuilder()
      .setTitle(`${trait[0]} Endless İma · ${user.username}`)
      .setColor(color)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setDescription(
        `**${title}**\n` +
        `\`${code}\`\n\n` +
        `> *${quote}*\n\n` +
        `**Arketip:** ${trait[1]} — ${trait[2]}\n\n` +
        `**İmza gücü**  \`${progressBarIma(imprint)}\` **${imprint}%**`
      )
      .addFields(
        { name: "⭐ Seviye izi", value: `\`${progressBarIma(levelScore)}\` ${levelScore}`, inline: true },
        { name: "💰 Servet izi", value: `\`${progressBarIma(coinScore)}\` ${coinScore}`, inline: true },
        { name: "💬 Sosyal iz", value: `\`${progressBarIma(Math.min(100, socialScore))}\` ${Math.min(100, Math.floor(socialScore))}`, inline: true },
        {
          name: "📊 Özet",
          value:
            `Level **${ls.level || 0}** · XP **${ls.xp || 0}**\n` +
            `Coin **${Number(eco.balance || 0).toLocaleString("tr-TR")}** · Mesaj **${ls.messages || 0}**\n` +
            `Davet **${invites}**` +
            (member.premiumSince ? " · 🚀 Booster" : "")
        }
      )
      .setFooter({ text: `${BRAND_FOOTER} · kişiye özel stabil imza` })
      .setTimestamp()
  };
}

async function handlePrefixMessage(message) {
  if (!message.guild || message.author.bot) return false;
  const content = message.content || "";
  if (!content.startsWith(PREFIX)) return false;

  const body = content.slice(PREFIX.length).trim();
  if (!body) return false;

  const parts = body.split(/\s+/);
  const rawCmd = (parts[0] || "").toLowerCase();
  const key = PREFIX_MAP[rawCmd];
  if (!key) return false;

  const rest = parts.slice(1).join(" ");
  const mention = message.mentions.users.first();

  try {
    // --- help ---
    if (key === "help") {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${EMOJI.brand} Prefix Komutları`)
            .setColor(0x5865f2)
            .setDescription(
              "Slash komutların yanında **nokta (.)** ile de kullanabilirsin.\n\n" +
              "**Ekonomi:** `.bakiye` `.gunluk` `.calis` `.slots`\n" +
              "**Level:** `.rank` `.top`\n" +
              "**Araç:** `.avatar` `.kullanici` `.sunucu` `.ping` `.afk` `.snipe`\n" +
              "**İstatistik:** `.istatistik` (kanalları hemen günceller)\n" +
              "**Özgün:** `.ima` / `.ima @kişi` — Endless imzan\n\n" +
              "Slash: `/muzik` `/ozel-oda-kur` `/ekonomi` `/yardim`"
            )
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
      return true;
    }

    // --- stats force update ---
    if (key === "stats") {
      const config = getServerConfig(message.guild.id);
      if (!config.stats?.enabled) {
        await message.reply("❌ İstatistik sistemi kapalı. Yetkili: `/yonetim istatistik-kur`");
        return true;
      }
      await updateServerStats(message.guild, true);
      const m = message.guild.memberCount;
      const voice = message.guild.members.cache.filter(x => x.voice?.channel).size;
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("📊 İstatistik güncellendi")
            .setColor(0x57f287)
            .setDescription(
              `👥 Üye: **${m}**\n` +
              `🔊 Seste: **${voice}**\n` +
              `Kanallar otomatik yenilendi.`
            )
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
      return true;
    }

    // --- ima (unique) ---
    if (key === "ima") {
      const targetUser = mention || message.author;
      const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        await message.reply("❌ Kullanıcı bulunamadı.");
        return true;
      }
      const config = getServerConfig(message.guild.id);
      const profile = buildImaProfile(member, config);
      await message.reply({ embeds: [profile.embed] });
      return true;
    }

    // --- simple economy/level via embeds ---
    const config = getServerConfig(message.guild.id);

    if (key === "bakiye") {
      const target = mention || message.author;
      if (target.bot) {
        await message.reply("❌ Botların bakiyesi yok.");
        return true;
      }
      const eco = config.economy;
      if (!eco?.enabled) {
        await message.reply("❌ Ekonomi kapalı.");
        return true;
      }
      const u = ecoUser(eco, target.id);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`💰 ${target.username}`)
            .setColor(0xfee75c)
            .setDescription(coin(config, u.balance))
            .setThumbnail(target.displayAvatarURL())
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
      return true;
    }

    if (key === "günlük" || key === "haftalık" || key === "çalış" || key === "slots") {
      await message.reply({
        content: `ℹ️ Bu komut için slash kullan: \`/${key === "çalış" ? "ekonomi calis" : key === "slots" ? "ekonomi slots" : key === "günlük" ? "ekonomi gunluk" : "ekonomi haftalik"}\``,
        allowedMentions: { repliedUser: false }
      });
      return true;
    }

    if (key === "rank") {
      const target = mention || message.author;
      const ls = config.levelSystem;
      if (!ls?.enabled) {
        await message.reply("❌ Level sistemi kapalı.");
        return true;
      }
      const data = ls.users?.[target.id] || { xp: 0, level: 0, messages: 0 };
      const current = data.xp - totalXpForLevel(data.level);
      const needed = xpNeededForNext(data.level);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`⭐ ${target.username}`)
            .setColor(0xfee75c)
            .setThumbnail(target.displayAvatarURL())
            .setDescription(`${progressBar(current, needed)}\n**${current} / ${needed} XP**`)
            .addFields(
              { name: "Level", value: String(data.level), inline: true },
              { name: "Toplam XP", value: String(data.xp), inline: true },
              { name: "Mesaj", value: String(data.messages), inline: true }
            )
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
      return true;
    }

    if (key === "leaderboard") {
      const ls = config.levelSystem;
      if (!ls?.enabled) {
        await message.reply("❌ Level kapalı.");
        return true;
      }
      const top = Object.entries(ls.users || {}).sort((a, b) => b[1].xp - a[1].xp).slice(0, 10);
      if (!top.length) {
        await message.reply("📭 Henüz XP yok.");
        return true;
      }
      const medals = ["🥇", "🥈", "🥉"];
      const lines = top.map(([id, d], i) => `${medals[i] || `**${i + 1}.**`} <@${id}> — Lv **${d.level}** · ${d.xp} XP`);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🏆 Level Sıralaması")
            .setDescription(lines.join("\n"))
            .setColor(0xfee75c)
            .setFooter({ text: BRAND_FOOTER })
        ],
        allowedMentions: { parse: [] }
      });
      return true;
    }

    if (key === "avatar") {
      const target = mention || message.author;
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🖼️ ${target.username}`)
            .setImage(target.displayAvatarURL({ size: 4096 }))
            .setColor(0x5865f2)
        ]
      });
      return true;
    }

    if (key === "ping") {
      const sent = await message.reply("🏓 ...");
      const lag = sent.createdTimestamp - message.createdTimestamp;
      await sent.edit(`🏓 Mesaj: **${lag}ms** · WS: **${Math.round(client.ws.ping)}ms**`);
      return true;
    }

    if (key === "afk") {
      const reason = rest || "Sebep belirtilmedi";
      setAfk(message.guild.id, message.author.id, reason);
      await message.reply(`💤 AFK: **${reason.slice(0, 200)}**`);
      return true;
    }

    if (key === "snipe") {
      const data = snipeMap.get(message.channel.id);
      if (!data) {
        await message.reply("📭 Silinen mesaj yok.");
        return true;
      }
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔫 Snipe")
            .setColor(0xed4245)
            .setAuthor({ name: data.authorTag, iconURL: data.avatar })
            .setDescription(data.content || "*[medya]*")
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
      return true;
    }

    if (key === "sunucu") {
      const g = message.guild;
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🌐 ${g.name}`)
            .setThumbnail(g.iconURL({ size: 256 }))
            .setColor(0x5865f2)
            .addFields(
              { name: "Üye", value: String(g.memberCount), inline: true },
              { name: "Kanal", value: String(g.channels.cache.size), inline: true },
              { name: "Rol", value: String(g.roles.cache.size), inline: true },
              { name: "Boost", value: `Seviye ${g.premiumTier} · ${g.premiumSubscriptionCount || 0}`, inline: true }
            )
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
      return true;
    }

    if (key === "kullanici") {
      const target = mention || message.author;
      const member = await message.guild.members.fetch(target.id).catch(() => null);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`👤 ${target.username}`)
            .setThumbnail(target.displayAvatarURL())
            .setColor(0x5865f2)
            .addFields(
              { name: "ID", value: `\`${target.id}\``, inline: true },
              { name: "Hesap", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
              { name: "Katılma", value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "—", inline: true }
            )
            .setFooter({ text: BRAND_FOOTER })
        ]
      });
      return true;
    }

  } catch (e) {
    console.error("PREFIX ERROR:", e.message);
  }
  return true;
}

// Slash /ima
async function handleImaSlash(interaction) {
  const target = interaction.options.getUser("kullanici") || interaction.user;
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: "❌ Kullanıcı bulunamadı.", ephemeral: true });
  }
  const config = getServerConfig(interaction.guildId);
  const profile = buildImaProfile(member, config);
  return interaction.reply({ embeds: [profile.embed] });
}


// ======================================================
// LOGIN
// ======================================================

if (
  !process.env.DISCORD_TOKEN
) {

  console.error(
    "❌ DISCORD_TOKEN bulunamadı."
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
).catch(err => {
  console.error("❌ GİRİŞ HATASI:", err.message);
  if (/disallowed intents/i.test(err.message)) {
    console.error("   ↳ Discord Developer Portal → Bot → 'Privileged Gateway Intents' altında SERVER MEMBERS INTENT ve MESSAGE CONTENT INTENT'i aç.");
  } else if (/token/i.test(err.message)) {
    console.error("   ↳ DISCORD_TOKEN yanlış veya sıfırlanmış olabilir.");
  }
  process.exit(1);
});
