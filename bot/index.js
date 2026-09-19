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
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function defaultGuildConfig() {
  return {
    setupCompleted: false,
    setupType: null,
    setupDate: null,

    channelStyle: "emoji",
    categoryStyle: "emoji",

    roles: {},
    channels: {},

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
      registeredRoleId: null,
      unregisteredRoleId: null,
      staffRoleId: null
    },

    logChannelId: null,

    warnings: {},

    tickets: {}
  };
}

function getGuildConfig(guildId) {
  const data = loadData();

  if (!data[guildId]) {
    data[guildId] = defaultGuildConfig();
    saveData(data);
  }

  return data[guildId];
}

function saveGuildConfig(guildId, config) {
  const data = loadData();
  data[guildId] = config;
  saveData(data);
}

// ======================================================
// SESSION
// ======================================================

const setupSessions = new Map();

function sessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
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
        channels: ["kurallar", "duyurular", "bilgi"]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: ["sohbet", "medya", "bot-komut"]
      },
      {
        name: "OYUN",
        emoji: "🎮",
        channels: ["oyun-sohbet", "ekip-ara", "oyuncu-ara"]
      },
      {
        name: "DESTEK",
        emoji: "🎫",
        channels: ["destek"]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: ["Oyun 1", "Oyun 2", "Sohbet"]
      },
      {
        name: "YÖNETİM",
        emoji: "⚙️",
        channels: ["yetkili-sohbet", "log"]
      }
    ]
  },

  community: {
    name: "Community",
    emoji: "👥",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: ["kurallar", "duyurular", "hakkımızda"]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: ["sohbet", "medya", "paylaşım", "bot-komut"]
      },
      {
        name: "ETKİNLİK",
        emoji: "🎉",
        channels: ["etkinlikler", "çekiliş"]
      },
      {
        name: "DESTEK",
        emoji: "🎫",
        channels: ["destek"]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: ["Sohbet 1", "Sohbet 2", "Oyun"]
      },
      {
        name: "YÖNETİM",
        emoji: "⚙️",
        channels: ["yetkili-sohbet", "log"]
      }
    ]
  },

  streamer: {
    name: "Streamer",
    emoji: "🎥",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: ["kurallar", "duyurular", "bilgi"]
      },
      {
        name: "STREAMER",
        emoji: "🎥",
        channels: ["streamer-başvuru", "yayın-duyuru", "yayıncı-sohbet"]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: ["sohbet", "medya", "klipler"]
      },
      {
        name: "DESTEK",
        emoji: "🎫",
        channels: ["destek"]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: ["Yayın 1", "Yayın 2", "Sohbet"]
      },
      {
        name: "YÖNETİM",
        emoji: "⚙️",
        channels: ["yetkili-sohbet", "log"]
      }
    ]
  },

  public: {
    name: "Public",
    emoji: "🌐",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: ["kurallar", "duyurular", "bilgi", "roller"]
      },
      {
        name: "KAYIT",
        emoji: "📝",
        channels: ["kayıt", "kayıt-bilgi"]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: ["sohbet", "medya", "paylaşım", "bot-komut"]
      },
      {
        name: "GAME",
        emoji: "🎮",
        channels: ["game", "duo", "solo", "ekip-ara"]
      },
      {
        name: "STREAMER",
        emoji: "🎥",
        channels: ["streamer", "yayın-duyuru"]
      },
      {
        name: "DESTEK",
        emoji: "🎫",
        channels: ["destek"]
      },
      {
        name: "ETKİNLİK",
        emoji: "🎉",
        channels: ["etkinlikler", "çekiliş"]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: ["Sohbet 1", "Sohbet 2", "Oyun 1", "Oyun 2"]
      },
      {
        name: "YÖNETİM",
        emoji: "⚙️",
        channels: ["yetkili-sohbet", "log", "kayıt-log"]
      }
    ]
  },

  shop: {
    name: "Shop",
    emoji: "🛒",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: ["kurallar", "duyurular", "mağaza-bilgi"]
      },
      {
        name: "MAĞAZA",
        emoji: "🛒",
        channels: ["ürünler", "fiyatlar", "kampanyalar"]
      },
      {
        name: "DESTEK",
        emoji: "🎫",
        channels: ["destek", "sipariş-destek"]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: ["sohbet", "medya"]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: ["Sohbet"]
      },
      {
        name: "YÖNETİM",
        emoji: "⚙️",
        channels: ["yetkili-sohbet", "log"]
      }
    ]
  },

  education: {
    name: "Education",
    emoji: "🎓",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: ["kurallar", "duyurular", "bilgi"]
      },
      {
        name: "DERSLER",
        emoji: "📚",
        channels: ["matematik", "türkçe", "fen", "ingilizce"]
      },
      {
        name: "TOPLULUK",
        emoji: "👥",
        channels: ["sohbet", "soru-cevap", "kaynaklar"]
      },
      {
        name: "DESTEK",
        emoji: "🎫",
        channels: ["destek"]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: ["Ders 1", "Ders 2", "Sohbet"]
      },
      {
        name: "YÖNETİM",
        emoji: "⚙️",
        channels: ["yetkili-sohbet", "log"]
      }
    ]
  },

  clan: {
    name: "Clan / Team",
    emoji: "🏆",

    categories: [
      {
        name: "BİLGİ",
        emoji: "📌",
        channels: ["kurallar", "duyurular"]
      },
      {
        name: "TAKIM",
        emoji: "🏆",
        channels: ["takım-sohbet", "strateji", "kadromuz"]
      },
      {
        name: "OYUN",
        emoji: "🎮",
        channels: ["oyun", "maçlar", "rakip-ara"]
      },
      {
        name: "DESTEK",
        emoji: "🎫",
        channels: ["destek"]
      },
      {
        name: "SES",
        emoji: "🔊",
        channels: ["Takım 1", "Takım 2", "Sohbet"]
      },
      {
        name: "YÖNETİM",
        emoji: "⚙️",
        channels: ["yetkili-sohbet", "log"]
      }
    ]
  }
};

// ======================================================
// CHANNEL STYLE
// ======================================================

