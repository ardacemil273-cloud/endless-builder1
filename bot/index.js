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

// ==============================
// DATA
// ==============================

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


// ==============================
// GEÇİCİ SETUP OTURUMLARI
// ==============================

const setupSessions = new Map();


// ==============================
// KOMUTLAR
// ==============================

const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Gelişmiş Discord Server Builder'ı başlatır.")
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild.toString()
  );

const changeSetupCommand = new SlashCommandBuilder()
  .setName("setup-degistir")
  .setDescription("Mevcut Builder kurulumunu değiştirir.")
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild.toString()
  );

const setupStatusCommand = new SlashCommandBuilder()
  .setName("setup-durum")
  .setDescription("Sunucunun mevcut Builder durumunu gösterir.")
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild.toString()
  );


// ==============================
// ŞABLONLAR
// ==============================

const templates = {

  gaming: {
    label: "Gaming",
    emoji: "🎮",

    categories: [
      {
        key: "info",
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
        key: "community",
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["bot-komutları", "text"],
          ["medya", "text"],
          ["mizah", "text"],
          ["öneriler", "text"]
        ]
      },

      {
        key: "game",
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
        key: "registration",
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
        key: "support",
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
        key: "voice",
        name: "SES ODALARI",
        emoji: "🔊",
        channels: [
          ["Genel", "voice"],
          ["Oyun 1", "voice"],
          ["Oyun 2", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        key: "management",
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


  community: {
    label: "Community",
    emoji: "👥",

    categories: [
      {
        key: "info",
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
        key: "registration",
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
        key: "community",
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
        key: "game",
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
        key: "support",
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
        key: "voice",
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
        key: "management",
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


  streamer: {
    label: "Streamer",
    emoji: "🎥",

    categories: [
      {
        key: "info",
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"]
        ]
      },

      {
        key: "streamer",
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
        key: "community",
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
        key: "support",
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["destek", "text"],
          ["yardım", "text"]
        ]
      },

      {
        key: "voice",
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
        key: "management",
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


  public: {
    label: "Public",
    emoji: "🌐",

    categories: [
      {
        key: "info",
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
        key: "registration",
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
        key: "community",
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
        key: "game",
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
        key: "support",
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
        key: "voice",
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
        key: "management",
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


  shop: {
    label: "Shop",
    emoji: "🛒",

    categories: [
      {
        key: "info",
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"]
        ]
      },

      {
        key: "store",
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
        key: "community",
        name: "TOPLULUK",
        emoji: "💬",
        channels: [
          ["sohbet", "text"],
          ["medya", "text"],
          ["öneriler", "text"]
        ]
      },

      {
        key: "support",
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
        key: "voice",
        name: "SES",
        emoji: "🔊",
        channels: [
          ["Genel", "voice"],
          ["Destek", "voice"],
          ["AFK", "voice"]
        ]
      },

      {
        key: "management",
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


  education: {
    label: "Education",
    emoji: "🎓",

    categories: [
      {
        key: "info",
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
        key: "lessons",
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
        key: "community",
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
        key: "support",
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["yardım", "text"],
          ["öğretmen-destek", "text"]
        ]
      },

      {
        key: "voice",
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
        key: "management",
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


  clan: {
    label: "Clan / Team",
    emoji: "🏆",

    categories: [
      {
        key: "info",
        name: "BİLGİ",
        emoji: "📌",
        channels: [
          ["kurallar", "text"],
          ["duyurular", "text"],
          ["bilgilendirme", "text"]
        ]
      },

      {
        key: "team",
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
        key: "community",
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
        key: "recruitment",
        name: "BAŞVURU",
        emoji: "📝",
        channels: [
          ["oyuncu-başvuru", "text"],
          ["yetkili-başvuru", "text"],
          ["başvuru-bilgi", "text"]
        ]
      },

      {
        key: "support",
        name: "DESTEK",
        emoji: "🎫",
        channels: [
          ["ticket", "text"],
          ["destek", "text"],
          ["yardım", "text"]
        ]
      },

      {
        key: "voice",
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
        key: "management",
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


// ==============================
// SETUP SEÇENEKLERİ
// ==============================

const channelStyles = {
  emoji: {
    label: "Emoji'li",
    description: "Kanalların başında emoji kullanılır.",
    value: "emoji",
    emoji: "✨"
  },

  plain: {
    label: "Emojisiz",
    description: "Temiz ve sade kanal isimleri.",
    value: "plain",
    emoji: "⚪"
  }
};


const categoryStyles = {
  emoji: {
    label: "Emoji + Büyük Harf",
    description: "📌 BİLGİ şeklinde kategori.",
    value: "emoji",
    emoji: "📁"
  },

  brackets: {
    label: "Köşeli Stil",
    description: "「 BİLGİ 」 şeklinde kategori.",
    value: "brackets",
    emoji: "「"
  },

  lines: {
    label: "Çizgili Stil",
    description: "━━ BİLGİ ━━ şeklinde kategori.",
    value: "lines",
    emoji: "━"
  },

  plain: {
    label: "Sade",
    description: "BİLGİ şeklinde kategori.",
    value: "plain",
    emoji: "⚪"
  }
};


// ==============================
// İSİM OLUŞTURUCULAR
// ==============================

function formatChannelName(name, style) {

  if (style === "plain") {
    return name.toLowerCase();
  }

  const channelEmojis = {
    "kurallar": "📜",
    "duyurular": "📢",
    "bilgilendirme": "📋",
    "hoşgeldin": "👋",
    "sunucu-istatistik": "📊",
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
    "kayıt": "📝",
    "kayıt-bilgi": "📋",
    "kayıt-log": "📑",
    "rol-seçim": "🎭",
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
    "başvuru-log": "📑",
    "maç-log": "📑",
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

  if (style === "emoji") {
    const emoji = channelEmojis[name] || "📄";
    return `${emoji}・${name}`;
  }

  return name;
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


// ==============================
// SETUP MENÜSÜ
// ==============================

function createSetupMenu() {

  return new StringSelectMenuBuilder()
    .setCustomId("setup_type")
    .setPlaceholder("Sunucu türünü seç...")

    .addOptions(
      {
        label: "Gaming",
        description: "Oyun, takım, turnuva ve oyuncu sistemi.",
        value: "gaming",
        emoji: "🎮"
      },
      {
        label: "Community",
        description: "Geniş kapsamlı topluluk sunucusu.",
        value: "community",
        emoji: "👥"
      },
      {
        label: "Streamer",
        description: "Yayıncı ve içerik üreticisi sunucusu.",
        value: "streamer",
        emoji: "🎥"
      },
      {
        label: "Public",
        description: "Genel amaçlı büyük public sunucu.",
        value: "public",
        emoji: "🌐"
      },
      {
        label: "Shop",
        description: "Mağaza ve müşteri topluluğu.",
        value: "shop",
        emoji: "🛒"
      },
      {
        label: "Education",
        description: "Ders ve eğitim topluluğu.",
        value: "education",
        emoji: "🎓"
      },
      {
        label: "Clan / Team",
        description: "Takım, clan ve e-spor sunucusu.",
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
        description: "📜・kurallar gibi kanal isimleri.",
        value: "emoji",
        emoji: "✨"
      },
      {
        label: "Emojisiz",
        description: "kurallar gibi sade kanal isimleri.",
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
        emoji: "「"
      },
      {
        label: "Çizgili",
        description: "━━ BİLGİ ━━",
        value: "lines",
        emoji: "━"
      },
      {
        label: "Sade",
        description: "BİLGİ",
        value: "plain",
        emoji: "⚪"
      }
    );
}


// ==============================
// KURULUM ÖZETİ
// ==============================

function createSetupSummary(session) {

  const template = templates[session.type];

  let channelCount = 0;

  for (const category of template.categories) {
    channelCount += category.channels.length;
  }

  return (
    "╔══════════════════════════╗\n" +
    "       🛠️ ENDLESS BUILDER\n" +
    "╚══════════════════════════╝\n\n" +

    `🏷️ Sunucu türü: **${template.emoji} ${template.label}**\n` +
    `📁 Kategori sayısı: **${template.categories.length}**\n` +
    `💬 Kanal sayısı: **${channelCount}**\n` +
    `🎭 Rol sayısı: **${template.roles.length}**\n\n` +

    `✨ Kanal stili: **${channelStyles[session.channelStyle].label}**\n` +
    `📂 Kategori stili: **${categoryStyles[session.categoryStyle].label}**\n\n` +

    "━━━━━━━━━━━━━━━━━━━━\n" +
    "Kurulum hazır.\n\n" +

    "🚀 **SUNUCUYU OLUŞTUR** butonuna basarak\n" +
    "kurulumu başlatabilirsin."
  );
}


// ==============================
// KURULUM
// ==============================

async function buildServer(guild, type, settings = {}) {

  const template = templates[type];

  const channelStyle =
    settings.channelStyle || "emoji";

  const categoryStyle =
    settings.categoryStyle || "emoji";


  let categoriesCreated = 0;
  let channelsCreated = 0;
  let rolesCreated = 0;


  // ==============================
  // ROLLER
  // ==============================

  for (const roleName of template.roles) {

    const exists = guild.roles.cache.find(
      role => role.name === roleName
    );

    if (exists) continue;

    await guild.roles.create({
      name: roleName,
      reason: "Endless Builder setup"
    });

    rolesCreated++;
  }


  await guild.roles.fetch();


  // ==============================
  // KATEGORİLER
  // ==============================

  for (const categoryData of template.categories) {

    const categoryName =
      formatCategoryName(
        categoryData,
        categoryStyle
      );


    let category = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === categoryName
    );


    if (!category) {

      category = await guild.channels.create({

        name: categoryName,

        type: ChannelType.GuildCategory

      });

      categoriesCreated++;
    }


    // ==============================
    // KANALLAR
    // ==============================

    for (const [rawName, channelType] of categoryData.channels) {

      const name =
        formatChannelName(
          rawName,
          channelStyle
        );


      const exists = guild.channels.cache.find(
        channel =>
          channel.name === name &&
          channel.parentId === category.id
      );


      if (exists) continue;


      await guild.channels.create({

        name,

        type:
          channelType === "voice"
            ? ChannelType.GuildVoice
            : ChannelType.GuildText,

        parent: category.id

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


// ==============================
// ESKİ BUILDER YAPISINI TEMİZLE
// ==============================

async function removeBuilderStructure(guild) {

  const categoryNames = new Set();


  for (const template of Object.values(templates)) {

    for (const category of template.categories) {

      categoryNames.add(
        category.name
      );

      categoryNames.add(
        `📌 ${category.name}`
      );

      categoryNames.add(
        `💬 ${category.name}`
      );

      categoryNames.add(
        `🎮 ${category.name}`
      );

      categoryNames.add(
        `🎫 ${category.name}`
      );

      categoryNames.add(
        `👑 ${category.name}`
      );

      categoryNames.add(
        `🎥 ${category.name}`
      );

      categoryNames.add(
        `🔊 ${category.name}`
      );

      categoryNames.add(
        `📝 ${category.name}`
      );

      categoryNames.add(
        `━━ ${category.name} ━━`
      );

      categoryNames.add(
        `「 ${category.name} 」`
      );
    }
  }


  const categories =
    guild.channels.cache.filter(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        categoryNames.has(channel.name)
    );


  for (const category of categories.values()) {

    const children =
      guild.channels.cache.filter(
        channel =>
          channel.parentId === category.id
      );


    for (const channel of children.values()) {

      try {

        await channel.delete(
          "Endless Builder setup değiştirildi"
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
        "Endless Builder setup değiştirildi"
      );

    } catch (error) {

      console.error(
        "Kategori silinemedi:",
        error.message
      );

    }
  }


  // ==============================
  // ROLLER
  // ==============================

  const roleNames = new Set();


  for (const template of Object.values(templates)) {

    for (const role of template.roles) {

      roleNames.add(role);

    }
  }


  const roles =
    guild.roles.cache.filter(
      role =>
        roleNames.has(role.name) &&
        !role.managed
    );


  for (const role of roles.values()) {

    try {

      await role.delete(
        "Endless Builder setup değiştirildi"
      );

    } catch (error) {

      console.error(
        "Rol silinemedi:",
        error.message
      );

    }
  }
}


// ==============================
// READY
// ==============================

client.once("clientReady", async () => {

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
      "✅ Builder komutları kaydedildi!"
    );

  } catch (error) {

    console.error(
      "❌ Komut kayıt hatası:",
      error
    );

  }
});


// ==============================
// ETKİLEŞİMLER
// ==============================

client.on(
  "interactionCreate",
  async interaction => {

    const data = loadData();


    // ==========================
    // /setup
    // ==========================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "setup"
    ) {

      const server =
        data[interaction.guild.id];


      if (server?.setupCompleted) {

        const selectedTemplate =
          templates[server.setupType];


        return interaction.reply({

          content:
            "❌ **Bu sunucu daha önce kuruldu!**\n\n" +

            `🏗️ Mevcut yapı: **${selectedTemplate?.emoji || "📁"} ${selectedTemplate?.label || server.setupType}**\n\n` +

            "Yeni Builder ayarları yapmak için:\n" +
            "`/setup-degistir` kullan.",

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

          "Sunucun için bir şablon seç.\n" +
          "Builder seçtiğin yapıya göre gerekli\n" +
          "kategori, kanal ve rolleri hazırlayacak.",

        components: [row],

        ephemeral: true

      });
    }


    // ==========================
    // /setup-degistir
    // ==========================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "setup-degistir"
    ) {

      const server =
        data[interaction.guild.id];


      if (!server?.setupCompleted) {

        return interaction.reply({

          content:
            "❌ Bu sunucuda henüz Builder kurulumu yok.\n\n" +
            "`/setup` kullanarak başlayabilirsin.",

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
          "⚠️ **Builder kurulumu değiştirilecek!**\n\n" +

          "Yeni yapı oluşturulurken mevcut Builder\n" +
          "kategori, kanal ve rolleri temizlenecek.\n\n" +

          "Yeni sunucu türünü seç:",

        components: [row],

        ephemeral: true

      });
    }


    // ==========================
    // /setup-durum
    // ==========================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "setup-durum"
    ) {

      const server =
        data[interaction.guild.id];


      if (!server?.setupCompleted) {

        return interaction.reply({

          content:
            "📊 **Builder Durumu**\n\n" +
            "❌ Henüz kurulum yapılmamış.\n\n" +
            "Başlamak için `/setup` kullan.",

          ephemeral: true

        });
      }


      const template =
        templates[server.setupType];


      return interaction.reply({

        content:
          "📊 **Endless Builder Durumu**\n\n" +

          `🏗️ Yapı: **${template?.emoji || "📁"} ${template?.label || server.setupType}**\n` +

          `✨ Kanal stili: **${channelStyles[server.channelStyle]?.label || "Emoji'li"}**\n` +

          `📂 Kategori stili: **${categoryStyles[server.categoryStyle]?.label || "Emoji + Büyük Harf"}**\n` +

          "✅ Kurulum: **Tamamlandı**\n" +

          `📅 Kurulum zamanı: <t:${Math.floor(server.setupDate / 1000)}:R>`,

        ephemeral: true

      });
    }


    // ==========================
    // ŞABLON SEÇİMİ
    // ==========================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "setup_type"
    ) {

      const type =
        interaction.values[0];


      const template =
        templates[type];


      if (!template) return;


      const dataNow =
        loadData();


      const server =
        dataNow[interaction.guild.id];


      // ==========================
      // ESKİ KURULUM VAR
      // ==========================

      if (server?.setupCompleted) {

        const buttons =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()
                .setCustomId(
                  `change_start_${type}`
                )
                .setLabel(
                  "Devam Et"
                )
                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()
                .setCustomId(
                  "change_cancel"
                )
                .setLabel(
                  "İptal"
                )
                .setStyle(
                  ButtonStyle.Secondary
                )

            );


        setupSessions.set(
          interaction.user.id,
          {
            type,
            changing: true
          }
        );


        return interaction.update({

          content:
            `⚠️ **${template.emoji} ${template.label}** seçildi.\n\n` +

            "Mevcut Builder yapısı temizlenip\n" +
            "yeni yapı oluşturulacak.\n\n" +

            "Devam etmek istiyor musun?",

          components: [buttons]

        });
      }


      setupSessions.set(
        interaction.user.id,
        {
          type,
          changing: false
        }
      );


      const row =
        new ActionRowBuilder()
          .addComponents(
            createChannelStyleMenu()
          );


      return interaction.update({

        content:
          `🎯 **${template.emoji} ${template.label}** seçildi.\n\n` +

          "Şimdi kanal görünümünü seç:\n\n" +

          "✨ Emoji'li → `💬・sohbet`\n" +
          "⚪ Emojisiz → `sohbet`",

        components: [row]

      });
    }


    // ==========================
    // KANAL STİLİ
    // ==========================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "setup_channel_style"
    ) {

      const session =
        setupSessions.get(
          interaction.user.id
        );


      if (!session) {

        return interaction.update({

          content:
            "❌ Setup oturumunun süresi dolmuş.\n\n" +
            "`/setup` ile tekrar başla.",

          components: []

        });
      }


      session.channelStyle =
        interaction.values[0];


      const row =
        new ActionRowBuilder()
          .addComponents(
            createCategoryStyleMenu()
          );


      return interaction.update({

        content:
          "📂 **Kategori görünümünü seç:**\n\n" +

          "📁 `📌 BİLGİ`\n" +
          "「 `「 BİLGİ 」` 」\n" +
          "━━ `━━ BİLGİ ━━`\n" +
          "⚪ `BİLGİ`",

        components: [row]

      });
    }


    // ==========================
    // KATEGORİ STİLİ
    // ==========================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "setup_category_style"
    ) {

      const session =
        setupSessions.get(
          interaction.user.id
        );


      if (!session) {

        return interaction.update({

          content:
            "❌ Setup oturumunun süresi dolmuş.\n\n" +
            "`/setup` ile tekrar başla.",

          components: []

        });
      }


      session.categoryStyle =
        interaction.values[0];


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
          createSetupSummary(session),

        components: [buttons]

      });
    }


    // ==========================
    // OLUŞTUR
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId === "setup_create"
    ) {

      const session =
        setupSessions.get(
          interaction.user.id
        );


      if (!session) {

        return interaction.update({

          content:
            "❌ Setup oturumunun süresi dolmuş.\n\n" +
            "`/setup` ile tekrar başla.",

          components: []

        });
      }


      const template =
        templates[session.type];


      await interaction.update({

        content:
          `🚀 **${template.emoji} ${template.label}** kuruluyor...\n\n` +
          "📁 Kategoriler hazırlanıyor...\n" +
          "💬 Kanallar oluşturuluyor...\n" +
          "🎭 Roller hazırlanıyor...",

        components: []

      });


      try {

        const result =
          await buildServer(
            interaction.guild,
            session.type,
            session
          );


        const dataNow =
          loadData();


        dataNow[interaction.guild.id] = {

          setupCompleted: true,

          setupType: session.type,

          channelStyle:
            session.channelStyle,

          categoryStyle:
            session.categoryStyle,

          setupDate: Date.now()

        };


        saveData(dataNow);


        setupSessions.delete(
          interaction.user.id
        );


        await interaction.editReply({

          content:
            "╔══════════════════════════╗\n" +
            "       🎉 KURULUM TAMAMLANDI\n" +
            "╚══════════════════════════╝\n\n" +

            `🏗️ Yapı: **${template.emoji} ${template.label}**\n\n` +

            `📁 Kategoriler: **${result.categoriesCreated}**\n` +
            `💬 Kanallar: **${result.channelsCreated}**\n` +
            `🎭 Roller: **${result.rolesCreated}**\n\n` +

            `✨ Kanal stili: **${channelStyles[session.channelStyle].label}**\n` +
            `📂 Kategori stili: **${categoryStyles[session.categoryStyle].label}**\n\n` +

            "🔐 Builder ayarları kaydedildi.\n\n" +

            "Bir sonraki aşamada bu yapıya\n" +
            "Ticket, kayıt, moderasyon ve otomasyon\n" +
            "sistemleri bağlanabilir.",

          components: []

        });

      } catch (error) {

        console.error(
          "Setup hatası:",
          error
        );


        await interaction.editReply({

          content:
            "❌ **Kurulum sırasında hata oluştu.**\n\n" +

            "Botun şu yetkilere sahip olduğundan emin ol:\n" +

            "• Kanalları Yönet\n" +
            "• Rolleri Yönet\n" +
            "• Kanalları Gör\n\n" +

            `Hata: \`${error.message}\``,

          components: []

        });

      }

      return;
    }


    // ==========================
    // DEĞİŞTİR → DEVAM
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "change_start_"
      )
    ) {

      const type =
        interaction.customId.replace(
          "change_start_",
          ""
        );


      const template =
        templates[type];


      setupSessions.set(
        interaction.user.id,
        {
          type,
          changing: true
        }
      );


      const row =
        new ActionRowBuilder()
          .addComponents(
            createChannelStyleMenu()
          );


      return interaction.update({

        content:
          `⚙️ **${template.emoji} ${template.label}**\n\n` +

          "Yeni sunucunun kanal stilini seç:",

        components: [row]

      });
    }


    // ==========================
    // DEĞİŞTİR → OLUŞTUR
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId === "setup_cancel"
    ) {

      setupSessions.delete(
        interaction.user.id
      );


      return interaction.update({

        content:
          "❌ **Kurulum iptal edildi.**",

        components: []

      });
    }


    // ==========================
    // ESKİ SİSTEM İPTAL
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId === "change_cancel"
    ) {

      setupSessions.delete(
        interaction.user.id
      );


      return interaction.update({

        content:
          "❌ **İşlem iptal edildi.**\n\n" +
          "Mevcut sunucu yapın korunuyor.",

        components: []

      });
    }

  }
);


// ==============================
// LOGIN
// ==============================

client.login(
  process.env.DISCORD_TOKEN
).catch(error => {

  console.error(
    "❌ Discord bağlantı hatası:",
    error.message
  );

});
