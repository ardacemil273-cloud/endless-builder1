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
// KOMUTLAR
// ==============================

const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Sunucu Builder kurulumunu başlatır.")
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
    label: "Oyun",
    emoji: "🎮",

    categories: [
      {
        name: "📌 BİLGİ",
        channels: [
          ["📜・kurallar", "text"],
          ["📢・duyurular", "text"]
        ]
      },
      {
        name: "🎮 OYUN",
        channels: [
          ["🎮・oyun-sohbet", "text"],
          ["🏆・etkinlikler", "text"],
          ["🔊・Genel", "voice"],
          ["🔊・Oyun 1", "voice"]
        ]
      },
      {
        name: "💬 TOPLULUK",
        channels: [
          ["💬・sohbet", "text"],
          ["🤖・bot-komutları", "text"],
          ["🎨・medya", "text"]
        ]
      },
      {
        name: "🎫 DESTEK",
        channels: [
          ["🎫・ticket", "text"],
          ["❓・yardım", "text"]
        ]
      }
    ],

    roles: [
      "🎮 Oyuncu",
      "🏆 Şampiyon",
      "🛡️ Yetkili",
      "👑 Yönetici"
    ]
  },


  community: {
    label: "Community",
    emoji: "👥",

    categories: [
      {
        name: "📌 BİLGİ",
        channels: [
          ["📜・kurallar", "text"],
          ["📢・duyurular", "text"],
          ["📋・bilgilendirme", "text"]
        ]
      },
      {
        name: "💬 TOPLULUK",
        channels: [
          ["💬・sohbet", "text"],
          ["🤖・bot-komutları", "text"],
          ["🎨・medya", "text"],
          ["🔊・Sohbet", "voice"]
        ]
      },
      {
        name: "🎫 DESTEK",
        channels: [
          ["🎫・ticket", "text"],
          ["📩・destek", "text"]
        ]
      }
    ],

    roles: [
      "👤 Üye",
      "🛡️ Yetkili",
      "👑 Yönetici"
    ]
  },


  streamer: {
    label: "Streamer",
    emoji: "🎥",

    categories: [
      {
        name: "📌 BİLGİ",
        channels: [
          ["📜・kurallar", "text"],
          ["📢・duyurular", "text"]
        ]
      },
      {
        name: "🎥 STREAMER",
        channels: [
          ["📢・yayın-duyuruları", "text"],
          ["🎥・yayıncı-sohbet", "text"],
          ["📺・streamer-başvuru", "text"],
          ["🎁・çekilişler", "text"]
        ]
      },
      {
        name: "🔊 SES",
        channels: [
          ["🔊・Yayın Odası", "voice"],
          ["🔊・Genel", "voice"]
        ]
      }
    ],

    roles: [
      "🎥 Streamer",
      "⭐ İçerik Üreticisi",
      "🛡️ Yetkili",
      "👑 Yönetici"
    ]
  },


  public: {
    label: "Public",
    emoji: "🌐",

    categories: [
      {
        name: "📌 BİLGİ",
        channels: [
          ["📜・kurallar", "text"],
          ["📢・duyurular", "text"],
          ["📋・bilgilendirme", "text"]
        ]
      },
      {
        name: "💬 TOPLULUK",
        channels: [
          ["💬・sohbet", "text"],
          ["🤖・bot-komutları", "text"],
          ["🎨・medya", "text"],
          ["🎮・oyun", "text"]
        ]
      },
      {
        name: "🎫 DESTEK",
        channels: [
          ["🎫・ticket", "text"],
          ["📩・destek", "text"],
          ["❓・yardım", "text"]
        ]
      },
      {
        name: "🎮 OYUN",
        channels: [
          ["🎮・oyun-sohbet", "text"],
          ["🏆・etkinlikler", "text"],
          ["🎁・çekilişler", "text"],
          ["🔊・Genel", "voice"],
          ["🔊・Oyun 1", "voice"]
        ]
      },
      {
        name: "👑 YÖNETİM",
        channels: [
          ["🔒・yetkili", "text"],
          ["📋・log", "text"],
          ["📊・istatistik", "text"]
        ]
      }
    ],

    roles: [
      "👑 Yönetici",
      "🛡️ Yetkili",
      "🎫 Destek Ekibi",
      "⭐ Booster",
      "👤 Üye",
      "🤖 Bot"
    ]
  }
};