const channelEmojis = {
  "kurallar": "📜",
  "duyurular": "📢",
  "bilgi": "ℹ️",
  "hakkımızda": "📖",
  "roller": "🎭",
  "sohbet": "💬",
  "medya": "🖼️",
  "paylaşım": "📤",
  "bot-komut": "🤖",
  "oyun": "🎮",
  "oyun-sohbet": "🎮",
  "ekip-ara": "👥",
  "oyuncu-ara": "🔎",
  "duo": "👥",
  "solo": "👤",
  "destek": "🎫",
  "sipariş-destek": "📦",
  "kayıt": "📝",
  "kayıt-bilgi": "ℹ️",
  "kayıt-log": "📋",
  "streamer": "🎥",
  "streamer-başvuru": "🎥",
  "yayın-duyuru": "📢",
  "yayıncı-sohbet": "🎙️",
  "klipler": "🎬",
  "etkinlikler": "🎉",
  "çekiliş": "🎁",
  "yetkili-sohbet": "🛡️",
  "log": "📋",
  "ürünler": "🛒",
  "fiyatlar": "💰",
  "kampanyalar": "🏷️",
  "mağaza-bilgi": "ℹ️",
  "sipariş": "📦",
  "matematik": "➗",
  "türkçe": "📚",
  "fen": "🔬",
  "ingilizce": "🇬🇧",
  "soru-cevap": "❓",
  "kaynaklar": "📚",
  "takım-sohbet": "🏆",
  "strateji": "🧠",
  "kadromuz": "👥",
  "maçlar": "⚔️",
  "rakip-ara": "🔎"
};

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
// ROLE HELPERS
// ======================================================

async function ensureRole(guild, name, permissions = []) {
  let role = guild.roles.cache.find(r => r.name === name);

  if (!role) {
    role = await guild.roles.create({
      name,
      permissions,
      reason: "Endless Builder"
    });
  }

  return role;
}

async function createDefaultRoles(guild, config) {
  const roles = {};

  roles.admin = await ensureRole(
    guild,
    "👑 Yönetici",
    [
      PermissionsBitField.Flags.ManageGuild,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ViewAuditLog
    ]
  );

  roles.staff = await ensureRole(
    guild,
    "🛡️ Yetkili",
    [
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ViewAuditLog
    ]
  );

  roles.support = await ensureRole(
    guild,
    "🎫 Destek Ekibi"
  );

  roles.registration = await ensureRole(
    guild,
    "📝 Kayıt Yetkilisi"
  );

  roles.streamer = await ensureRole(
    guild,
    "🎥 Streamer"
  );

  roles.booster = await ensureRole(
    guild,
    "⭐ Booster"
  );

  roles.member = await ensureRole(
    guild,
    "👤 Üye"
  );

  roles.unregistered = await ensureRole(
    guild,
    "🔒 Kayıtsız"
  );

  roles.bot = await ensureRole(
    guild,
    "🤖 Bot",
    [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.ManageMessages
    ]
  );

  config.roles = {
    admin: roles.admin.id,
    staff: roles.staff.id,
    support: roles.support.id,
    registration: roles.registration.id,
    streamer: roles.streamer.id,
    booster: roles.booster.id,
    member: roles.member.id,
    unregistered: roles.unregistered.id,
    bot: roles.bot.id
  };

  config.registration.registeredRoleId = roles.member.id;
  config.registration.unregisteredRoleId = roles.unregistered.id;
  config.registration.staffRoleId = roles.registration.id;

  return roles;
}

// ======================================================
// SETUP MENU
// ======================================================

function createSetupMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_type")
      .setPlaceholder("Sunucu türünü seç...")
      .addOptions(
        Object.entries(templates).map(([key, template]) => ({
          label: template.name,
          value: key,
          emoji: template.emoji
        }))
      )
  );
}

function createChannelStyleMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_channel_style")
      .setPlaceholder("Kanal görünümünü seç...")
      .addOptions(
        {
          label: "Emoji + isim",
          value: "emoji",
          emoji: "🔲"
        },
        {
          label: "Sadece isim",
          value: "plain",
          emoji: "📄"
        }
      )
  );
}

function createCategoryStyleMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("setup_category_style")
      .setPlaceholder("Kategori görünümünü seç...")
      .addOptions(
        {
          label: "Emoji",
          value: "emoji",
          emoji: "📁"
        },
        {
          label: "Köşeli",
          value: "brackets",
          emoji: "🔲"
        },
        {
          label: "Çizgili",
          value: "lines",
          emoji: "📏"
        },
        {
          label: "Normal",
          value: "plain",
          emoji: "⚪"
        }
      )
  );
}

function createSetupButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup_create")
      .setLabel("Sunucuyu Oluştur")
      .setEmoji("🚀")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("setup_cancel")
      .setLabel("İptal")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );
}

// ======================================================
// SUMMARY
// ======================================================

function createSummary(session) {
  const template = templates[session.type];

  const categoryCount = template.categories.length;

  const channelCount = template.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  return [
    `**Şablon:** ${template.emoji} ${template.name}`,
    `**Kategori:** ${categoryCount}`,
    `**Kanal:** ${channelCount}`,
    `**Kanal stili:** ${session.channelStyle}`,
    `**Kategori stili:** ${session.categoryStyle}`
  ].join("\n");
}

// ======================================================
// BUILD SERVER
// ======================================================

async function buildServer(guild, type, settings) {
  const template = templates[type];

  if (!template) {
    throw new Error("Geçersiz şablon.");
  }

  const config = getGuildConfig(guild.id);

  const roles = await createDefaultRoles(guild, config);

  const createdCategories = [];
  const createdChannels = [];

  for (const category of template.categories) {
    let discordCategory = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === formatCategoryName(
          category,
          settings.categoryStyle
        )
    );

    if (!discordCategory) {
      discordCategory = await guild.channels.create({
        name: formatCategoryName(
          category,
          settings.categoryStyle
        ),
        type: ChannelType.GuildCategory,
        reason: "Endless Builder"
      });
    }

    createdCategories.push(discordCategory.id);

    for (const channelName of category.channels) {
      const finalName = formatChannelName(
        channelName,
        settings.channelStyle
      );

      let channel;

      if (
        channelName === "Sohbet" ||
        channelName === "Oyun 1" ||
        channelName === "Oyun 2" ||
        channelName === "Sohbet 1" ||
        channelName === "Sohbet 2" ||
        channelName === "Yayın 1" ||
        channelName === "Yayın 2" ||
        channelName === "Ders 1" ||
        channelName === "Ders 2" ||
        channelName === "Takım 1" ||
        channelName === "Takım 2"
      ) {
        channel = guild.channels.cache.find(
          c =>
            c.type === ChannelType.GuildVoice &&
            c.name === finalName &&
            c.parentId === discordCategory.id
        );

        if (!channel) {
          channel = await guild.channels.create({
            name: finalName,
            type: ChannelType.GuildVoice,
            parent: discordCategory.id,
            reason: "Endless Builder"
          });
        }
      } else {
        channel = guild.channels.cache.find(
          c =>
            c.type === ChannelType.GuildText &&
            c.name === finalName &&
            c.parentId === discordCategory.id
        );

        if (!channel) {
          channel = await guild.channels.create({
            name: finalName,
            type: ChannelType.GuildText,
            parent: discordCategory.id,
            reason: "Endless Builder"
          });
        }
      }

      createdChannels.push(channel.id);
    }
  }

  config.setupCompleted = true;
  config.setupType = type;
  config.setupDate = Date.now();

  config.channelStyle = settings.channelStyle;
  config.categoryStyle = settings.categoryStyle;

  config.channels.categories = createdCategories;
  config.channels.channels = createdChannels;

  config.roles = {
    admin: roles.admin.id,
    staff: roles.staff.id,
    support: roles.support.id,
    registration: roles.registration.id,
    streamer: roles.streamer.id,
    booster: roles.booster.id,
    member: roles.member.id,
    unregistered: roles.unregistered.id,
    bot: roles.bot.id
  };

  saveGuildConfig(guild.id, config);

  return {
    categories: createdCategories.length,
    channels: createdChannels.length,
    roles: Object.keys(config.roles).length
  };
}

