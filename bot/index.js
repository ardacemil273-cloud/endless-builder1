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


// KATEGORİ OLUŞTUR
async function getOrCreateCategory(guild, name) {
  let category = guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === name
  );

  if (!category) {
    category = await guild.channels.create({
      name: name,
      type: ChannelType.GuildCategory
    });
  }

  return category;
}


// KANAL OLUŞTUR
async function getOrCreateChannel(guild, name, type, category) {
  const existing = guild.channels.cache.find(
    channel =>
      channel.name === name &&
      channel.parentId === category.id
  );

  if (existing) return existing;

  return await guild.channels.create({
    name: name,
    type: type,
    parent: category.id
  });
}


// ROL OLUŞTUR
async function getOrCreateRole(guild, name) {
  const existing = guild.roles.cache.find(
    role => role.name === name
  );

  if (existing) return existing;

  return await guild.roles.create({
    name: name,
    reason: "Endless Builder server setup"
  });
}


client.on("interactionCreate", async interaction => {

  // /setup
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
            description: "Profesyonel public Discord yapısı.",
            value: "public",
            emoji: "🌐"
          }
        );

      const row = new ActionRowBuilder()
        .addComponents(menu);

      await interaction.reply({
        content:
          "🛠️ **Endless Builder**\n\n" +
          "Sunucu türünü seç:",
        components: [row],
        ephemeral: true
      });
    }
  }


  // MENÜ
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId !== "setup_type") return;

    await interaction.deferUpdate();

    const type = interaction.values[0];

    const guild = interaction.guild;

    try {

      // =========================
      // PUBLIC
      // =========================

      if (type === "public") {

        let categoryCount = 0;
        let channelCount = 0;
        let roleCount = 0;


        // 📌 BİLGİ
        const info = await getOrCreateCategory(
          guild,
          "📌 BİLGİ"
        );

        categoryCount++;

        await getOrCreateChannel(
          guild,
          "📜・kurallar",
          ChannelType.GuildText,
          info
        );

        await getOrCreateChannel(
          guild,
          "📢・duyurular",
          ChannelType.GuildText,
          info
        );

        await getOrCreateChannel(
          guild,
          "📋・bilgilendirme",
          ChannelType.GuildText,
          info
        );

        channelCount += 3;


        // 💬 TOPLULUK
        const community = await getOrCreateCategory(
          guild,
          "💬 TOPLULUK"
        );

        categoryCount++;

        await getOrCreateChannel(
          guild,
          "💬・sohbet",
          ChannelType.GuildText,
          community
        );

        await getOrCreateChannel(
          guild,
          "🤖・bot-komutları",
          ChannelType.GuildText,
          community
        );

        await getOrCreateChannel(
          guild,
          "🎨・medya",
          ChannelType.GuildText,
          community
        );

        await getOrCreateChannel(
          guild,
          "🎮・oyun",
          ChannelType.GuildText,
          community
        );

        channelCount += 4;


        // 🎫 DESTEK
        const support = await getOrCreateCategory(
          guild,
          "🎫 DESTEK"
        );

        categoryCount++;

        await getOrCreateChannel(
          guild,
          "🎫・ticket",
          ChannelType.GuildText,
          support
        );

        await getOrCreateChannel(
          guild,
          "📩・destek",
          ChannelType.GuildText,
          support
        );

        await getOrCreateChannel(
          guild,
          "❓・yardım",
          ChannelType.GuildText,
          support
        );

        channelCount += 3;


        // 🎮 OYUN
        const games = await getOrCreateCategory(
          guild,
          "🎮 OYUN"
        );

        categoryCount++;

        await getOrCreateChannel(
          guild,
          "🎮・oyun-sohbet",
          ChannelType.GuildText,
          games
        );

        await getOrCreateChannel(
          guild,
          "🏆・etkinlikler",
          ChannelType.GuildText,
          games
        );

        await getOrCreateChannel(
          guild,
          "🎁・çekilişler",
          ChannelType.GuildText,
          games
        );

        await getOrCreateChannel(
          guild,
          "🔊・Genel",
          ChannelType.GuildVoice,
          games
        );

        await getOrCreateChannel(
          guild,
          "🔊・Oyun 1",
          ChannelType.GuildVoice,
          games
        );

        channelCount += 5;


        // 👑 YÖNETİM
        const staff = await getOrCreateCategory(
          guild,
          "👑 YÖNETİM"
        );

        categoryCount++;

        await getOrCreateChannel(
          guild,
          "🔒・yetkili",
          ChannelType.GuildText,
          staff
        );

        await getOrCreateChannel(
          guild,
          "📋・log",
          ChannelType.GuildText,
          staff
        );

        await getOrCreateChannel(
          guild,
          "📊・istatistik",
          ChannelType.GuildText,
          staff
        );

        channelCount += 3;


        // ROLLER

        const roles = [
          "👑 Yönetici",
          "🛡️ Yetkili",
          "🎫 Destek Ekibi",
          "⭐ Booster",
          "👤 Üye",
          "🤖 Bot"
        ];

        for (const roleName of roles) {

          const existing = guild.roles.cache.find(
            role => role.name === roleName
          );

          if (!existing) {
            await guild.roles.create({
              name: roleName,
              reason: "Endless Builder Public Setup"
            });

            roleCount++;
          }
        }


        await interaction.editReply({
          content:
            "🎉 **PUBLIC SUNUCU KURULDU!**\n\n" +
            `📁 Kategoriler: **${categoryCount}**\n` +
            `📺 Kanallar: **${channelCount}**\n` +
            `🎭 Yeni roller: **${roleCount}**\n\n` +
            "🚀 Endless Builder kurulumu tamamladı!",
          components: []
        });

        return;
      }


      // =========================
      // DİĞER ŞABLONLAR
      // =========================

      const templates = {

        gaming: {
          category: "🎮 OYUN",
          channels: [
            ["📢・duyurular", "text"],
            ["💬・sohbet", "text"],
            ["🎮・oyun", "text"],
            ["🏆・etkinlikler", "text"],
            ["🔊・Genel", "voice"]
          ],
          roles: [
            "🎮 Oyuncu",
            "🏆 Şampiyon"
          ]
        },

        community: {
          category: "👥 COMMUNITY",
          channels: [
            ["📜・kurallar", "text"],
            ["📢・duyurular", "text"],
            ["💬・sohbet", "text"],
            ["🎫・destek", "text"],
            ["🎁・çekilişler", "text"],
            ["🔊・Sohbet", "voice"]
          ],
          roles: [
            "👤 Üye",
            "🛡️ Yetkili"
          ]
        },

        streamer: {
          category: "🎥 STREAMER",
          channels: [
            ["📢・yayın-duyuruları", "text"],
            ["🎥・yayıncı-sohbet", "text"],
            ["📺・streamer-başvuru", "text"],
            ["🎁・çekilişler", "text"],
            ["🔊・Yayın Odası", "voice"]
          ],
          roles: [
            "🎥 Streamer",
            "⭐ İçerik Üreticisi"
          ]
        }

      };


      const template = templates[type];

      if (!template) {
        await interaction.editReply({
          content: "❌ Geçersiz sunucu türü.",
          components: []
        });

        return;
      }


      // Kategori
      const category = await getOrCreateCategory(
        guild,
        template.category
      );


      // Kanallar
      for (const [name, channelType] of template.channels) {

        await getOrCreateChannel(
          guild,
          name,
          channelType === "voice"
            ? ChannelType.GuildVoice
            : ChannelType.GuildText,
          category
        );

      }


      // Roller
      for (const roleName of template.roles) {

        await getOrCreateRole(
          guild,
          roleName
        );

      }


      await interaction.editReply({
        content:
          `✅ **${template.category}** kurulumu tamamlandı!\n\n` +
          `📁 Kategori: **1**\n` +
          `📺 Kanallar: **${template.channels.length}**\n` +
          `🎭 Roller: **${template.roles.length}**\n\n` +
          "🚀 Endless Builder kurulumu tamamladı.",
        components: []
      });


    } catch (error) {

      console.error("❌ Setup hatası:", error);

      if (interaction.deferred) {

        await interaction.editReply({
          content:
            "❌ Kurulum sırasında hata oluştu.\n\n" +
            "Botun şu yetkilere sahip olduğundan emin ol:\n" +
            "• Kanalları Yönet\n" +
            "• Rolleri Yönet",
          components: []
        });

      }

    }

  }

});


client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error(
    "❌ Discord bağlantı hatası:",
    error.message
  );
});