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
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ======================================================
// CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
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

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(data, null, 2)
  );
}

function defaultConfig() {
  return {
    setupCompleted: false,
    setupType: null,
    channelStyle: "emoji",
    categoryStyle: "emoji",
    selectedCategories: [],
    features: [],
    voiceCount: 4,
    setupDate: null,

    createdIds: {
      categories: [],
      channels: [],
      roles: []
    },

    roles: {
      admin: null,
      staff: null,
      support: null,
      registration: null,
      streamer: null,
      member: null,
      unregistered: null,
      booster: null,
      bot: null
    },

    channels: {
      log: null
    },

    welcome: {
      enabled: false,
      channelId: null,
      autoRoleId: null
    },

    ticket: {
      categoryId: null,
      staffRoleId: null
    },

    registration: {
      unregisteredRoleId: null,
      registeredRoleId: null,
      staffRoleId: null
    },

    warnings: {},
    tickets: {}
  };
}

function getServerConfig(guildId) {
  const data = loadData();

  if (!data[guildId]) {
    data[guildId] = defaultConfig();
    saveData(data);
  }

  return data[guildId];
}

function saveServerConfig(guildId, config) {
  const data = loadData();
  data[guildId] = config;
  saveData(data);
}

// ======================================================
// SETUP SESSIONS
// ======================================================

const setupSessions = new Map();

function sessionKey(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function getSession(interaction) {
  return setupSessions.get(sessionKey(interaction));
}

function setSession(interaction, data) {
  setupSessions.set(sessionKey(interaction), data);
}

function deleteSession(interaction) {
  setupSessions.delete(sessionKey(interaction));
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

function formatChannelName(name, style) {
  if (style === "plain") {
    return name.toLowerCase();
  }

  const emoji = channelEmojis[name] || "📄";
  return `${emoji}・${name}`;
}

function formatCategoryName(category, style) {
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
// PERMISSION HELPERS
// ======================================================

function isAdmin(interaction) {
  return (
    interaction.guild?.ownerId === interaction.user.id ||
    interaction.memberPermissions?.has(
      PermissionsBitField.Flags.Administrator
    )
  );
}

function hasPermission(interaction, permission) {
  return (
    isAdmin(interaction) ||
    interaction.memberPermissions?.has(permission)
  );
}

function hasRole(member, roleId) {
  return Boolean(
    roleId &&
    member?.roles?.cache?.has(roleId)
  );
}

function canRegister(interaction, config) {
  return (
    isAdmin(interaction) ||
    hasRole(
      interaction.member,
      config.registration?.staffRoleId
    )
  );
}

// ======================================================
// LOG
// ======================================================

async function sendLog(guild, message) {
  try {
    const config = getServerConfig(guild.id);

    if (!config.channels?.log) return;

    const channel = await guild.channels
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
// ROLE HELPERS
// ======================================================

async function findOrCreateRole(
  guild,
  name,
  permissions = []
) {
  let role = guild.roles.cache.find(
    r => r.name === name
  );

  if (role) return {
    role,
    created: false
  };

  role = await guild.roles.create({
    name,
    permissions
  });

  return {
    role,
    created: true
  };
}

// ======================================================
// SETUP MENUS
// ======================================================

function createSetupMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_type")
      .setPlaceholder("Sunucu türünü seç")
      .addOptions(
        {
          label: "Gaming",
          description: "Oyun sunucusu",
          value: "gaming",
          emoji: "🎮"
        },
        {
          label: "Community",
          description: "Topluluk sunucusu",
          value: "community",
          emoji: "👥"
        },
        {
          label: "Streamer",
          description: "Yayıncı sunucusu",
          value: "streamer",
          emoji: "🎥"
        },
        {
          label: "Public",
          description: "Genel public sunucu",
          value: "public",
          emoji: "🌐"
        },
        {
          label: "Shop",
          description: "Mağaza sunucusu",
          value: "shop",
          emoji: "🛒"
        },
        {
          label: "Education",
          description: "Eğitim sunucusu",
          value: "education",
          emoji: "🎓"
        },
        {
          label: "Clan / Team",
          description: "Takım ve clan sunucusu",
          value: "clan",
          emoji: "🏆"
        }
      )
  );
}

function createChannelStyleMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_channel_style")
      .setPlaceholder("Kanal stilini seç")
      .addOptions(
        {
          label: "Emoji'li",
          description: "💬・sohbet",
          value: "emoji",
          emoji: "💬"
        },
        {
          label: "Emojisiz",
          description: "sohbet",
          value: "plain",
          emoji: "⚪"
        }
      )
  );
}

function createCategoryStyleMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_category_style")
      .setPlaceholder("Kategori stilini seç")
      .addOptions(
        {
          label: "Emoji + Büyük Harf",
          description: "📌 BİLGİ",
          value: "emoji",
          emoji: "📁"
        },
        {
          label: "Köşeli",
          description: "「 BİLGİ 」",
          value: "brackets",
          emoji: "🔲"
        },
        {
          label: "Çizgili",
          description: "━━ BİLGİ ━━",
          value: "lines",
          emoji: "📏"
        },
        {
          label: "Sade",
          description: "BİLGİ",
          value: "plain",
          emoji: "⚪"
        }
      )
  );
}