// ======================================================
// BUILDER CLEANUP
// ======================================================

async function removeBuilderStructure(guild) {
  const config = getGuildConfig(guild.id);

  const channelIds = [
    ...(config.channels?.channels || []),
    ...(config.channels?.categories || [])
  ];

  for (const id of channelIds) {
    const channel = guild.channels.cache.get(id);

    if (channel) {
      try {
        await channel.delete("Endless Builder setup değişikliği");
      } catch {}
    }
  }

  config.channels = {};
  config.setupCompleted = false;
  config.setupType = null;

  saveGuildConfig(guild.id, config);
}

// ======================================================
// DELETE ALL CHANNELS
// ======================================================

async function deleteAllChannels(guild) {
  const channels = [...guild.channels.cache.values()];

  // Önce normal kanallar, sonra kategoriler
  channels.sort((a, b) => {
    if (
      a.type === ChannelType.GuildCategory &&
      b.type !== ChannelType.GuildCategory
    ) {
      return 1;
    }

    if (
      a.type !== ChannelType.GuildCategory &&
      b.type === ChannelType.GuildCategory
    ) {
      return -1;
    }

    return 0;
  });

  let deleted = 0;

  for (const channel of channels) {
    try {
      await channel.delete("Endless Builder - Tüm kanallar temizlendi");
      deleted++;
    } catch (error) {
      console.log(
        `Kanal silinemedi: ${channel.name}`,
        error.message
      );
    }
  }

  const config = getGuildConfig(guild.id);

  config.channels = {};
  config.setupCompleted = false;
  config.setupType = null;

  config.welcome.channelId = null;
  config.ticket.categoryId = null;
  config.logChannelId = null;

  saveGuildConfig(guild.id, config);

  return deleted;
}

// ======================================================
// PERMISSION HELPERS
// ======================================================

function isAdministrator(interaction) {
  return (
    interaction.guild.ownerId === interaction.user.id ||
    interaction.memberPermissions?.has(
      PermissionsBitField.Flags.Administrator
    )
  );
}

function hasManageGuild(interaction) {
  return (
    isAdministrator(interaction) ||
    interaction.memberPermissions?.has(
      PermissionsBitField.Flags.ManageGuild
    )
  );
}

function hasStaffRole(interaction) {
  if (isAdministrator(interaction)) return true;

  const config = getGuildConfig(interaction.guild.id);

  const roleIds = [
    config.roles?.admin,
    config.roles?.staff,
    config.roles?.registration
  ].filter(Boolean);

  return roleIds.some(id =>
    interaction.member.roles.cache.has(id)
  );
}

function hasRegistrationPermission(interaction) {
  if (isAdministrator(interaction)) return true;

  const config = getGuildConfig(interaction.guild.id);

  return (
    interaction.member.roles.cache.has(
      config.registration.staffRoleId
    ) ||
    interaction.member.roles.cache.has(
      config.roles?.staff
    ) ||
    interaction.member.roles.cache.has(
      config.roles?.admin
    )
  );
}

// ======================================================
// LOG SYSTEM
// ======================================================

async function sendLog(guild, title, description) {
  const config = getGuildConfig(guild.id);

  if (!config.logChannelId) return;

  const channel = guild.channels.cache.get(
    config.logChannelId
  );

  if (!channel) return;

  try {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    await channel.send({
      embeds: [embed]
    });
  } catch {}
}

// ======================================================
// TICKET
// ======================================================

async function createTicketPanel(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open")
      .setLabel("Destek Talebi Oluştur")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setTitle("🎫 Destek Sistemi")
    .setDescription(
      "Destek almak için aşağıdaki butona basarak özel bir destek kanalı oluşturabilirsin."
    );

  await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({
    content: "✅ Ticket paneli oluşturuldu.",
    ephemeral: true
  });
}

