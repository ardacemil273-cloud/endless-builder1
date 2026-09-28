const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  AttachmentBuilder,
  UserSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ======================================================
// CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
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

const CONFIG_VERSION = 5;
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
    roles: { admin: null, staff: null, support: null, registration: null, streamer: null, member: null, unregistered: null, booster: null, bot: null },
    channels: { log: null },
    welcome: { enabled: false, channelId: null, autoRoleId: null },
    ticket: { categoryId: null, staffRoleId: null, claimedBy: {}, records: {}, history: [], counter: 0 },
    registration: { unregisteredRoleId: null, registeredRoleId: null, staffRoleId: null },
    rolePanel: { channelId: null, messageId: null, roles: [] },
    stats: { enabled: false, categoryId: null, channels: { members: null, bots: null, online: null, voice: null } },
    warnings: {}, tickets: {},
    levelSystem: { enabled: true, minXp: 15, maxXp: 25, cooldownSec: 60, announceChannelId: null, levelRoles: {}, users: {} },
    economy: { enabled: true, currency: "Endless Coin", dailyReward: 250, weeklyReward: 1500, workMin: 50, workMax: 150, slotsMinBet: 10, slotsMaxBet: 5000, users: {} },
    shop: { items: [], nextId: 1 },
    giveaways: { enabled: true, active: {} },
    ai: { enabled: false, channelId: null },
    antiRaid: { enabled: false, joinThreshold: 5, windowSec: 10, antiSpam: false, mentionSpam: false, channelDelete: false, roleDelete: false, webhook: false },
    autoMod: { enabled: false, spam: false, flood: false, mentions: false, links: false, badWords: false, caps: false, punishment: "delete" },
    premium: { active: false, expiresAt: null }
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
// ROLE PANEL
// ======================================================

async function createRolePanel(
  channel,
  roles
) {
  const buttons = [];

  for (
    let i = 0;
    i < roles.length;
    i++
  ) {

    const role = roles[i];

    if (!role) continue;

    let label =
      role.name;

    if (
      label.length > 80
    ) {
      label =
        label.slice(0, 80);
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(
          `eb_role_${role.id}`
        )
        .setLabel(label)
        .setStyle(
          ButtonStyle.Secondary
        )
    );
  }

  const rows = [];

  for (
    let i = 0;
    i < buttons.length;
    i += 5
  ) {

    rows.push(
      new ActionRowBuilder()
        .addComponents(
          buttons.slice(
            i,
            i + 5
          )
        )
    );
  }

  const message =
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            "🎭 Rol Seçim Paneli"
          )
          .setDescription(
            "Aşağıdaki butonlardan istediğin rolü alabilir veya üzerindeki rolü kaldırabilirsin."
          )
          .setColor(0x5865f2)
      ],
      components: rows
    });

  return message;
}

// ======================================================
// SERVER STATISTICS
// ======================================================

