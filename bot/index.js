const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
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
    return JSON.parse(
      fs.readFileSync(dataFile, "utf8")
    );
  } catch (error) {
    console.error("Data okuma hatası:", error);
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(data, null, 2)
  );
}

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
    label: "Gaming",
    emoji: "🎮",

    categories: [

      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"],
          ["sunucu-istatistik", "text"]
        ]
      },

      {
        name: "KAYIT",
        emoji: "📝",
        channels: [
          ["kayıt", "text"],
          ["kayıt-bilgi", "text"],
          ["kayıt-log", "text"],
          ["rol-seçim", "text"]
        ]
      },

      {
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["bot-komutları", "text"],
          ["medya", "text"],
          ["fotoğraf", "text"],
          ["mizah", "text"],
          ["öneriler", "text"],
          ["anketler", "text"]
        ]
      },

      {
        name: "OYUN",
        emoji: "🎮",
        channels: [
          ["oyun-sohbet", "text"],
          ["oyuncu-arama", "text"],
          ["etkinlikler", "text"],
          ["turnuvalar", "text"],
          ["çekilişler", "text"],
          ["Genel", "voice"],
          ["Oyun 1", "voice"],
          ["Oyun 2", "voice"]
        ]
      },

      {
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["destek", "text"],
          ["yardım", "text"],
          ["sık-sorulanlar", "text"]
        ]
      },

      {
        name: "SES",
        emoji: "🔊",
        channels: [
          ["Genel", "voice"],
          ["Sohbet 1", "voice"],
          ["Sohbet 2", "voice"],
          ["Müzik", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        name: "YÖNETİM",
        emoji: "👑",
        channels: [
          ["yetkili", "text"],
          ["log", "text"],
          ["ceza-log", "text"],
          ["bot-log", "text"],
          ["istatistik", "text"]
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

  // ====================================================

  community: {
    label: "Community",
    emoji: "👥",

    categories: [

      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"],
          ["hoşgeldin", "text"],
          ["sunucu-istatistik", "text"]
        ]
      },

      {
        name: "KAYIT",
        emoji: "📝",
        channels: [
          ["kayıt", "text"],
          ["kayıt-bilgi", "text"],
          ["kayıt-log", "text"],
          ["rol-seçim", "text"]
        ]
      },

      {
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["bot-komutları", "text"],
          ["medya", "text"],
          ["fotoğraf", "text"],
          ["mizah", "text"],
          ["öneriler", "text"],
          ["anketler", "text"]
        ]
      },

      {
        name: "OYUN",
        emoji: "🎮",
        channels: [
          ["oyun-sohbet", "text"],
          ["oyuncu-arama", "text"],
          ["etkinlikler", "text"],
          ["çekilişler", "text"],
          ["Genel", "voice"],
          ["Oyun 1", "voice"],
          ["Oyun 2", "voice"]
        ]
      },

      {
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["destek", "text"],
          ["yardım", "text"],
          ["sık-sorulanlar", "text"]
        ]
      },

      {
        name: "SES",
        emoji: "🔊",
        channels: [
          ["Genel", "voice"],
          ["Sohbet 1", "voice"],
          ["Sohbet 2", "voice"],
          ["Müzik", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        name: "YÖNETİM",
        emoji: "👑",
        channels: [
          ["yetkili", "text"],
          ["log", "text"],
          ["ceza-log", "text"],
          ["bot-log", "text"],
          ["istatistik", "text"]
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

  // ====================================================

  streamer: {
    label: "Streamer",
    emoji: "🎥",

    categories: [

      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"]
        ]
      },

      {
        name: "STREAMER",
        emoji: "🎥",
        channels: [
          ["yayın-duyuruları", "text"],
          ["yayıncı-sohbet", "text"],
          ["streamer-başvuru", "text"],
          ["içerik-paylaşım", "text"],
          ["yayın-programı", "text"],
          ["yayıncılar", "text"],
          ["çekilişler", "text"]
        ]
      },

      {
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["medya", "text"],
          ["klipler", "text"],
          ["bot-komutları", "text"],
          ["öneriler", "text"]
        ]
      },

      {
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["destek", "text"],
          ["yardım", "text"]
        ]
      },

      {
        name: "SES",
        emoji: "🔊",
        channels: [
          ["Genel", "voice"],
          ["Yayın Odası", "voice"],
          ["Yayıncı Odası", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        name: "YÖNETİM",
        emoji: "👑",
        channels: [
          ["yetkili", "text"],
          ["log", "text"],
          ["başvuru-log", "text"],
          ["bot-log", "text"]
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

  // ====================================================

  public: {
    label: "Public",
    emoji: "🌐",

    categories: [

      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"],
          ["hoşgeldin", "text"],
          ["sunucu-istatistik", "text"]
        ]
      },

      {
        name: "KAYIT",
        emoji: "📝",
        channels: [
          ["kayıt", "text"],
          ["kayıt-bilgi", "text"],
          ["kayıt-log", "text"],
          ["rol-seçim", "text"]
        ]
      },

      {
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["bot-komutları", "text"],
          ["medya", "text"],
          ["mizah", "text"],
          ["fotoğraf", "text"],
          ["öneriler", "text"]
        ]
      },

      {
        name: "OYUN",
        emoji: "🎮",
        channels: [
          ["oyun-sohbet", "text"],
          ["oyuncu-arama", "text"],
          ["etkinlikler", "text"],
          ["turnuvalar", "text"],
          ["çekilişler", "text"],
          ["Genel", "voice"],
          ["Oyun 1", "voice"],
          ["Oyun 2", "voice"]
        ]
      },

      {
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["destek", "text"],
          ["yardım", "text"],
          ["sık-sorulanlar", "text"]
        ]
      },

      {
        name: "SES",
        emoji: "🔊",
        channels: [
          ["Genel", "voice"],
          ["Sohbet 1", "voice"],
          ["Sohbet 2", "voice"],
          ["Oyun Odası", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        name: "YÖNETİM",
        emoji: "👑",
        channels: [
          ["yetkili", "text"],
          ["log", "text"],
          ["ceza-log", "text"],
          ["bot-log", "text"],
          ["istatistik", "text"]
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

  // ====================================================

  shop: {
    label: "Shop",
    emoji: "🛒",

    categories: [

      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"]
        ]
      },

      {
        name: "MAĞAZA",
        emoji: "🛒",
        channels: [
          ["mağaza", "text"],
          ["ürünler", "text"],
          ["kampanyalar", "text"],
          ["indirimler", "text"],
          ["siparişler", "text"]
        ]
      },

      {
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["medya", "text"],
          ["öneriler", "text"]
        ]
      },

      {
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["destek", "text"],
          ["sipariş-destek", "text"],
          ["yardım", "text"]
        ]
      },

      {
        name: "SES",
        emoji: "🔊",
        channels: [
          ["Genel", "voice"],
          ["Destek", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        name: "YÖNETİM",
        emoji: "👑",
        channels: [
          ["yetkili", "text"],
          ["log", "text"],
          ["sipariş-log", "text"],
          ["bot-log", "text"]
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

  // ====================================================

  education: {
    label: "Education",
    emoji: "🎓",

    categories: [

      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"],
          ["takvim", "text"]
        ]
      },

      {
        name: "DERSLER",
        emoji: "📚",
        channels: [
          ["genel-ders", "text"],
          ["matematik", "text"],
          ["türkçe", "text"],
          ["fen", "text"],
          ["sosyal", "text"],
          ["ödev-yardım", "text"]
        ]
      },

      {
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["soru-cevap", "text"],
          ["kaynaklar", "text"],
          ["öneriler", "text"]
        ]
      },

      {
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["yardım", "text"],
          ["öğretmen-destek", "text"]
        ]
      },

      {
        name: "SES SINIFLARI",
        emoji: "🔊",
        channels: [
          ["Ders Odası 1", "voice"],
          ["Ders Odası 2", "voice"],
          ["Çalışma Odası", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        name: "YÖNETİM",
        emoji: "👑",
        channels: [
          ["yetkili", "text"],
          ["öğretmen", "text"],
          ["log", "text"],
          ["bot-log", "text"]
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

  // ====================================================

  clan: {
    label: "Clan / Team",
    emoji: "🏆",

    categories: [

      {
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"]
        ]
      },

      {
        name: "TAKIM",
        emoji: "🏆",
        channels: [
          ["takım-sohbet", "text"],
          ["kadromuz", "text"],
          ["antrenman", "text"],
          ["maçlar", "text"],
          ["turnuvalar", "text"],
          ["sonuçlar", "text"]
        ]
      },

      {
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["medya", "text"],
          ["klipler", "text"],
          ["öneriler", "text"]
        ]
      },

      {
        name: "BAŞVURU",
        emoji: "📝",
        channels: [
          ["oyuncu-başvuru", "text"],
          ["yetkili-başvuru", "text"],
          ["başvuru-bilgi", "text"]
        ]
      },

      {
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["destek", "text"],
          ["yardım", "text"]
        ]
      },

      {
        name: "SES",
        emoji: "🔊",
        channels: [
          ["Genel", "voice"],
          ["Takım 1", "voice"],
          ["Takım 2", "voice"],
          ["Antrenman", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        name: "YÖNETİM",
        emoji: "👑",
        channels: [
          ["yetkili", "text"],
          ["log", "text"],
          ["maç-log", "text"],
          ["başvuru-log", "text"]
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
// KANAL EMOJİLERİ
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
// FORMAT
// ======================================================

function formatChannelName(name, style) {

  if (style === "plain") {
    return name.toLowerCase();
  }

  const emoji =
    channelEmojis[name] || "📄";

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
// MENÜLER
// ======================================================

function createSetupMenu() {

  return new StringSelectMenuBuilder()
    .setCustomId("setup_type")
    .setPlaceholder("Sunucu türünü seç...")

    .addOptions(
      {
        label: "Gaming",
        description: "Oyun ve oyuncu sunucusu",
        value: "gaming",
        emoji: "🎮"
      },
      {
        label: "Community",
        description: "Genel topluluk sunucusu",
        value: "community",
        emoji: "👥"
      },
      {
        label: "Streamer",
        description: "Yayıncı ve içerik üreticileri",
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
        description: "Mağaza ve müşteri sunucusu",
        value: "shop",
        emoji: "🛒"
      },
      {
        label: "Education",
        description: "Eğitim ve ders sunucusu",
        value: "education",
        emoji: "🎓"
      },
      {
        label: "Clan / Team",
        description: "Clan ve takım sunucusu",
        value: "clan",
        emoji: "🏆"
      }
    );
}

function createChannelStyleMenu() {

  return new StringSelectMenuBuilder()
    .setCustomId("setup_channel_style")
    .setPlaceholder("Kanal stilini seç...")

    .addOptions(
      {
        label: "Emoji'li",
        description: "💬・sohbet",
        value: "emoji",
        emoji: "✨"
      },
      {
        label: "Emojisiz",
        description: "sohbet",
        value: "plain",
        emoji: "⚪"
      }
    );
}

function createCategoryStyleMenu() {

  return new StringSelectMenuBuilder()
    .setCustomId("setup_category_style")
    .setPlaceholder("Kategori stilini seç...")

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
    );
}

// ======================================================
// ÖZET
// ======================================================

function createSummary(session) {

  const template =
    templates[session.type];

  let channelCount = 0;

  for (const category of template.categories) {
    channelCount += category.channels.length;
  }

  return (
    "╔══════════════════════════╗\n" +
    "       🛠️ ENDLESS BUILDER\n" +
    "╚══════════════════════════╝\n\n" +

    `🏷️ Sunucu: **${template.emoji} ${template.label}**\n` +
    `📁 Kategori: **${template.categories.length}**\n` +
    `💬 Kanal: **${channelCount}**\n` +
    `🎭 Rol: **${template.roles.length}**\n\n` +

    `✨ Kanal stili: **${
      session.channelStyle === "emoji"
        ? "Emoji'li"
        : "Emojisiz"
    }**\n` +

    `📂 Kategori stili: **${
      session.categoryStyle === "emoji"
        ? "Emoji + Büyük Harf"
        : session.categoryStyle === "brackets"
          ? "Köşeli"
          : session.categoryStyle === "lines"
            ? "Çizgili"
            : "Sade"
    }**\n\n` +

    "━━━━━━━━━━━━━━━━━━━━\n\n" +

    "🚀 Sunucuyu oluşturmak için aşağıdaki butona bas."
  );
}

// ======================================================
// SERVER BUILD
// ======================================================

async function buildServer(
  guild,
  type,
  settings
) {

  const template =
    templates[type];

  if (!template) {
    throw new Error("Şablon bulunamadı.");
  }

  const channelStyle =
    settings.channelStyle || "emoji";

  const categoryStyle =
    settings.categoryStyle || "emoji";

  let categoriesCreated = 0;
  let channelsCreated = 0;
  let rolesCreated = 0;

  // ====================================================
  // ROLLER
  // ====================================================

  for (const roleName of template.roles) {

    const existing =
      guild.roles.cache.find(
        role =>
          role.name === roleName
      );

    if (existing) continue;

    await guild.roles.create({
      name: roleName,
      reason: "Endless Builder"
    });

    rolesCreated++;
  }

  // ====================================================
  // KATEGORİLER
  // ====================================================

  for (
    const categoryData
    of template.categories
  ) {

    const categoryName =
      formatCategoryName(
        categoryData,
        categoryStyle
      );

    let category =
      guild.channels.cache.find(
        channel =>
          channel.type ===
            ChannelType.GuildCategory &&
          channel.name ===
            categoryName
      );

    if (!category) {

      category =
        await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
          reason: "Endless Builder"
        });

      categoriesCreated++;
    }

    // ================================================
    // KANALLAR
    // ================================================

    for (
      const [rawName, type]
      of categoryData.channels
    ) {

      const channelName =
        formatChannelName(
          rawName,
          channelStyle
        );

      const existing =
        guild.channels.cache.find(
          channel =>
            channel.name === channelName &&
            channel.parentId === category.id
        );

      if (existing) continue;

      await guild.channels.create({

        name: channelName,

        type:
          type === "voice"
            ? ChannelType.GuildVoice
            : ChannelType.GuildText,

        parent: category.id,

        reason: "Endless Builder"

      });

      channelsCreated++;
    }
  }

  return {
    categoriesCreated,
    channelsCreated,
    rolesCreated
  };
}

// ======================================================
// CLEANUP
// ======================================================

function getBuilderCategoryNames() {

  const names = new Set();

  for (
    const template
    of Object.values(templates)
  ) {

    for (
      const category
      of template.categories
    ) {

      names.add(category.name);

      names.add(
        `${category.emoji} ${category.name}`
      );

      names.add(
        `「 ${category.name} 」`
      );

      names.add(
        `━━ ${category.name} ━━`
      );
    }
  }

  return names;
}

async function removeBuilderStructure(guild) {

  const categoryNames =
    getBuilderCategoryNames();

  const categories =
    guild.channels.cache.filter(
      channel =>
        channel.type ===
          ChannelType.GuildCategory &&
        categoryNames.has(channel.name)
    );

  for (
    const category
    of categories.values()
  ) {

    const children =
      guild.channels.cache.filter(
        channel =>
          channel.parentId === category.id
      );

    for (
      const channel
      of children.values()
    ) {

      try {
        await channel.delete(
          "Endless Builder değişikliği"
        );
      } catch (error) {
        console.error(
          "Kanal silinemedi:",
          error.message
        );
      }
    }

    try {
      await category.delete(
        "Endless Builder değişikliği"
      );
    } catch (error) {
      console.error(
        "Kategori silinemedi:",
        error.message
      );
    }
  }

  // Roller

  const roleNames = new Set();

  for (
    const template
    of Object.values(templates)
  ) {

    for (
      const roleName
      of template.roles
    ) {
      roleNames.add(roleName);
    }
  }

  const roles =
    guild.roles.cache.filter(
      role =>
        roleNames.has(role.name) &&
        !role.managed
    );

  for (
    const role
    of roles.values()
  ) {

    try {

      await role.delete(
        "Endless Builder değişikliği"
      );

    } catch (error) {

      console.error(
        "Rol silinemedi:",
        error.message
      );

    }
  }
}

// ======================================================
// READY
// ======================================================

client.once(
  "clientReady",
  async () => {

    console.log(
      `✅ ${client.user.tag} aktif!`
    );

    try {

      await client.application.commands.set(

        [
          setupCommand.toJSON(),
          changeSetupCommand.toJSON(),
          setupStatusCommand.toJSON()
        ],

        process.env.GUILD_ID

      );

      console.log(
        "✅ Slash komutları hazır!"
      );

    } catch (error) {

      console.error(
        "❌ Slash komut hatası:",
        error
      );
    }
  }
);

// ======================================================
// INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {

    try {

      // ==================================================
      // CHAT COMMANDS
      // ==================================================

      if (
        interaction.isChatInputCommand()
      ) {

        // ================================================
        // SETUP
        // ================================================

        if (
          interaction.commandName ===
          "setup"
        ) {

          const data =
            loadData();

          const server =
            data[interaction.guildId];

          if (server?.setupCompleted) {

            return interaction.reply({

              content:
                "❌ **Bu sunucu zaten kurulmuş.**\n\n" +
                "Değiştirmek için:\n" +
                "`/setup-degistir`",

              ephemeral: true

            });
          }

          const row =
            new ActionRowBuilder()
              .addComponents(
                createSetupMenu()
              );

          return interaction.reply({

            content:
              "╔══════════════════════════╗\n" +
              "       🛠️ ENDLESS BUILDER\n" +
              "╚══════════════════════════╝\n\n" +

              "Sunucu türünü seç:\n\n" +

              "🎮 Gaming\n" +
              "👥 Community\n" +
              "🎥 Streamer\n" +
              "🌐 Public\n" +
              "🛒 Shop\n" +
              "🎓 Education\n" +
              "🏆 Clan / Team",

            components: [row],

            ephemeral: true

          });
        }

        // ================================================
        // SETUP DEĞİŞTİR
        // ================================================

        if (
          interaction.commandName ===
          "setup-degistir"
        ) {

          const data =
            loadData();

          const server =
            data[interaction.guildId];

          if (!server?.setupCompleted) {

            return interaction.reply({

              content:
                "❌ Bu sunucuda Builder kurulumu yok.\n\n" +
                "`/setup` kullan.",

              ephemeral: true

            });
          }

          const row =
            new ActionRowBuilder()
              .addComponents(
                createSetupMenu()
              );

          return interaction.reply({

            content:
              "⚠️ **Dikkat!**\n\n" +

              "Mevcut Builder yapısı temizlenip\n" +
              "yeni yapı oluşturulacak.\n\n" +

              "Yeni sunucu türünü seç:",

            components: [row],

            ephemeral: true

          });
        }

        // ================================================
        // SETUP DURUM
        // ================================================

        if (
          interaction.commandName ===
          "setup-durum"
        ) {

          const data =
            loadData();

          const server =
            data[interaction.guildId];

          if (!server?.setupCompleted) {

            return interaction.reply({

              content:
                "📊 **Builder Durumu**\n\n" +
                "❌ Kurulum yapılmamış.\n\n" +
                "`/setup` ile başlayabilirsin.",

              ephemeral: true

            });
          }

          const template =
            templates[
              server.setupType
            ];

          return interaction.reply({

            content:
              "📊 **Endless Builder**\n\n" +

              `🏗️ Yapı: **${template?.emoji || "📁"} ${template?.label || server.setupType}**\n` +

              `✨ Kanal: **${
                server.channelStyle === "emoji"
                  ? "Emoji'li"
                  : "Emojisiz"
              }**\n` +

              `📂 Kategori: **${server.categoryStyle}**\n\n` +

              "✅ Durum: **Aktif**",

            ephemeral: true

          });
        }
      }

      // ==================================================
      // SELECT MENU - TYPE
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "setup_type"
      ) {

        const type =
          interaction.values[0];

        const template =
          templates[type];

        if (!template) {

          return interaction.update({

            content:
              "❌ Geçersiz seçim.",

            components: []

          });
        }

        const data =
          loadData();

        const alreadySetup =
          data[interaction.guildId]
            ?.setupCompleted === true;

        setSession(
          interaction,
          {
            type,
            changing: alreadySetup
          }
        );

        const row =
          new ActionRowBuilder()
            .addComponents(
              createChannelStyleMenu()
            );

        return interaction.update({

          content:
            `✅ **${template.emoji} ${template.label}** seçildi.\n\n` +

            "Şimdi kanal stilini seç:\n\n" +

            "✨ **Emoji'li**\n" +
            "`💬・sohbet`\n\n" +

            "⚪ **Emojisiz**\n" +
            "`sohbet`",

          components: [row]

        });
      }

      // ==================================================
      // SELECT MENU - CHANNEL STYLE
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "setup_channel_style"
      ) {

        const session =
          getSession(interaction);

        if (!session) {

          return interaction.update({

            content:
              "❌ Setup oturumu bulunamadı.\n\n" +
              "`/setup` ile tekrar başla.",

            components: []

          });
        }

        const style =
          interaction.values[0];

        if (
          style !== "emoji" &&
          style !== "plain"
        ) {

          return interaction.update({

            content:
              "❌ Geçersiz kanal stili.",

            components: []

          });
        }

        session.channelStyle =
          style;

        setSession(
          interaction,
          session
        );

        const row =
          new ActionRowBuilder()
            .addComponents(
              createCategoryStyleMenu()
            );

        return interaction.update({

          content:
            "📂 **Kategori stilini seç:**\n\n" +

            "📁 **Emoji + Büyük Harf**\n" +
            "`📌 BİLGİ`\n\n" +

            "🔲 **Köşeli**\n" +
            "`「 BİLGİ 」`\n\n" +

            "📏 **Çizgili**\n" +
            "`━━ BİLGİ ━━`\n\n" +

            "⚪ **Sade**\n" +
            "`BİLGİ`",

          components: [row]

        });
      }

      // ==================================================
      // SELECT MENU - CATEGORY STYLE
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "setup_category_style"
      ) {

        const session =
          getSession(interaction);

        if (!session) {

          return interaction.update({

            content:
              "❌ Setup oturumu bulunamadı.\n\n" +
              "`/setup` ile tekrar başla.",

            components: []

          });
        }

        const style =
          interaction.values[0];

        if (
          ![
            "emoji",
            "brackets",
            "lines",
            "plain"
          ].includes(style)
        ) {

          return interaction.update({

            content:
              "❌ Geçersiz kategori stili.",

            components: []

          });
        }

        session.categoryStyle =
          style;

        setSession(
          interaction,
          session
        );

        const buttons =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()
                .setCustomId(
                  "setup_create"
                )
                .setLabel(
                  "🚀 Sunucuyu Oluştur"
                )
                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()
                .setCustomId(
                  "setup_cancel"
                )
                .setLabel(
                  "İptal"
                )
                .setStyle(
                  ButtonStyle.Secondary
                )

            );

        return interaction.update({

          content:
            createSummary(session),

          components: [buttons]

        });
      }

      // ==================================================
      // BUTTON - CREATE
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "setup_create"
      ) {

        const session =
          getSession(interaction);

        if (!session) {

          return interaction.update({

            content:
              "❌ Setup oturumu bulunamadı.",

            components: []

          });
        }

        if (
          !session.type ||
          !session.channelStyle ||
          !session.categoryStyle
        ) {

          return interaction.update({

            content:
              "❌ Setup bilgileri eksik.",

            components: []

          });
        }

        const template =
          templates[session.type];

        if (!template) {

          return interaction.update({

            content:
              "❌ Şablon bulunamadı.",

            components: []

          });
        }

        // ÖNCE interaction'ı cevapla
        await interaction.update({

          content:
            "⏳ **Sunucu hazırlanıyor...**\n\n" +

            "📁 Kategoriler hazırlanıyor...\n" +
            "💬 Kanallar hazırlanıyor...\n" +
            "🎭 Roller hazırlanıyor...",

          components: []

        });

        try {

          // Değiştiriliyorsa eski yapıyı temizle
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

          const data =
            loadData();

          data[
            interaction.guildId
          ] = {

            setupCompleted: true,

            setupType:
              session.type,

            channelStyle:
              session.channelStyle,

            categoryStyle:
              session.categoryStyle,

            setupDate:
              Date.now()

          };

          saveData(data);

          deleteSession(
            interaction
          );

          return interaction.editReply({

            content:
              "╔══════════════════════════╗\n" +
              "       🎉 KURULUM TAMAM\n" +
              "╚══════════════════════════╝\n\n" +

              `🏗️ **${template.emoji} ${template.label}**\n\n` +

              `📁 Kategori: **${result.categoriesCreated}**\n` +
              `💬 Kanal: **${result.channelsCreated}**\n` +
              `🎭 Rol: **${result.rolesCreated}**\n\n` +

              "✨ Kanal stili: **" +
              (
                session.channelStyle === "emoji"
                  ? "Emoji'li"
                  : "Emojisiz"
              ) +
              "**\n\n" +

              "✅ Builder kurulumu tamamlandı!\n\n" +

              "`/setup-durum` ile durumu görebilirsin.",

            components: []

          });

        } catch (error) {

          console.error(
            "❌ SUNUCU OLUŞTURMA HATASI:",
            error
          );

          return interaction.editReply({

            content:
              "❌ **Sunucu oluşturulurken hata oluştu.**\n\n" +

              "Botun gerekli yetkilere sahip olduğundan emin ol:\n\n" +

              "• Kanalları Yönet\n" +
              "• Rolleri Yönet\n" +
              "• Kanalları Gör\n" +
              "• Mesaj Gönder\n\n" +

              `🔴 Hata: \`${error.message}\``,

            components: []

          });
        }
      }

      // ==================================================
      // BUTTON - CANCEL
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "setup_cancel"
      ) {

        deleteSession(
          interaction
        );

        return interaction.update({

          content:
            "❌ **Kurulum iptal edildi.**",

          components: []

        });
      }

    } catch (error) {

      console.error(
        "================================"
      );

      console.error(
        "❌ INTERACTION HATASI"
      );

      console.error(error);

      console.error(
        "================================"
      );

      try {

        if (
          interaction.replied ||
          interaction.deferred
        ) {

          await interaction.followUp({

            content:
              "❌ Beklenmeyen bir hata oluştu. Hatch loglarını kontrol et.",

            ephemeral: true

          });

        } else {

          await interaction.reply({

            content:
              "❌ Beklenmeyen bir hata oluştu. Hatch loglarını kontrol et.",

            ephemeral: true

          });

        }

      } catch {}

    }
  }
);

// ======================================================
// ERROR LOGS
// ======================================================

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ Unhandled Rejection:",
      error
    );

  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ Uncaught Exception:",
      error
    );

  }
);

// ======================================================
// LOGIN
// ======================================================

if (!process.env.DISCORD_TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN environment variable bulunamadı!"
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);