async function openTicket(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;

  const config = getGuildConfig(guild.id);

  if (!config.ticket.categoryId) {
    let category = guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildCategory &&
        c.name === "🎫 DESTEK"
    );

    if (!category) {
      category = await guild.channels.create({
        name: "🎫 DESTEK",
        type: ChannelType.GuildCategory,
        reason: "Endless Ticket"
      });
    }

    config.ticket.categoryId = category.id;
    saveGuildConfig(guild.id, config);
  }

  if (config.tickets?.[user.id]) {
    const existing = guild.channels.cache.get(
      config.tickets[user.id]
    );

    if (existing) {
      return interaction.reply({
        content: `❌ Zaten açık bir ticketın var: ${existing}`,
        ephemeral: true
      });
    }

    delete config.tickets[user.id];
    saveGuildConfig(guild.id, config);
  }

  const staffRoleId =
    config.ticket.staffRoleId ||
    config.roles?.support ||
    config.roles?.staff;

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    }
  ];

  if (staffRoleId) {
    overwrites.push({
      id: staffRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageMessages
      ]
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${user.username}`.toLowerCase().slice(0, 90),
    type: ChannelType.GuildText,
    parent: config.ticket.categoryId,
    permissionOverwrites: overwrites,
    reason: "Endless Ticket"
  });

  config.tickets[user.id] = channel.id;
  saveGuildConfig(guild.id, config);

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Ticket Kapat")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setTitle("🎫 Destek Talebi")
    .setDescription(
      `Merhaba ${user}, yetkili ekibi en kısa sürede seninle ilgilenecektir.\n\nTicketı kapatmak için aşağıdaki butonu kullanabilirsin.`
    )
    .setTimestamp();

  await channel.send({
    content: `${user}`,
    embeds: [embed],
    components: [closeRow]
  });

  await interaction.reply({
    content: `✅ Ticket oluşturuldu: ${channel}`,
    ephemeral: true
  });

  await sendLog(
    guild,
    "🎫 Ticket Açıldı",
    `${user} tarafından ${channel} oluşturuldu.`
  );
}

async function closeTicket(interaction) {
  const channel = interaction.channel;

  if (!channel.name.startsWith("ticket-")) {
    return interaction.reply({
      content: "❌ Bu kanal bir ticket kanalı değil.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "🔒 Ticket kapatılıyor..."
  });

  const config = getGuildConfig(interaction.guild.id);

  for (const [userId, channelId] of Object.entries(
    config.tickets || {}
  )) {
    if (channelId === channel.id) {
      delete config.tickets[userId];
    }
  }

  saveGuildConfig(interaction.guild.id, config);

  await sendLog(
    interaction.guild,
    "🔒 Ticket Kapatıldı",
    `${channel.name} kapatıldı.`
  );

  setTimeout(async () => {
    try {
      await channel.delete("Endless Ticket kapatıldı");
    } catch {}
  }, 1500);
}

// ======================================================
// REGISTRATION
// ======================================================

async function registrationPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("📝 Kayıt Sistemi")
    .setDescription(
      "Sunucuya kayıt işlemleri yetkililer tarafından yapılmaktadır.\n\n" +
      "Kayıt olmak için bir **Kayıt Yetkilisi** ile iletişime geç."
    );

  await interaction.channel.send({
    embeds: [embed]
  });

  await interaction.reply({
    content: "✅ Kayıt paneli gönderildi.",
    ephemeral: true
  });
}

async function registerUser(interaction, member, reason) {
  if (!hasRegistrationPermission(interaction)) {
    return interaction.reply({
      content: "❌ Kayıt yetkin yok.",
      ephemeral: true
    });
  }

  if (!member) {
    return interaction.reply({
      content: "❌ Kullanıcı bulunamadı.",
      ephemeral: true
    });
  }

  const config = getGuildConfig(interaction.guild.id);

  const registeredRole =
    interaction.guild.roles.cache.get(
      config.registration.registeredRoleId
    );

  const unregisteredRole =
    interaction.guild.roles.cache.get(
      config.registration.unregisteredRoleId
    );

  if (!registeredRole) {
    return interaction.reply({
      content: "❌ Kayıtlı rolü bulunamadı.",
      ephemeral: true
    });
  }

  try {
    if (unregisteredRole && member.roles.cache.has(unregisteredRole.id)) {
      await member.roles.remove(unregisteredRole);
    }

    if (!member.roles.cache.has(registeredRole.id)) {
      await member.roles.add(registeredRole);
    }

    await interaction.reply({
      content: `✅ ${member} başarıyla kayıt edildi.`,
      ephemeral: true
    });

    await sendLog(
      interaction.guild,
      "📝 Kullanıcı Kayıt Edildi",
      `${member} kullanıcısı ${interaction.user} tarafından kayıt edildi.\nSebep: ${reason || "Belirtilmedi"}`
    );
  } catch (error) {
    console.error(error);

    await interaction.reply({
      content:
        "❌ Rol verilemedi. Botun rolünün kayıt rolünden yukarıda olduğundan emin ol.",
      ephemeral: true
    });
  }
}

// ======================================================
// STREAMER
// ======================================================

async function streamerPanel(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("streamer_get_role")
      .setLabel("Streamer Rolünü Al")
      .setEmoji("🎥")
      .setStyle(ButtonStyle.Success)
  );

  const embed = new EmbedBuilder()
    .setTitle("🎥 Streamer")
    .setDescription(
      "Streamer rolünü almak için aşağıdaki butona basabilirsin."
    );

  await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({
    content: "✅ Streamer paneli gönderildi.",
    ephemeral: true
  });
}

async function giveStreamerRole(interaction) {
  const config = getGuildConfig(interaction.guild.id);

  let role = config.roles?.streamer
    ? interaction.guild.roles.cache.get(
        config.roles.streamer
      )
    : null;

  if (!role) {
    role = await ensureRole(
      interaction.guild,
      "🎥 Streamer"
    );

    config.roles.streamer = role.id;
    saveGuildConfig(interaction.guild.id, config);
  }

  if (interaction.member.roles.cache.has(role.id)) {
    return interaction.reply({
      content: "ℹ️ Zaten Streamer rolüne sahipsin.",
      ephemeral: true
    });
  }

  try {
    await interaction.member.roles.add(role);

    await interaction.reply({
      content: "🎥 Streamer rolün verildi!",
      ephemeral: true
    });

    await sendLog(
      interaction.guild,
      "🎥 Streamer Rolü",
      `${interaction.user} Streamer rolünü aldı.`
    );
  } catch {
    await interaction.reply({
      content:
        "❌ Rol verilemedi. Botun rolünün Streamer rolünden yukarıda olduğundan emin ol.",
      ephemeral: true
    });
  }
}

// ======================================================
// WELCOME
// ======================================================

async function welcomeSetup(interaction, channel, role) {
  if (!hasManageGuild(interaction)) {
    return interaction.reply({
      content: "❌ Bu komut için Sunucuyu Yönet yetkisi gerekli.",
      ephemeral: true
    });
  }

  const config = getGuildConfig(interaction.guild.id);

  config.welcome.enabled = true;
  config.welcome.channelId = channel.id;
  config.welcome.autoRoleId = role?.id || null;

  saveGuildConfig(interaction.guild.id, config);

  await interaction.reply({
    content:
      `✅ Hoş geldin kanalı ${channel} olarak ayarlandı.` +
      (role ? `\n👤 Otorol: ${role}` : ""),
    ephemeral: true
  });
}

// ======================================================
// MODERATION
// ======================================================

async function banUser(interaction, member, reason) {
  if (!interaction.memberPermissions?.has(
    PermissionsBitField.Flags.BanMembers
  )) {
    return interaction.reply({
      content: "❌ Ban yetkin yok.",
      ephemeral: true
    });
  }

  if (!member) {
    return interaction.reply({
      content: "❌ Kullanıcı bulunamadı.",
      ephemeral: true
    });
  }

  if (!member.bannable) {
    return interaction.reply({
      content: "❌ Bu kullanıcıyı banlayamıyorum.",
      ephemeral: true
    });
  }

  await member.ban({
    reason: reason || `Yetkili: ${interaction.user.tag}`
  });

  await interaction.reply({
    content: `🔨 ${member.user.tag} banlandı.`,
    ephemeral: true
  });

  await sendLog(
    interaction.guild,
    "🔨 Ban",
    `${member.user.tag} banlandı.\nYetkili: ${interaction.user}\nSebep: ${reason || "Belirtilmedi"}`
  );
}

async function kickUser(interaction, member, reason) {
  if (!interaction.memberPermissions?.has(
    PermissionsBitField.Flags.KickMembers
  )) {
    return interaction.reply({
      content: "❌ Kick yetkin yok.",
      ephemeral: true
    });
  }

  if (!member) {
    return interaction.reply({
      content: "❌ Kullanıcı bulunamadı.",
      ephemeral: true
    });
  }

  if (!member.kickable) {
    return interaction.reply({
      content: "❌ Bu kullanıcıyı kickleyemiyorum.",
      ephemeral: true
    });
  }

  await member.kick(
    reason || `Yetkili: ${interaction.user.tag}`
  );

  await interaction.reply({
    content: `👢 ${member.user.tag} sunucudan atıldı.`,
    ephemeral: true
  });

  await sendLog(
    interaction.guild,
    "👢 Kick",
    `${member.user.tag} kicklendi.\nYetkili: ${interaction.user}\nSebep: ${reason || "Belirtilmedi"}`
  );
}

async function timeoutUser(interaction, member, minutes, reason) {
  if (!interaction.memberPermissions?.has(
    PermissionsBitField.Flags.ModerateMembers
  )) {
    return interaction.reply({
      content: "❌ Timeout yetkin yok.",
      ephemeral: true
    });
  }

  if (!member) {
    return interaction.reply({
      content: "❌ Kullanıcı bulunamadı.",
      ephemeral: true
    });
  }

  if (!member.moderatable) {
    return interaction.reply({
      content: "❌ Bu kullanıcıya timeout uygulayamıyorum.",
      ephemeral: true
    });
  }

  const duration = Math.min(
    Math.max(minutes, 1),
    40320
  );

  await member.timeout(
    duration * 60 * 1000,
    reason || `Yetkili: ${interaction.user.tag}`
  );

  await interaction.reply({
    content:
      `⏱️ ${member.user.tag} ${duration} dakika timeoutlandı.`,
    ephemeral: true
  });

  await sendLog(
    interaction.guild,
    "⏱️ Timeout",
    `${member.user.tag} ${duration} dakika timeoutlandı.\nYetkili: ${interaction.user}\nSebep: ${reason || "Belirtilmedi"}`
  );
}

async function warnUser(interaction, member, reason) {
  if (!hasStaffRole(interaction)) {
    return interaction.reply({
      content: "❌ Yetkin yok.",
      ephemeral: true
    });
  }

  if (!member) {
    return interaction.reply({
      content: "❌ Kullanıcı bulunamadı.",
      ephemeral: true
    });
  }

  const config = getGuildConfig(interaction.guild.id);

  if (!config.warnings[member.id]) {
    config.warnings[member.id] = [];
  }

  config.warnings[member.id].push({
    reason: reason || "Belirtilmedi",
    moderatorId: interaction.user.id,
    date: Date.now()
  });

  saveGuildConfig(interaction.guild.id, config);

  const count = config.warnings[member.id].length;

  await interaction.reply({
    content:
      `⚠️ ${member.user.tag} uyarıldı.\nToplam uyarı: **${count}**`,
    ephemeral: true
  });

  await sendLog(
    interaction.guild,
    "⚠️ Uyarı",
    `${member.user.tag} uyarıldı.\nYetkili: ${interaction.user}\nSebep: ${reason || "Belirtilmedi"}`
  );
}

async function clearMessages(interaction, amount) {
  if (!interaction.memberPermissions?.has(
    PermissionsBitField.Flags.ManageMessages
  )) {
    return interaction.reply({
      content: "❌ Mesajları Yönet yetkin yok.",
      ephemeral: true
    });
  }

  const count = Math.min(Math.max(amount, 1), 100);

  try {
    const deleted = await interaction.channel.bulkDelete(
      count,
      true
    );

    await interaction.reply({
      content: `🧹 ${deleted.size} mesaj silindi.`,
      ephemeral: true
    });
  } catch {
    await interaction.reply({
      content:
        "❌ Mesajlar silinemedi. Discord 14 günden eski mesajların toplu silinmesine izin vermez.",
      ephemeral: true
    });
  }
}

// ======================================================
// SLASH COMMANDS
// ======================================================

const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Discord sunucunu Endless Builder ile oluşturur.")
  .setDMPermission(false);

const changeSetupCommand = new SlashCommandBuilder()
  .setName("setup-degistir")
  .setDescription("Mevcut sunucu şablonunu değiştirir.")
  .setDMPermission(false);

const setupStatusCommand = new SlashCommandBuilder()
  .setName("setup-durum")
  .setDescription("Sunucu Builder durumunu gösterir.")
  .setDMPermission(false);

const clearServerCommand = new SlashCommandBuilder()
  .setName("sunucu-temizle")
  .setDescription("Sunucudaki TÜM kanalları siler.")
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.Administrator
  )
  .setDMPermission(false);

const ticketPanelCommand = new SlashCommandBuilder()
  .setName("ticket-panel")
  .setDescription("Ticket paneli oluşturur.")
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild
  )
  .setDMPermission(false);

const registrationPanelCommand = new SlashCommandBuilder()
  .setName("kayit-panel")
  .setDescription("Kayıt bilgi paneli oluşturur.")
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild
  )
  .setDMPermission(false);

const registrationCommand = new SlashCommandBuilder()
  .setName("kayit")
  .setDescription("Bir kullanıcıyı kayıt eder.")
  .addUserOption(option =>
    option
      .setName("kullanici")
      .setDescription("Kayıt edilecek kullanıcı")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("sebep")
      .setDescription("Kayıt sebebi")
      .setRequired(false)
  )
  .setDMPermission(false);

const streamerPanelCommand = new SlashCommandBuilder()
  .setName("streamer-panel")
  .setDescription("Streamer rol paneli oluşturur.")
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild
  )
  .setDMPermission(false);

const welcomeCommand = new SlashCommandBuilder()
  .setName("hosgeldin-ayarla")
  .setDescription("Hoş geldin ve otorol sistemini ayarlar.")
  .addChannelOption(option =>
    option
      .setName("kanal")
      .setDescription("Hoş geldin kanalı")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addRoleOption(option =>
    option
      .setName("rol")
      .setDescription("Yeni gelenlere verilecek rol")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild
  )
  .setDMPermission(false);

const logCommand = new SlashCommandBuilder()
  .setName("log-kanal")
  .setDescription("Log kanalını ayarlar.")
  .addChannelOption(option =>
    option
      .setName("kanal")
      .setDescription("Log kanalı")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild
  )
  .setDMPermission(false);

const banCommand = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Kullanıcıyı banlar.")
  .addUserOption(option =>
    option
      .setName("kullanici")
      .setDescription("Banlanacak kullanıcı")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("sebep")
      .setDescription("Ban sebebi")
      .setRequired(false)
  )
  .setDMPermission(false);

const kickCommand = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kullanıcıyı sunucudan atar.")
  .addUserOption(option =>
    option
      .setName("kullanici")
      .setDescription("Atılacak kullanıcı")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("sebep")
      .setDescription("Kick sebebi")
      .setRequired(false)
  )
  .setDMPermission(false);

const timeoutCommand = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Kullanıcıya timeout verir.")
  .addUserOption(option =>
    option
      .setName("kullanici")
      .setDescription("Timeout verilecek kullanıcı")
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName("dakika")
      .setDescription("Timeout süresi")
      .setMinValue(1)
      .setMaxValue(40320)
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("sebep")
      .setDescription("Timeout sebebi")
      .setRequired(false)
  )
  .setDMPermission(false);

const warnCommand = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Kullanıcıya uyarı verir.")
  .addUserOption(option =>
    option
      .setName("kullanici")
      .setDescription("Uyarılacak kullanıcı")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("sebep")
      .setDescription("Uyarı sebebi")
      .setRequired(false)
  )
  .setDMPermission(false);

const clearCommand = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Mesajları toplu olarak siler.")
  .addIntegerOption(option =>
    option
      .setName("miktar")
      .setDescription("1-100 arası mesaj")
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true)
  )
  .setDMPermission(false);

// ======================================================
// READY
// ======================================================

client.once("clientReady", async () => {
  console.log(`🤖 Bot giriş yaptı: ${client.user.tag}`);

  const commands = [
    setupCommand,
    changeSetupCommand,
    setupStatusCommand,
    clearServerCommand,
    ticketPanelCommand,
    registrationPanelCommand,
    registrationCommand,
    streamerPanelCommand,
    welcomeCommand,
    logCommand,
    banCommand,
    kickCommand,
    timeoutCommand,
    warnCommand,
    clearCommand
  ];

  try {
    if (process.env.GUILD_ID) {
      const guild = client.guilds.cache.get(
        process.env.GUILD_ID
      );

      if (guild) {
        await guild.commands.set(
          commands.map(command => command.toJSON())
        );

        console.log(
          `✅ ${commands.length} slash komut yüklendi.`
        );
      }
    } else {
      await client.application.commands.set(
        commands.map(command => command.toJSON())
      );

      console.log("✅ Global slash komutlar yüklendi.");
    }
  } catch (error) {
    console.error(
      "Komut yükleme hatası:",
      error
    );
  }
});

// ======================================================
// INTERACTIONS
// ======================================================

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.guild) return;

    // ==================================================
    // SLASH COMMANDS
    // ==================================================

    if (interaction.isChatInputCommand()) {

      // ----------------------------------------------
      // SETUP
      // ----------------------------------------------

      if (interaction.commandName === "setup") {
        const config = getGuildConfig(
          interaction.guild.id
        );

        if (config.setupCompleted) {
          return interaction.reply({
            content:
              "⚠️ Bu sunucu zaten kurulmuş.\n\n" +
              "Değiştirmek için `/setup-degistir` kullan.",
            ephemeral: true
          });
        }

        await interaction.reply({
          content:
            "🚀 **Endless Builder**\n\n" +
            "Sunucunun türünü seç:",
          components: [createSetupMenu()],
          ephemeral: true
        });

        return;
      }

      // ----------------------------------------------
      // SETUP CHANGE
      // ----------------------------------------------

      if (
        interaction.commandName === "setup-degistir"
      ) {
        if (!hasManageGuild(interaction)) {
          return interaction.reply({
            content:
              "❌ Bu komut için Sunucuyu Yönet yetkisi gerekli.",
            ephemeral: true
          });
        }

        await interaction.reply({
          content:
            "🔧 Yeni sunucu şablonunu seç:",
          components: [createSetupMenu()],
          ephemeral: true
        });

        return;
      }

      // ----------------------------------------------
      // SETUP STATUS
      // ----------------------------------------------

      if (
        interaction.commandName === "setup-durum"
      ) {
        const config = getGuildConfig(
          interaction.guild.id
        );

        if (!config.setupCompleted) {
          return interaction.reply({
            content:
              "ℹ️ Bu sunucuda henüz Builder kurulumu yapılmamış.",
            ephemeral: true
          });
        }

        const template =
          templates[config.setupType];

        return interaction.reply({
          content:
            `📊 **Builder Durumu**\n\n` +
            `Şablon: ${template?.emoji || "📁"} ${template?.name || config.setupType}\n` +
            `Kurulum: <t:${Math.floor(config.setupDate / 1000)}:R>\n` +
            `Kanal stili: ${config.channelStyle}\n` +
            `Kategori stili: ${config.categoryStyle}`,
          ephemeral: true
        });
      }

      // ----------------------------------------------
      // CLEAR SERVER
      // ----------------------------------------------

      if (
        interaction.commandName === "sunucu-temizle"
      ) {
        if (!isAdministrator(interaction)) {
          return interaction.reply({
            content:
              "❌ Bu komutu yalnızca sunucu sahibi veya Administrator kullanabilir.",
            ephemeral: true
          });
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("clear_server_confirm")
            .setLabel("EVET, TÜM KANALLARI SİL")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("clear_server_cancel")
            .setLabel("İptal")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content:
            "⚠️ **ÇOK TEHLİKELİ İŞLEM**\n\n" +
            "Bu işlem Builder'ın oluşturduğu veya sizin elle oluşturduğunuz **TÜM KANALLARI** siler.\n\n" +
            "Bu işlem geri alınamaz.\n\n" +
            "Devam etmek istediğine emin misin?",
          components: [row],
          ephemeral: true
        });

        return;
      }

      // ----------------------------------------------
      // TICKET PANEL
      // ----------------------------------------------

      if (
        interaction.commandName === "ticket-panel"
      ) {
        if (!hasManageGuild(interaction)) {
          return interaction.reply({
            content: "❌ Yetkin yok.",
            ephemeral: true
          });
        }

        await createTicketPanel(interaction);
        return;
      }

      // ----------------------------------------------
      // REGISTRATION PANEL
      // ----------------------------------------------

      if (
        interaction.commandName === "kayit-panel"
      ) {
        if (!hasManageGuild(interaction)) {
          return interaction.reply({
            content: "❌ Yetkin yok.",
            ephemeral: true
          });
        }

        await registrationPanel(interaction);
        return;
      }

      // ----------------------------------------------
      // REGISTRATION
      // ----------------------------------------------

      if (
        interaction.commandName === "kayit"
      ) {
        const user =
          interaction.options.getUser("kullanici");

        const member =
          interaction.guild.members.cache.get(
            user.id
          ) ||
          await interaction.guild.members.fetch(
            user.id
          ).catch(() => null);

        const reason =
          interaction.options.getString("sebep");

        await registerUser(
          interaction,
          member,
          reason
        );

        return;
      }

      // ----------------------------------------------
      // STREAMER PANEL
      // ----------------------------------------------

      if (
        interaction.commandName === "streamer-panel"
      ) {
        if (!hasManageGuild(interaction)) {
          return interaction.reply({
            content: "❌ Yetkin yok.",
            ephemeral: true
          });
        }

        await streamerPanel(interaction);
        return;
      }

      // ----------------------------------------------
      // WELCOME
      // ----------------------------------------------

      if (
        interaction.commandName === "hosgeldin-ayarla"
      ) {
        const channel =
          interaction.options.getChannel("kanal");

        const role =
          interaction.options.getRole("rol");

        await welcomeSetup(
          interaction,
          channel,
          role
        );

        return;
      }

      // ----------------------------------------------
      // LOG
      // ----------------------------------------------

      if (
        interaction.commandName === "log-kanal"
      ) {
        if (!hasManageGuild(interaction)) {
          return interaction.reply({
            content: "❌ Yetkin yok.",
            ephemeral: true
          });
        }

        const channel =
          interaction.options.getChannel("kanal");

        const config = getGuildConfig(
          interaction.guild.id
        );

        config.logChannelId = channel.id;

        saveGuildConfig(
          interaction.guild.id,
          config
        );

        await interaction.reply({
          content:
            `✅ Log kanalı ${channel} olarak ayarlandı.`,
          ephemeral: true
        });

        return;
      }

      // ----------------------------------------------
      // BAN
      // ----------------------------------------------

      if (
        interaction.commandName === "ban"
      ) {
        const user =
          interaction.options.getUser("kullanici");

        const member =
          await interaction.guild.members.fetch(
            user.id
          ).catch(() => null);

        const reason =
          interaction.options.getString("sebep");

        await banUser(
          interaction,
          member,
          reason
        );

        return;
      }

      // ----------------------------------------------
      // KICK
      // ----------------------------------------------

      if (
        interaction.commandName === "kick"
      ) {
        const user =
          interaction.options.getUser("kullanici");

        const member =
          await interaction.guild.members.fetch(
            user.id
          ).catch(() => null);

        const reason =
          interaction.options.getString("sebep");

        await kickUser(
          interaction,
          member,
          reason
        );

        return;
      }

      // ----------------------------------------------
      // TIMEOUT
      // ----------------------------------------------

      if (
        interaction.commandName === "timeout"
      ) {
        const user =
          interaction.options.getUser("kullanici");

        const member =
          await interaction.guild.members.fetch(
            user.id
          ).catch(() => null);

        const minutes =
          interaction.options.getInteger("dakika");

        const reason =
          interaction.options.getString("sebep");

        await timeoutUser(
          interaction,
          member,
          minutes,
          reason
        );

        return;
      }

      // ----------------------------------------------
      // WARN
      // ----------------------------------------------

      if (
        interaction.commandName === "warn"
      ) {
        const user =
          interaction.options.getUser("kullanici");

        const member =
          await interaction.guild.members.fetch(
            user.id
          ).catch(() => null);

        const reason =
          interaction.options.getString("sebep");

        await warnUser(
          interaction,
          member,
          reason
        );

        return;
      }

      // ----------------------------------------------
      // CLEAR
      // ----------------------------------------------

      if (
        interaction.commandName === "clear"
      ) {
        const amount =
          interaction.options.getInteger("miktar");

        await clearMessages(
          interaction,
          amount
        );

        return;
      }
    }

    // ==================================================
    // SELECT MENUS
    // ==================================================

    if (interaction.isStringSelectMenu()) {

      // ----------------------------------------------
      // SETUP TYPE
      // ----------------------------------------------

      if (
        interaction.customId === "setup_type"
      ) {
        const type =
          interaction.values[0];

        const key = sessionKey(
          interaction.guild.id,
          interaction.user.id
        );

        setupSessions.set(key, {
          type,
          channelStyle: "emoji",
          categoryStyle: "emoji"
        });

        await interaction.update({
          content:
            `✅ **${templates[type].name}** seçildi.\n\n` +
            "Şimdi kanal görünümünü seç:",
          components: [
            createChannelStyleMenu()
          ]
        });

        return;
      }

      // ----------------------------------------------
      // CHANNEL STYLE
      // ----------------------------------------------

      if (
        interaction.customId ===
        "setup_channel_style"
      ) {
        const key = sessionKey(
          interaction.guild.id,
          interaction.user.id
        );

        const session =
          setupSessions.get(key);

        if (!session) {
          return interaction.update({
            content:
              "❌ Kurulum oturumun bulunamadı. `/setup` ile tekrar başla.",
            components: []
          });
        }

        session.channelStyle =
          interaction.values[0];

        setupSessions.set(
          key,
          session
        );

        await interaction.update({
          content:
            "✅ Kanal stili seçildi.\n\n" +
            "Şimdi kategori görünümünü seç:",
          components: [
            createCategoryStyleMenu()
          ]
        });

        return;
      }

      // ----------------------------------------------
      // CATEGORY STYLE
      // ----------------------------------------------

      if (
        interaction.customId ===
        "setup_category_style"
      ) {
        const key = sessionKey(
          interaction.guild.id,
          interaction.user.id
        );

        const session =
          setupSessions.get(key);

        if (!session) {
          return interaction.update({
            content:
              "❌ Kurulum oturumun bulunamadı.",
            components: []
          });
        }

        session.categoryStyle =
          interaction.values[0];

        setupSessions.set(
          key,
          session
        );

        await interaction.update({
          content:
            "📋 **Kurulum Özeti**\n\n" +
            createSummary(session) +
            "\n\nKurulumu başlatmak için aşağıdaki butona bas:",
          components: [
            createSetupButtons()
          ]
        });

        return;
      }
    }

    // ==================================================
    // BUTTONS
    // ==================================================

    if (interaction.isButton()) {

      // ----------------------------------------------
      // SETUP CREATE
      // ----------------------------------------------

      if (
        interaction.customId === "setup_create"
      ) {
        const key = sessionKey(
          interaction.guild.id,
          interaction.user.id
        );

        const session =
          setupSessions.get(key);

        if (!session) {
          return interaction.update({
            content:
              "❌ Kurulum oturumun bulunamadı. `/setup` ile tekrar başla.",
            components: []
          });
        }

        await interaction.update({
          content:
            "⏳ Sunucu oluşturuluyor...\n" +
            "Kanallar, kategoriler ve roller hazırlanıyor.",
          components: []
        });

        try {
          const config =
            getGuildConfig(
              interaction.guild.id
            );

          if (config.setupCompleted) {
            await interaction.editReply({
              content:
                "⚠️ Bu sunucu zaten kurulmuş. Değiştirmek için `/setup-degistir` kullan.",
              components: []
            });

            return;
          }

          const result =
            await buildServer(
              interaction.guild,
              session.type,
              session
            );

          setupSessions.delete(key);

          await interaction.editReply({
            content:
              "🎉 **Sunucu kurulumu tamamlandı!**\n\n" +
              `📁 Kategori: **${result.categories}**\n` +
              `📄 Kanal: **${result.channels}**\n` +
              `🎭 Rol: **${result.roles}**\n\n` +
              "Ek sistemler:\n" +
              "🎫 Ticket\n" +
              "📝 Kayıt\n" +
              "🎥 Streamer\n" +
              "🛡️ Moderasyon\n" +
              "👋 Hoş geldin / Otorol\n" +
              "📋 Log sistemi\n\n" +
              "Panelleri istediğin kanalda ilgili komutlarla oluşturabilirsin.",
            components: []
          });
        } catch (error) {
          console.error(
            "BUILD ERROR:",
            error
          );

          await interaction.editReply({
            content:
              "❌ Sunucu oluşturulurken hata oluştu.\n\n" +
              `\`${error.message}\``,
            components: []
          });
        }

        return;
      }

      // ----------------------------------------------
      // SETUP CANCEL
      // ----------------------------------------------

      if (
        interaction.customId === "setup_cancel"
      ) {
        const key = sessionKey(
          interaction.guild.id,
          interaction.user.id
        );

        setupSessions.delete(key);

        await interaction.update({
          content:
            "❌ Kurulum iptal edildi.",
          components: []
        });

        return;
      }

      // ----------------------------------------------
      // CLEAR CONFIRM
      // ----------------------------------------------

      if (
        interaction.customId ===
        "clear_server_confirm"
      ) {
        if (!isAdministrator(interaction)) {
          return interaction.update({
            content:
              "❌ Bu işlemi yalnızca sunucu sahibi veya Administrator yapabilir.",
            components: []
          });
        }

        await interaction.update({
          content:
            "🗑️ **TÜM KANALLAR SİLİNİYOR...**\n\n" +
            "Lütfen bekle.",
          components: []
        });

        try {
          const deleted =
            await deleteAllChannels(
              interaction.guild
            );

          console.log(
            `${interaction.guild.name}: ${deleted} kanal silindi.`
          );
        } catch (error) {
          console.error(
            "CLEAR SERVER ERROR:",
            error
          );
        }

        return;
      }

      // ----------------------------------------------
      // CLEAR CANCEL
      // ----------------------------------------------

      if (
        interaction.customId ===
        "clear_server_cancel"
      ) {
        await interaction.update({
          content:
            "✅ İşlem iptal edildi. Hiçbir kanal silinmedi.",
          components: []
        });

        return;
      }

      // ----------------------------------------------
      // TICKET OPEN
      // ----------------------------------------------

      if (
        interaction.customId === "ticket_open"
      ) {
        await openTicket(interaction);
        return;
      }

      // ----------------------------------------------
      // TICKET CLOSE
      // ----------------------------------------------

      if (
        interaction.customId === "ticket_close"
      ) {
        await closeTicket(interaction);
        return;
      }

      // ----------------------------------------------
      // STREAMER ROLE
      // ----------------------------------------------

      if (
        interaction.customId ===
        "streamer_get_role"
      ) {
        await giveStreamerRole(interaction);
        return;
      }
    }

  } catch (error) {
    console.error(
      "INTERACTION ERROR:",
      error
    );

    try {
      if (interaction.replied) {
        await interaction.followUp({
          content:
            "❌ İşlem sırasında beklenmeyen bir hata oluştu.",
          ephemeral: true
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content:
            "❌ İşlem sırasında beklenmeyen bir hata oluştu."
        });
      } else {
        await interaction.reply({
          content:
            "❌ İşlem sırasında beklenmeyen bir hata oluştu.",
          ephemeral: true
        });
      }
    } catch {}
  }
});