// ==============================
// MENÜ
// ==============================

function createSetupMenu() {

  return new StringSelectMenuBuilder()
    .setCustomId("setup_type")
    .setPlaceholder("Sunucu türünü seç...")

    .addOptions(
      {
        label: "Oyun Sunucusu",
        description: "Oyun odaklı Discord sunucusu.",
        value: "gaming",
        emoji: "🎮"
      },
      {
        label: "Community",
        description: "Topluluk sunucusu.",
        value: "community",
        emoji: "👥"
      },
      {
        label: "Streamer",
        description: "Yayıncı sunucusu.",
        value: "streamer",
        emoji: "🎥"
      },
      {
        label: "Public",
        description: "Profesyonel public sunucu.",
        value: "public",
        emoji: "🌐"
      }
    );
}


// ==============================
// KURULUM
// ==============================

async function buildServer(guild, type) {

  const template = templates[type];

  let categoriesCreated = 0;
  let channelsCreated = 0;
  let rolesCreated = 0;

  for (const categoryData of template.categories) {

    let category = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === categoryData.name
    );

    if (!category) {

      category = await guild.channels.create({
        name: categoryData.name,
        type: ChannelType.GuildCategory
      });

      categoriesCreated++;
    }

    for (const [name, channelType] of categoryData.channels) {

      const exists = guild.channels.cache.find(
        channel =>
          channel.name === name &&
          channel.parentId === category.id
      );

      if (exists) continue;

      await guild.channels.create({
        name: name,

        type:
          channelType === "voice"
            ? ChannelType.GuildVoice
            : ChannelType.GuildText,

        parent: category.id
      });

      channelsCreated++;
    }
  }


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
      categoryNames.add(category.name);
    }
  }


  const categories = guild.channels.cache.filter(
    channel =>
      channel.type === ChannelType.GuildCategory &&
      categoryNames.has(channel.name)
  );


  for (const category of categories.values()) {

    const children = guild.channels.cache.filter(
      channel => channel.parentId === category.id
    );

    for (const channel of children.values()) {
      try {
        await channel.delete("Endless Builder setup değiştirildi");
      } catch (error) {
        console.error("Kanal silinemedi:", error.message);
      }
    }

    try {
      await category.delete(
        "Endless Builder setup değiştirildi"
      );
    } catch (error) {
      console.error("Kategori silinemedi:", error.message);
    }
  }


  const roleNames = new Set();

  for (const template of Object.values(templates)) {
    for (const role of template.roles) {
      roleNames.add(role);
    }
  }


  const roles = guild.roles.cache.filter(
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
      console.error("Rol silinemedi:", error.message);
    }
  }
}


// ==============================
// READY
// ==============================