async function updateServerStats(
  guild
) {
  try {

    const config =
      getServerConfig(guild.id);

    if (
      !config.stats?.enabled
    ) {
      return;
    }

    await guild.members
      .fetch()
      .catch(() => {});

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
    guild
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
    )

].map(
  command =>
    command.toJSON()
);

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

  // ---------------- /level-sistem ----------------
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

  // ---------------- /rank & /leaderboard ----------------
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

  // ---------------- /cekilis ----------------
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

  // ---------------- /cekilis-bitir ----------------
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
  return `💰 **${Number(amount).toLocaleString("tr-TR")}** ${name}`;
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

  // ---------------- /bakiye ----------------
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

  // ---------------- /günlük & /haftalık ----------------
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

  // ---------------- /çalış ----------------
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

  // ---------------- /öde ----------------
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

  // ---------------- /slots ----------------
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

    const result = rollSlots(bet);
    if (result.payout > 0) creditCoins(me, result.payout);
    saveServerConfig(interaction.guildId, config);

    const net = result.payout - bet;
    const title =
      result.kind === "jackpot" ? "🎰 JACKPOT!" : result.kind === "pair" ? "🎰 İkili Eşleşme" : "🎰 Kaybettin";
    const color =
      result.kind === "jackpot" ? 0xfee75c : result.kind === "pair" ? 0x57f287 : 0xed4245;

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setColor(color)
          .setDescription(`**[ ${result.symbols.join(" | ")} ]**`)
          .addFields(
            { name: "Bahis", value: coin(config, bet), inline: true },
            {
              name: net >= 0 ? "Kazanç" : "Kayıp",
              value: coin(config, Math.abs(net)),
              inline: true
            },
            { name: "Bakiye", value: coin(config, me.balance), inline: true }
          )
          .setTimestamp()
      ]
    });
  }

  // ---------------- /leaderboard-para ----------------
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
          .setTitle("💰 Zenginler Listesi")
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

  // ---------------- /mağaza ----------------
  if (commandName === "mağaza") {
    if (!shop.items.length) {
      return interaction.reply({
        content: "🛒 Mağazada henüz ürün yok. Yetkililer `/mağaza-ekle` ile ürün ekleyebilir.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🛒 Mağaza")
      .setColor(0x5865f2)
      .setDescription("Satın almak için `/satın-al` komutunu kullan.")
      .addFields(
        shop.items.slice(0, 25).map(item => ({
          name: `#${item.id} ${item.name} — ${item.price.toLocaleString("tr-TR")} 💰`.slice(0, 256),
          value: `${item.description ? `${item.description}\n` : ""}${describeShopItem(item)}`.slice(0, 1024)
        }))
      )
      .setFooter({ text: config.economy?.currency || "Endless Coin" });

    return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }

  // ---------------- /mağaza-ekle ----------------
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

  // ---------------- /mağaza-sil ----------------
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

  // ---------------- /satın-al ----------------
  if (commandName === "satın-al") {
    // deferReply'dan sonraki kontrol + bakiye düşme adımlarında await yok
    await interaction.deferReply({ ephemeral: true });

    const eco = config.economy;

    if (!eco?.enabled) {
      return interaction.editReply({ content: "❌ Ekonomi sistemi bu sunucuda kapalı." });
    }

    const item = findShopItem(shop, interaction.options.getString("urun"));

    if (!item) {
      return interaction.editReply({ content: "❌ Ürün bulunamadı. `/mağaza` ile listeye bakabilirsin." });
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
// READY
// ======================================================

client.once(
  "ready",
  async () => {

    console.log(
      `✅ ${client.user.tag} aktif!`
    );

    const guildId =
      process.env.GUILD_ID;

    if (!guildId) {
      console.log(
        "⚠️ GUILD_ID bulunamadı."
      );
      return;
    }

    const guild =
      await client.guilds
        .fetch(guildId)
        .catch(() => null);

    if (!guild) {
      console.log(
        "❌ Test sunucusu bulunamadı."
      );
      return;
    }

    await client.application.commands.set(
      commands,
      guild.id
    );

    console.log(
      `✅ ${commands.length} komut yüklendi.`
    );

    // İlk istatistik güncellemesi
    await updateServerStats(
      guild
    );
  }
);

// ======================================================
// INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {

    try {

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
                "`/setup-degistir` kullanabilirsin.",
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
                "❌ Ticket sistemi kurulu değil. Önce `/setup-degistir` ile Ticket özelliğini aç.",
              ephemeral: true
            });
          }

          const row = ticketPanelRow();

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🎫 Destek Sistemi"
                )
                .setDescription(
                  "Konunu seçip ilgili butona basarak ticket oluşturabilirsin.\n\n" +
                  "🎫 **Destek** • 🛒 **Satın Alma** • ⚠️ **Şikayet** • 📩 **Diğer**\n\n" +
                  "🛡️ Yetkililer ticketı devralabilir.\n" +
                  "🔒 Ticket kapatılırken onay istenir ve transcript kaydedilir."
                )
                .setColor(
                  0x5865f2
                )
            ],
            components: [
              row
            ]
          });
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

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "📝 Kayıt Sistemi"
                )
                .setDescription(
                  "Kayıt işlemini kullanıcı kendisi yapamaz.\n\n" +
                  "Yetkililer:\n" +
                  "`/kayit @kullanıcı`\n\n" +
                  "komutuyla kullanıcıyı kayıt edebilir."
                )
                .setColor(
                  0x57f287
                )
            ]
          });
        }

        // ===============================================
        // KAYIT
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

          const registeredRole =
            config.registration
              ?.registeredRoleId;

          const unregisteredRole =
            config.registration
              ?.unregisteredRoleId;

          if (unregisteredRole) {
            await member.roles
              .remove(
                unregisteredRole
              )
              .catch(() => {});
          }

          if (registeredRole) {
            await member.roles
              .add(
                registeredRole
              )
              .catch(() => {});
          }

          await sendLog(
            interaction.guild,
            `📝 ${user} kullanıcısı ${interaction.user} tarafından kayıt edildi.`
          );

          return interaction.reply({
            content:
              `✅ ${user} başarıyla kayıt edildi.`,
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

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🎥 Streamer"
                )
                .setDescription(
                  "Streamer olmak için aşağıdaki butona bas.\n\n" +
                  "Form yoktur. Butona bastığın anda Streamer rolü verilir."
                )
                .setColor(
                  0xff4ecd
                )
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(
                      "eb_streamer_apply"
                    )
                    .setLabel(
                      "Streamer Ol"
                    )
                    .setStyle(
                      ButtonStyle.Success
                    )
                    .setEmoji("🎥")
                )
            ]
          });
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

        // ===============================================
        // BAN
        // ===============================================

        if (
          commandName === "ban"
        ) {

          if (
            !hasPermission(
              interaction,
              PermissionsBitField.Flags.BanMembers
            )
          ) {

            return interaction.reply({
              content:
                "❌ Ban yetkin yok.",
              ephemeral: true
            });
          }

          const user =
            interaction.options.getUser(
              "kullanici"
            );

          const reason =
            interaction.options.getString(
              "sebep"
            ) ||
            "Sebep belirtilmedi.";

          const member =
            await interaction.guild.members
              .fetch(user.id)
              .catch(() => null);

          if (!member) {

            return interaction.reply({
              content:
                "❌ Kullanıcı bulunamadı.",
              ephemeral: true
            });
          }

          if (
            member.id ===
            interaction.user.id
          ) {

            return interaction.reply({
              content:
                "❌ Kendini banlayamazsın.",
              ephemeral: true
            });
          }

          if (
            !member.bannable
          ) {

            return interaction.reply({
              content:
                "❌ Bu kullanıcıyı banlayamıyorum. Rol hiyerarşisini kontrol et.",
              ephemeral: true
            });
          }

          await member.ban({
            reason
          });

          await sendLog(
            interaction.guild,
            `🔨 ${user} kullanıcısı banlandı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}`
          );

          return interaction.reply({
            content:
              `🔨 ${user.tag} banlandı.`,
            ephemeral: true
          });
        }

        // ===============================================
        // KICK
        // ===============================================

        if (
          commandName === "kick"
        ) {

          if (
            !hasPermission(
              interaction,
              PermissionsBitField.Flags.KickMembers
            )
          ) {

            return interaction.reply({
              content:
                "❌ Kick yetkin yok.",
              ephemeral: true
            });
          }

          const user =
            interaction.options.getUser(
              "kullanici"
            );

          const reason =
            interaction.options.getString(
              "sebep"
            ) ||
            "Sebep belirtilmedi.";

          const member =
            await interaction.guild.members
              .fetch(user.id)
              .catch(() => null);

          if (
            !member ||
            !member.kickable
          ) {

            return interaction.reply({
              content:
                "❌ Bu kullanıcıyı atamıyorum.",
              ephemeral: true
            });
          }

          await member.kick(
            reason
          );

          await sendLog(
            interaction.guild,
            `👢 ${user} sunucudan atıldı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}`
          );

          return interaction.reply({
            content:
              `👢 ${user.tag} sunucudan atıldı.`,
            ephemeral: true
          });
        }

        // ===============================================
        // TIMEOUT
        // ===============================================

        if (
          commandName ===
          "timeout"
        ) {

          if (
            !hasPermission(
              interaction,
              PermissionsBitField.Flags.ModerateMembers
            )
          ) {

            return interaction.reply({
              content:
                "❌ Timeout yetkin yok.",
              ephemeral: true
            });
          }

          const user =
            interaction.options.getUser(
              "kullanici"
            );

          const minutes =
            interaction.options.getInteger(
              "dakika"
            );

          const reason =
            interaction.options.getString(
              "sebep"
            ) ||
            "Sebep belirtilmedi.";

          const member =
            await interaction.guild.members
              .fetch(user.id)
              .catch(() => null);

          if (
            !member ||
            !member.moderatable
          ) {

            return interaction.reply({
              content:
                "❌ Bu kullanıcıya timeout uygulayamıyorum.",
              ephemeral: true
            });
          }

          await member.timeout(
            minutes * 60 * 1000,
            reason
          );

          await sendLog(
            interaction.guild,
            `⏱️ ${user} ${minutes} dakika timeout aldı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}`
          );

          return interaction.reply({
            content:
              `⏱️ ${user.tag} ${minutes} dakika timeout aldı.`,
            ephemeral: true
          });
        }

        // ===============================================
        // WARN
        // ===============================================

        if (
          commandName === "warn"
        ) {

          if (
            !hasPermission(
              interaction,
              PermissionsBitField.Flags.ModerateMembers
            )
          ) {

            return interaction.reply({
              content:
                "❌ Warn yetkin yok.",
              ephemeral: true
            });
          }

          const user =
            interaction.options.getUser(
              "kullanici"
            );

          const reason =
            interaction.options.getString(
              "sebep"
            );

          const config =
            getServerConfig(
              interaction.guildId
            );

          config.warnings ??= {};

          if (
            !config.warnings[user.id]
          ) {
            config.warnings[
              user.id
            ] = [];
          }

          config.warnings[
            user.id
          ].push({
            reason,
            moderator:
              interaction.user.id,
            date: Date.now()
          });

          saveServerConfig(
            interaction.guildId,
            config
          );

          const count =
            config.warnings[
              user.id
            ].length;

          await sendLog(
            interaction.guild,
            `⚠️ ${user} uyarıldı.\n**Yetkili:** ${interaction.user}\n**Sebep:** ${reason}\n**Toplam uyarı:** ${count}`
          );

          return interaction.reply({
            content:
              `⚠️ ${user.tag} uyarıldı.\nToplam uyarı: **${count}**`,
            ephemeral: true
          });
        }

        // ===============================================
        // CLEAR
        // ===============================================

        if (
          commandName ===
          "clear"
        ) {

          if (
            !hasPermission(
              interaction,
              PermissionsBitField.Flags.ManageMessages
            )
          ) {

            return interaction.reply({
              content:
                "❌ Mesaj yönetme yetkin yok.",
              ephemeral: true
            });
          }

          const amount =
            interaction.options.getInteger(
              "miktar"
            );

          await interaction.deferReply({
            ephemeral: true
          });

          const deleted =
            await interaction.channel.bulkDelete(
              amount,
              true
            );

          return interaction.editReply({
            content:
              `🧹 ${deleted.size} mesaj temizlendi.`
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
                "`/setup-durum` ile durumu görebilirsin."
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
                "❌ Streamer rolü bulunamadı.",
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
              "❌ İşlem sırasında bir hata oluştu.",
            ephemeral: true
          })
          .catch(() => {});

      } else {

        await interaction
          .reply({
            content:
              "❌ İşlem sırasında bir hata oluştu.",
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

      // -----------------------------------------------
      // KAYITSIZ ROL
      // -----------------------------------------------

      if (
        config.registration
          ?.unregisteredRoleId
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

      await handleXp(message);

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

    if (!client.isReady()) {
      return;
    }

    for (
      const guild
      of client.guilds.cache.values()
    ) {

      const config =
        getServerConfig(
          guild.id
        );

      if (
        !config.stats?.enabled
      ) {
        continue;
      }

      await updateServerStats(
        guild
      );
    }

  },
  5 * 60 * 1000
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
);