// ======================================================
// MEMBER JOIN
// ======================================================

client.on("guildMemberAdd", async member => {
  try {
    const config =
      getGuildConfig(member.guild.id);

    // Kayıtsız rol
    if (
      config.registration?.unregisteredRoleId
    ) {
      const role =
        member.guild.roles.cache.get(
          config.registration.unregisteredRoleId
        );

      if (role) {
        try {
          await member.roles.add(role);
        } catch {}
      }
    }

    // Hoş geldin
    if (
      config.welcome?.enabled &&
      config.welcome.channelId
    ) {
      const channel =
        member.guild.channels.cache.get(
          config.welcome.channelId
        );

      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle("👋 Hoş Geldin!")
          .setDescription(
            `Hoş geldin ${member}!\n` +
            `Sunucumuzda artık **${member.guild.memberCount}** kişiyiz.`
          )
          .setTimestamp();

        try {
          await channel.send({
            embeds: [embed]
          });
        } catch {}
      }
    }

    // Otorol
    if (
      config.welcome?.autoRoleId &&
      config.welcome.autoRoleId !==
        config.registration?.unregisteredRoleId
    ) {
      const role =
        member.guild.roles.cache.get(
          config.welcome.autoRoleId
        );

      if (role) {
        try {
          await member.roles.add(role);
        } catch {}
      }
    }

  } catch (error) {
    console.error(
      "MEMBER JOIN ERROR:",
      error
    );
  }
});

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
});

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