client.once("clientReady", async () => {

  console.log(`✅ ${client.user.tag} aktif!`);

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
      "✅ /setup, /setup-degistir ve /setup-durum kaydedildi!"
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

client.on("interactionCreate", async interaction => {

  const data = loadData();


  // ==========================
  // /setup
  // ==========================

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "setup"
  ) {

    const server = data[interaction.guild.id];

    if (server?.setupCompleted) {

      const selectedTemplate =
        templates[server.setupType];

      return interaction.reply({
        content:
          "❌ **Bu sunucu daha önce kuruldu!**\n\n" +

          `Seçilen yapı: **${selectedTemplate?.emoji || "📁"} ${selectedTemplate?.label || server.setupType}**\n\n` +

          "Başka bir yapıya geçmek istiyorsan:\n" +
          "`/setup-degistir` komutunu kullan.",
        ephemeral: true
      });
    }


    const row = new ActionRowBuilder()
      .addComponents(createSetupMenu());


    return interaction.reply({
      content:
        "🛠️ **Endless Builder**\n\n" +
        "Sunucun için bir yapı seç:",

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

    const server = data[interaction.guild.id];

    if (!server?.setupCompleted) {

      return interaction.reply({
        content:
          "❌ Bu sunucuda henüz bir Builder kurulumu yok.\n\n" +
          "`/setup` kullanarak başlayabilirsin.",
        ephemeral: true
      });
    }


    const row = new ActionRowBuilder()
      .addComponents(createSetupMenu());


    return interaction.reply({
      content:
        "⚠️ **Kurulum değiştirilecek!**\n\n" +
        "Yeni bir yapı seçtiğinde mevcut Builder kategorileri, kanalları ve rolleri temizlenip yeni yapı oluşturulacak.\n\n" +
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

    const server = data[interaction.guild.id];

    if (!server?.setupCompleted) {

      return interaction.reply({
        content:
          "📊 **Builder Durumu**\n\n" +
          "❌ Henüz bir kurulum yapılmamış.\n\n" +
          "Başlamak için `/setup` kullan.",
        ephemeral: true
      });
    }


    const template = templates[server.setupType];

    return interaction.reply({
      content:
        "📊 **Endless Builder Durumu**\n\n" +
        `🏗️ Yapı: **${template?.emoji || "📁"} ${template?.label || server.setupType}**\n` +
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

    const type = interaction.values[0];
    const template = templates[type];

    if (!template) return;

    const dataNow = loadData();
    const server = dataNow[interaction.guild.id];


    // Daha önce kurulmuşsa
    if (server?.setupCompleted) {

      const buttons = new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId(`change_confirm_${type}`)
            .setLabel("Evet, değiştir")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("change_cancel")
            .setLabel("İptal")
            .setStyle(ButtonStyle.Secondary)

        );


      return interaction.update({
        content:
          `⚠️ **${template.emoji} ${template.label}** seçtin.\n\n` +

          "Mevcut Builder kurulumu silinip yeni yapı oluşturulacak.\n\n" +

          "Devam etmek istiyor musun?",

        components: [buttons]
      });
    }


    await interaction.deferUpdate();


    try {

      const result =
        await buildServer(interaction.guild, type);


      dataNow[interaction.guild.id] = {

        setupCompleted: true,

        setupType: type,

        setupDate: Date.now()
      };

      saveData(dataNow);


      await interaction.editReply({

        content:
          `🎉 **${template.emoji} ${template.label} kurulumu tamamlandı!**\n\n` +

          `📁 Yeni kategoriler: **${result.categoriesCreated}**\n` +
          `📺 Yeni kanallar: **${result.channelsCreated}**\n` +
          `🎭 Yeni roller: **${result.rolesCreated}**\n\n` +

          "🔒 Bu sunucunun Builder seçimi kaydedildi.\n\n" +

          "Değiştirmek için `/setup-degistir` kullanabilirsin.",

        components: []
      });

    } catch (error) {

      console.error("Setup hatası:", error);

      await interaction.editReply({
        content:
          "❌ Kurulum sırasında hata oluştu.\n\n" +
          "Botun **Kanalları Yönet** ve **Rolleri Yönet** yetkilerini kontrol et.",

        components: []
      });
    }
  }


  // ==========================
  // DEĞİŞİKLİK ONAYI
  // ==========================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith("change_confirm_")
  ) {

    const type =
      interaction.customId.replace(
        "change_confirm_",
        ""
      );

    const template = templates[type];

    if (!template) return;


    await interaction.update({
      content:
        `🔄 **${template.label}** yapısına geçiliyor...\n\n` +
        "Eski Builder yapısı temizleniyor.",

      components: []
    });


    try {

      await removeBuilderStructure(
        interaction.guild
      );


      const result =
        await buildServer(
          interaction.guild,
          type
        );


      const dataNow = loadData();

      dataNow[interaction.guild.id] = {

        setupCompleted: true,

        setupType: type,

        setupDate: Date.now()
      };

      saveData(dataNow);


      await interaction.editReply({

        content:
          `✅ **${template.emoji} ${template.label}** yapısına geçildi!\n\n` +

          `📁 Kategoriler: **${result.categoriesCreated}**\n` +
          `📺 Kanallar: **${result.channelsCreated}**\n` +
          `🎭 Roller: **${result.rolesCreated}**\n\n` +

          "🚀 Builder kurulumu güncellendi.",

        components: []
      });

    } catch (error) {

      console.error(
        "Setup değiştirme hatası:",
        error
      );

      await interaction.editReply({

        content:
          "❌ Yapı değiştirilirken hata oluştu.\n\n" +
          "Botun kanal ve rol yönetme yetkilerini kontrol et.",

        components: []
      });
    }
  }


  // ==========================
  // İPTAL
  // ==========================

  if (
    interaction.isButton() &&
    interaction.customId === "change_cancel"
  ) {

    await interaction.update({

      content:
        "❌ **İşlem iptal edildi.**\n\n" +
        "Mevcut sunucu yapın korunuyor.",

      components: []
    });
  }

});


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