function createCategorySelectMenu(session) {
  const template = templates[session.type];

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_categories")
      .setPlaceholder("Oluşturulacak kategorileri seç")
      .setMinValues(1)
      .setMaxValues(
        Math.min(template.categories.length, 7)
      )
      .addOptions(
        template.categories.map(category => ({
          label: category.name,
          description: `${category.channels.length} yazı kanalı`,
          value: category.name,
          emoji: category.emoji
        }))
      )
  );
}

function createFeatureMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_features")
      .setPlaceholder("Ek sistemleri seç")
      .setMinValues(0)
      .setMaxValues(4)
      .addOptions(
        {
          label: "Ticket",
          description: "Ticket sistemi",
          value: "ticket",
          emoji: "🎫"
        },
        {
          label: "Kayıt",
          description: "Yetkili kayıt sistemi",
          value: "registration",
          emoji: "📝"
        },
        {
          label: "Hoş Geldin",
          description: "Hoş geldin sistemi",
          value: "welcome",
          emoji: "👋"
        },
        {
          label: "Roller",
          description: "Builder rollerini oluştur",
          value: "roles",
          emoji: "🎭"
        }
      )
  );
}

function createVoiceCountMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_voice_count")
      .setPlaceholder("Ses kanalı sayısını seç")
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

function createSetupSummary(session) {
  const template = templates[session.type];

  let channels = 0;

  for (const category of template.categories) {
    if (
      !session.selectedCategories.includes(
        category.name
      )
    ) {
      continue;
    }

    for (const channel of category.channels) {
      if (
        !session.features.includes("ticket") &&
        channel === "ticket"
      ) continue;

      if (
        !session.features.includes("registration") &&
        [
          "kayıt",
          "kayıt-bilgi",
          "kayıt-log",
          "rol-seçim"
        ].includes(channel)
      ) continue;

      if (
        !session.features.includes("welcome") &&
        channel === "hoşgeldin"
      ) continue;

      channels++;
    }

    if (category.voice) {
      channels += Math.min(
        category.voice.length,
        session.voiceCount || 4
      );
    }
  }

  const roles = session.features.includes("roles")
    ? template.roles.length
    : 0;

  return [
    "## 🏗️ Endless Builder",
    "",
    `> **Sunucu türü:** ${template.emoji} ${template.name}`,
    `> **Kategori:** ${session.selectedCategories.length}`,
    `> **Kanal:** ${channels}`,
    `> **Rol:** ${roles}`,
    `> **Ticket:** ${session.features.includes("ticket") ? "Açık" : "Kapalı"}`,
    `> **Kayıt:** ${session.features.includes("registration") ? "Açık" : "Kapalı"}`,
    `> **Hoş Geldin:** ${session.features.includes("welcome") ? "Açık" : "Kapalı"}`,
    `> **Ses:** ${session.voiceCount || 4}`,
    `> **Kanal stili:** ${session.channelStyle}`,
    `> **Kategori stili:** ${session.categoryStyle}`,
    "",
    "Ayarlar doğruysa **Oluştur** butonuna bas."
  ].join("\n");
}

// ======================================================
// BUTTONS
// ======================================================

function createSetupButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup_create")
      .setLabel("Oluştur")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🚀"),

    new ButtonBuilder()
      .setCustomId("setup_cancel")
      .setLabel("İptal")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );
}

// ======================================================
// BUILDER CLEANUP - ID BASED
// ======================================================

async function removeBuilderStructure(guild) {
  const config = getServerConfig(guild.id);

  const ids = config.createdIds || {
    categories: [],
    channels: [],
    roles: []
  };

  let deleted = 0;

  for (const channelId of [
    ...(ids.channels || []),
    ...(ids.categories || [])
  ]) {
    const channel = await guild.channels
      .fetch(channelId)
      .catch(() => null);

    if (!channel) continue;

    await channel.delete(
      "Endless Builder setup değiştirildi"
    ).catch(() => {});

    deleted++;
  }

  for (const roleId of ids.roles || []) {
    const role = await guild.roles
      .fetch(roleId)
      .catch(() => null);

    if (!role || role.managed) continue;

    await role.delete(
      "Endless Builder setup değiştirildi"
    ).catch(() => {});

    deleted++;
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
  const template = templates[type];

  if (!template) {
    throw new Error("Geçersiz sunucu türü.");
  }

  const config = getServerConfig(guild.id);

  config.createdIds = {
    categories: [],
    channels: [],
    roles: []
  };

  config.roles = config.roles || {};

  let categoriesCreated = 0;
  let channelsCreated = 0;
  let rolesCreated = 0;

  // --------------------------------------------------
  // ROLES
  // --------------------------------------------------

  if (settings.features.includes("roles")) {

    for (const roleName of template.roles) {

      let permissions = [];

      if (roleName.includes("Yönetici")) {
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

      if (roleName.includes("Yetkili")) {
        permissions = [
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.ModerateMembers,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.ViewAuditLog
        ];
      }

      const existing = guild.roles.cache.find(
        r => r.name === roleName
      );

      if (existing) {

        if (roleName.includes("Yönetici")) {
          config.roles.admin = existing.id;
        }

        if (roleName.includes("Yetkili")) {
          config.roles.staff = existing.id;
        }

        if (roleName.includes("Destek")) {
          config.roles.support = existing.id;
        }

        if (roleName.includes("Kayıt")) {
          config.roles.registration = existing.id;
        }

        if (roleName.includes("Streamer")) {
          config.roles.streamer = existing.id;
        }

        if (
          roleName === "👤 Üye" ||
          roleName === "👤 Müşteri" ||
          roleName === "📚 Öğrenci"
        ) {
          config.roles.member = existing.id;
        }

        if (roleName === "🤖 Bot") {
          config.roles.bot = existing.id;
        }

        continue;
      }

      const role = await guild.roles.create({
        name: roleName,
        permissions
      });

      config.createdIds.roles.push(role.id);
      rolesCreated++;

      if (roleName.includes("Yönetici")) {
        config.roles.admin = role.id;
      }

      if (roleName.includes("Yetkili")) {
        config.roles.staff = role.id;
      }

      if (roleName.includes("Destek")) {
        config.roles.support = role.id;
      }

      if (roleName.includes("Kayıt")) {
        config.roles.registration = role.id;
      }

      if (roleName.includes("Streamer")) {
        config.roles.streamer = role.id;
      }

      if (
        roleName === "👤 Üye" ||
        roleName === "👤 Müşteri" ||
        roleName === "📚 Öğrenci"
      ) {
        config.roles.member = role.id;
      }

      if (roleName === "🤖 Bot") {
        config.roles.bot = role.id;
      }
    }
  }

  // --------------------------------------------------
  // UNREGISTERED ROLE
  // --------------------------------------------------

  if (
    settings.features.includes("registration")
  ) {
    let unregistered = guild.roles.cache.find(
      r => r.name === "🔒 Kayıtsız"
    );

    if (!unregistered) {
      unregistered = await guild.roles.create({
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
      unregisteredRoleId: unregistered.id,
      registeredRoleId: config.roles.member,
      staffRoleId:
        config.roles.registration ||
        config.roles.staff
    };
  }

  // --------------------------------------------------
  // CATEGORIES + CHANNELS
  // --------------------------------------------------

  for (const category of template.categories) {

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

    for (const channelName of category.channels) {

      if (
        channelName === "ticket" &&
        !settings.features.includes("ticket")
      ) continue;

      if (
        [
          "kayıt",
          "kayıt-bilgi",
          "kayıt-log",
          "rol-seçim"
        ].includes(channelName) &&
        !settings.features.includes("registration")
      ) continue;

      if (
        channelName === "hoşgeldin" &&
        !settings.features.includes("welcome")
      ) continue;

      const finalName =
        formatChannelName(
          channelName,
          settings.channelStyle
        );

      const existing =
        guild.channels.cache.find(
          c =>
            c.type === ChannelType.GuildText &&
            c.name === finalName &&
            c.parentId === discordCategory.id
        );

      if (existing) continue;

      const channel =
        await guild.channels.create({
          name: finalName,
          type: ChannelType.GuildText,
          parent: discordCategory.id
        });

      config.createdIds.channels.push(
        channel.id
      );

      channelsCreated++;

      if (channelName === "log") {
        config.channels.log = channel.id;
      }

      if (
        channelName === "kayıt" &&
        settings.features.includes("registration")
      ) {
        config.registrationPanelChannel =
          channel.id;
      }

      if (
        channelName === "hoşgeldin" &&
        settings.features.includes("welcome")
      ) {
        config.welcome.channelId =
          channel.id;
      }

      if (
        channelName === "ticket" &&
        settings.features.includes("ticket")
      ) {
        config.ticketPanelChannel =
          channel.id;
      }
    }

    // VOICE CHANNELS

    if (category.voice) {

      const voiceLimit = Math.min(
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
            type: ChannelType.GuildVoice,
            parent: discordCategory.id
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
    settings.features.includes("ticket")
  ) {

    const ticketCategory =
      guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildCategory &&
          (
            c.name.includes("DESTEK") ||
            c.name.includes("DESTEK")
          )
      );

    if (ticketCategory) {
      config.ticket.categoryId =
        ticketCategory.id;
    }

    config.ticket.staffRoleId =
      config.roles.support ||
      config.roles.staff;
  }

  // --------------------------------------------------
  // WELCOME CONFIG
  // --------------------------------------------------

  if (
    settings.features.includes("welcome")
  ) {
    config.welcome.enabled = true;
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
    .setName("ban")
    .setDescription(
      "Kullanıcıyı sunucudan yasakla"
    )
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription("Kullanıcı")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription("Sebep")
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
        .setDescription("Kullanıcı")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription("Sebep")
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
        .setDescription("Kullanıcı")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("dakika")
        .setDescription("Dakika")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription("Sebep")
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
        .setDescription("Kullanıcı")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription("Sebep")
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
        .setDescription("1-100")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )

].map(command => command.toJSON());

// ======================================================
// READY
// ======================================================

client.once("ready", async () => {

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
});

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

        if (commandName === "setup") {

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (config.setupCompleted) {

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
              changing: false
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

          if (!config.setupCompleted) {

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
              oldType: config.setupType
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

          if (!config.setupCompleted) {

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
              `**Tür:** ${template?.emoji || "📦"} ${template?.name || config.setupType}`,
              `**Kategoriler:** ${config.selectedCategories?.length || 0}`,
              `**Kayıt:** ${config.features?.includes("registration") ? "🟢" : "🔴"}`,
              `**Ticket:** ${config.features?.includes("ticket") ? "🟢" : "🔴"}`,
              `**Hoş Geldin:** ${config.features?.includes("welcome") ? "🟢" : "🔴"}`,
              `**Ses:** ${config.voiceCount || 4}`,
              `**Kanal stili:** ${config.channelStyle}`,
              `**Kategori stili:** ${config.categoryStyle}`,
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
            components: [row],
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

          if (!config.ticket.categoryId) {

            return interaction.reply({
              content:
                "❌ Ticket sistemi kurulu değil. Önce `/setup-degistir` ile Ticket özelliğini aç.",
              ephemeral: true
            });
          }

          const row =
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    "eb_ticket_open"
                  )
                  .setLabel(
                    "Ticket Aç"
                  )
                  .setStyle(
                    ButtonStyle.Primary
                  )
                  .setEmoji("🎫")
              );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🎫 Destek Sistemi"
                )
                .setDescription(
                  "Destek almak için aşağıdaki butona basarak ticket oluşturabilirsin."
                )
                .setColor(0x5865f2)
            ],
            components: [row]
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
                .setColor(0x57f287)
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
            config.registration?.registeredRoleId;

          const unregisteredRole =
            config.registration?.unregisteredRoleId;

          if (unregisteredRole) {
            await member.roles
              .remove(unregisteredRole)
              .catch(() => {});
          }

          if (registeredRole) {
            await member.roles
              .add(registeredRole)
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
                .setColor(0xff4ecd)
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
            channelId: channel.id,
            autoRoleId: role?.id || null
          };

          saveServerConfig(
            interaction.guildId,
            config
          );

          return interaction.reply({
            content:
              `✅ Hoş geldin sistemi ayarlandı.\n` +
              `📢 Kanal: ${channel}\n` +
              `🎭 Rol: ${role || "Yok"}`,
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
        // BAN
        // ===============================================

        if (
          commandName ===
          "ban"
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
            ) || "Sebep belirtilmedi.";

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
          commandName ===
          "kick"
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
            ) || "Sebep belirtilmedi.";

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

          await member.kick(reason);

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
            ) || "Sebep belirtilmedi.";

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
          commandName ===
          "warn"
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

          if (!config.warnings) {
            config.warnings = {};
          }

          if (!config.warnings[user.id]) {
            config.warnings[user.id] = [];
          }

          config.warnings[user.id].push({
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
            config.warnings[user.id].length;

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
      // SELECT MENUS
      // =================================================

      if (
        interaction.isStringSelectMenu()
      ) {

        // ===============================================
        // SETUP TYPE
        // ===============================================

        if (
          interaction.customId ===
          "setup_type"
        ) {

          const session =
            getSession(interaction);

          if (!session) {
            return interaction.reply({
              content:
                "❌ Setup oturumun bulunamadı. `/setup` ile tekrar başla.",
              ephemeral: true
            });
          }

          const type =
            interaction.values[0];

          if (!templates[type]) {
            return interaction.reply({
              content:
                "❌ Geçersiz sunucu türü.",
              ephemeral: true
            });
          }

          session.type = type;

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
            getSession(interaction);

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
            getSession(interaction);

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
            getSession(interaction);

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
            getSession(interaction);

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
        // VOICE COUNT
        // ===============================================

        if (
          interaction.customId ===
          "setup_voice_count"
        ) {

          const session =
            getSession(interaction);

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
        // SETUP CREATE
        // ===============================================

        if (
          interaction.customId ===
          "setup_create"
        ) {

          const session =
            getSession(interaction);

          if (!session) {

            return interaction.reply({
              content:
                "❌ Setup oturumun bulunamadı.",
              ephemeral: true
            });
          }

          if (
            !session.type ||
            !session.selectedCategories
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
            session.features.includes("roles") &&
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

            if (session.changing) {
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

            config.setupCompleted = true;
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

          if (!isAdmin(interaction)) {
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
            [...interaction.guild.channels.cache.values()];

          let deleted = 0;

          // Önce çocuk kanallar
          for (
            const channel of channels
          ) {

            if (
              channel.type ===
              ChannelType.GuildCategory
            ) {
              continue;
            }

            await channel.delete(
              "Sunucu temizleme"
            ).then(() => {
              deleted++;
            }).catch(() => {});
          }

          // Sonra kategoriler
          for (
            const channel of channels
          ) {

            if (
              channel.type !==
              ChannelType.GuildCategory
            ) {
              continue;
            }

            await channel.delete(
              "Sunucu temizleme"
            ).then(() => {
              deleted++;
            }).catch(() => {});
          }

          const config =
            getServerConfig(
              interaction.guildId
            );

          config.setupCompleted = false;
          config.setupType = null;
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
            staffRoleId: null
          };

          config.welcome = {
            enabled: false,
            channelId: null,
            autoRoleId: null
          };

          saveServerConfig(
            interaction.guildId,
            config
          );

          try {

            await interaction.editReply({
              content:
                `🧹 Temizleme tamamlandı.\n\n**Silinen kanal:** ${deleted}`,
              components: []
            });

          } catch {}
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
                r => r.name === "🎥 Streamer"
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

          await interaction.member.roles.add(
            role
          );

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
        // TICKET OPEN
        // ===============================================

        if (
          interaction.customId ===
          "eb_ticket_open"
        ) {

          const config =
            getServerConfig(
              interaction.guildId
            );

          if (!config.tickets) {
            config.tickets = {};
          }

          const existingId =
            config.tickets[
              interaction.user.id
            ];

          if (existingId) {

            const existing =
              interaction.guild.channels.cache.get(
                existingId
              );

            if (existing) {
              return interaction.reply({
                content:
                  `❌ Zaten açık ticketın var: ${existing}`,
                ephemeral: true
              });
            }

            delete config.tickets[
              interaction.user.id
            ];
          }

          const category =
            config.ticket?.categoryId
              ? interaction.guild.channels.cache.get(
                  config.ticket.categoryId
                )
              : null;

          if (!category) {

            return interaction.reply({
              content:
                "❌ Ticket kategorisi bulunamadı.",
              ephemeral: true
            });
          }

          const staffRole =
            config.ticket?.staffRoleId
              ? interaction.guild.roles.cache.get(
                  config.ticket.staffRoleId
                )
              : null;

          const channel =
            await interaction.guild.channels.create({
              name:
                `ticket-${interaction.user.username}`
                  .toLowerCase()
                  .replace(
                    /[^a-z0-9-_]/g,
                    ""
                  )
                  .slice(0, 20),

              type: ChannelType.GuildText,

              parent: category.id,

              permissionOverwrites: [
                {
                  id:
                    interaction.guild.roles.everyone.id,
                  deny: [
                    PermissionsBitField.Flags.ViewChannel
                  ]
                },
                {
                  id:
                    interaction.user.id,
                  allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                  ]
                },
                ...(staffRole
                  ? [{
                      id: staffRole.id,
                      allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                      ]
                    }]
                  : [])
              ]
            });

          config.tickets[
            interaction.user.id
          ] = channel.id;

          saveServerConfig(
            interaction.guildId,
            config
          );

          const closeRow =
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    "eb_ticket_close"
                  )
                  .setLabel(
                    "Ticket Kapat"
                  )
                  .setStyle(
                    ButtonStyle.Danger
                  )
                  .setEmoji("🔒")
              );

          await channel.send({
            content:
              `${interaction.user} ticketın oluşturuldu.`,
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🎫 Destek Ticket"
                )
                .setDescription(
                  "Yetkili ekibimiz kısa sürede yardımcı olacaktır."
                )
                .setColor(0x5865f2)
            ],
            components: [
              closeRow
            ]
          });

          await sendLog(
            interaction.guild,
            `🎫 ${interaction.user} ticket açtı: ${channel}`
          );

          return interaction.reply({
            content:
              `✅ Ticket oluşturuldu: ${channel}`,
            ephemeral: true
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
            config.ticket?.staffRoleId;

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

          await interaction.reply({
            content:
              "🔒 Ticket kapatılıyor..."
          });

          if (owner) {
            delete config.tickets[
              owner[0]
            ];
          }

          saveServerConfig(
            interaction.guildId,
            config
          );

          await sendLog(
            interaction.guild,
            `🔒 Ticket kapatıldı.\n**Kanal:** ${interaction.channel.name}\n**Kapatan:** ${interaction.user}`
          );

          setTimeout(
            () => {
              interaction.channel
                .delete(
                  "Ticket kapatıldı"
                )
                .catch(() => {});
            },
            1500
          );
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
      // KAYITSIZ ROLÜ
      // -----------------------------------------------

      if (
        config.registration?.unregisteredRoleId
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
        config.welcome?.autoRoleId
      ) {

        const role =
          member.guild.roles.cache.get(
            config.welcome.autoRoleId
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
            config.welcome.channelId
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
                .setColor(0x57f287)
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

    } catch (error) {

      console.error(
        "MEMBER JOIN ERROR:",
        error
      );
    }
  }
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

if (!process.env.DISCORD_TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN bulunamadı."
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);