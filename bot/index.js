const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Sunucun için hazır bir yapı oluşturur.")
  .setDefaultMemberPermissions(
    PermissionsBitField.Flags.ManageGuild.toString()
  );

client.once("clientReady", async () => {
  console.log(`✅ ${client.user.tag} aktif!`);

  try {
    await client.application.commands.set(
      [setupCommand.toJSON()],
      process.env.GUILD_ID
    );

    console.log("✅ /setup komutu kaydedildi!");
  } catch (error) {
    console.error("❌ Komut kayıt hatası:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "setup") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("setup_type")
        .setPlaceholder("Sunucu türünü seç...")
        .addOptions(
          {
            label: "Oyun Sunucusu",
            description: "Oyun odaklı Discord sunucusu oluşturur.",
            value: "gaming",
            emoji: "🎮"
          },
          {
            label: "Community",
            description: "Genel topluluk sunucusu oluşturur.",
            value: "community",
            emoji: "👥"
          },
          {
            label: "Streamer",
            description: "Yayıncı ve içerik üreticileri için.",
            value: "streamer",
            emoji: "🎥"
          },
          {
            label: "Public",
            description: "Genel public Discord yapısı.",
            value: "public",
            emoji: "🌐"
          }
        );

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.reply({
        content: "🛠️ **Endless Builder**\n\nSunucu türünü seç:",
        components: [row],
        ephemeral: true
      });
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId !== "setup_type") return;

    await interaction.deferUpdate();

    const type = interaction.values[0];

    const templates = {
      gaming: {
        category: "🎮 OYUN",
        channels: [
          ["📢・duyurular", "text"],
          ["💬・sohbet", "text"],
          ["🎮・oyun", "text"],
          ["🔊・Genel", "voice"]
        ],
        roles: ["🎮 Oyuncu", "🏆 Şampiyon"]
      },

      community: {
        category: "👥 COMMUNITY",
        channels: [
          ["📜・kurallar", "text"],
          ["📢・duyurular", "text"],
          ["💬・sohbet", "text"],
          ["🎫・destek", "text"],
          ["🔊・Sohbet", "voice"]
        ],
        roles: ["👤 Üye", "🛡️ Yetkili"]
      },

      streamer: {
        category: "🎥 STREAMER",
        channels: [
          ["📢・yayın-duyuruları", "text"],
          ["🎥・yayıncı-sohbet", "text"],
          ["📺・streamer-başvuru", "text"],
          ["🔊・Yayın Odası", "voice"]
        ],
        roles: ["🎥 Streamer", "⭐ İçerik Üreticisi"]
      },

      public: {
        category: "🌐 PUBLIC",
        channels: [
          ["📜・kurallar", "text"],
          ["📢・duyurular", "text"],
          ["💬・genel-sohbet", "text"],
          ["🎫・destek", "text"],
          ["🎁・çekilişler", "text"],
          ["🔊・Genel", "voice"]
        ],
        roles: ["👤 Üye", "🛡️ Yetkili", "👑 Yönetici"]
      }
    };

    const template = templates[type];

    if (!template) {
      return interaction.editReply({
        content: "❌ Geçersiz sunucu türü.",
        components: []
      });
    }

    const guild = interaction.guild;

    try {
      // Kategori oluştur veya mevcut olanı kullan
      let category = guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name === template.category
      );

      if (!category) {
        category = await guild.channels.create({
          name: template.category,
          type: ChannelType.GuildCategory
        });
      }

      // Kanalları oluştur
      for (const [name, channelType] of template.channels) {
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
      }

      // Rolleri oluştur
      for (const roleName of template.roles) {
        const exists = guild.roles.cache.find(
          role => role.name === roleName
        );

        if (exists) continue;

        await guild.roles.create({
          name: roleName,
          reason: "Endless Builder server setup"
        });
      }

      await interaction.editReply({
        content:
          `✅ **${template.category}** kurulumu tamamlandı!\n\n` +
          `📁 Kategori: **1**\n` +
          `📺 Kanallar: **${template.channels.length}**\n` +
          `🎭 Roller: **${template.roles.length}**\n\n` +
          `🚀 Endless Builder sunucunuzu hazırladı.`,
        components: []
      });

    } catch (error) {
      console.error("Setup hatası:", error);

      await interaction.editReply({
        content:
          "❌ Kurulum sırasında bir hata oluştu.\n" +
          "Botun **Kanalları Yönet** ve **Rolleri Yönet** yetkilerini kontrol et.",
        components: []
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error("❌ Discord bağlantı hatası:", error.message);
});