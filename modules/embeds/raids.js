const Discord = require('discord.js');
const Embed_Config = require('../../config/embed_raids.js');
const Embed_EggConfig = require('../../config/embed_raid_eggs.js');

module.exports.run = async (MAIN, target, raid, raid_type, main_area, sub_area, embed_area, server, timezone, role_id) => {

  // CHECK IF THE TARGET IS A USER
  let member = MAIN.guilds.get(server.id).members.get(target.user_id);

  // VARIABLES
  let time_now = new Date().getTime();
  let hatch_time = MAIN.Bot_Time(raid.start, '1', timezone);
  let end_time = MAIN.Bot_Time(raid.end, '1', timezone);
  let hatch_mins = Math.floor((raid.start-(time_now/1000))/60);
  let end_mins = Math.floor((raid.end-(time_now/1000))/60);

  // GET STATIC MAP TILE
  let img_url = '';
  if(MAIN.config.Map_Tiles == 'ENABLED'){
    img_url = await MAIN.Static_Map_Tile(raid.latitude, raid.longitude, 'raid');
  }

  let map_url = MAIN.config.FRONTEND_URL;

  // DETERMINE GYM CONTROL
  let defending_team = '';
  switch(raid.team_id){
    case 1: defending_team = MAIN.emotes.mystic+' Gym'; break;
    case 2: defending_team = MAIN.emotes.valor+' Gym'; break;
    case 3: defending_team = MAIN.emotes.instinct+' Gym'; break;
    default: defending_team = 'Uncontested Gym';
  }

  // GET RAID LEVEL
  let embed_color = '';
  switch(raid.level){
    case 1:
    case 2: embed_color = 'f358fb'; break;
    case 3:
    case 4: embed_color = 'ffd300'; break;
    case 5: embed_color = '5b00de'; break;
  }

  // CHECK IF SPONSORED GYM
  let raid_sponsor = '';
  if(raid.sponsor_id == true){ raid_sponsor = ' | '+MAIN.emotes.exPass+' Eligible'; }
  if(raid.ex_raid_eligible == true){ raid_sponsor = ' | '+MAIN.emotes.exPass+' Eligible'; }

  // CHECK IF EXCLUSIVE RAID
  let is_exclusive = '';
  if(raid.is_exclusive == true){ is_exclusive = '**EXRaid Invite Only** '; }

  // CHECK FOR GYM NAME
  let gym_name = '';
  if(!raid.gym_name){ gym_name = 'No Name'; }
  else{ gym_name = raid.gym_name; }

  // DETERMINE IF IT'S AN EGG OR A RAID
  let embed_thumb = '', raid_embed = '', db_embed = '', gym_id = raid.gym_id;

  let gym_notes = '';
  if (!MAIN.gym_notes[gym_id]) {
    if(MAIN.config.DEBUG.Raids == 'ENABLED') {console.log('[Pokébot] [Embed] [raids.js] GYM Has no note in gyms.json, add note.');}
  } else { gym_notes = MAIN.gym_notes[gym_id].description; }

  switch(raid_type){

    case 'Egg':

      // GET EGG IMAGE
      switch(raid.level){
        case 1:
        case 2: embed_thumb = 'https://i.imgur.com/ABNC8aP.png'; break;
        case 3:
        case 4: embed_thumb = 'https://i.imgur.com/zTvNq7j.png'; break;
        case 5: embed_thumb = 'https://i.imgur.com/jaTCRXJ.png'; break;
      }

      // CREATE THE EGG EMBED
      raid_embed = Embed_EggConfig(gym_name,raid.gym_url,raid.level,hatch_time,hatch_mins,defending_team,is_exclusive,raid_sponsor,gym_notes,raid.latitude,raid.longitude,map_url,embed_thumb,embed_color,img_url,embed_area);
      // ADD FOOTER IF RAID LOBBIES ARE ENABLED
      if(MAIN.config.Raid_Lobbies == 'ENABLED'){ raid_embed.setFooter(raid.gym_id); }

      // CHECK CONFIGS AND SEND TO USER OR FEEDif (MAIN.config.DEBUG.Raids == 'ENABLED')
      if(member && MAIN.config.RAID.Subscriptions == 'ENABLED'){
        if(MAIN.config.DEBUG.Raids == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Embed] [raids.js] Sent a Level '+raid.level+' Raid Egg to '+member.user.tag+' ('+member.id+').'); }
        MAIN.Send_DM(server.id, member.id, raid_embed, target.bot);
      } else if(MAIN.config.RAID.Discord_Feeds == 'ENABLED'){
        if(MAIN.config.DEBUG.Raids == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Embed] [raids.js] Sent a Level '+raid.level+' Raid Egg to '+target.guild.name+' ('+target.id+').'); }
        MAIN.Send_Embed('raid', raid.level, server, role_id, raid_embed, target.id);
      } else{ console.info('[Pokébot] Raid ignored due to Disabled Discord Feed setting.'); }

      // STRINGIFY THE EMBED
      db_embed = JSON.stringify(raid_embed);

      setTimeout(function() {
        // CHECK FOR RAID LOBBIES
        if(raid.level >= server.min_raid_lobbies ){

          // UPDATE BOSS NAME
          MAIN.pdb.query(`UPDATE active_raids SET embed = ? WHERE gym_id = ?`, [db_embed, gym_id], function (error, record, fields) {
            if(error){ console.error(error); }
          });
        }
      }, 5000); break;

    // RAID IS A BOSS
    case 'Boss':

      // DETERMINE POKEMON NAME AND TYPE
      let pokemon_type = '', weaknesses = '';
      let pokemon_name = MAIN.pokemon[raid.pokemon_id].name;

      // DETERMINE POKEMON FORM
      form = raid.form;
      let form_name = '';
      if (form > 0){
        form_name = ' ['+MAIN.forms[raid.pokemon_id][form]+']';
      }

      await MAIN.pokemon[raid.pokemon_id].types.forEach((type) => {
        pokemon_type += type+' '+MAIN.emotes[type.toLowerCase()]+' / ';
        MAIN.types[type.toLowerCase()].weaknesses.forEach((weakness,index) => {
          if(weaknesses.indexOf(MAIN.emotes[weakness.toLowerCase()]) < 0){
            weaknesses += MAIN.emotes[weakness.toLowerCase()]+' ';
          }
        });
      });
      pokemon_type = pokemon_type.slice(0,-3);
      weaknesses = weaknesses.slice(0,-1);

      if(!MAIN.moves[raid.move_1]){ console.error('Move ID #'+raid.move_1+' not found in pokemon.json. Please report to the Discord.'); }
      if(!MAIN.moves[raid.move_2]){ console.error('Move ID #'+raid.move_2+' not found in pokemon.json. Please report to the Discord.'); }

      // DETERMINE MOVE NAMES AND TYPES
      let move_name_1 = MAIN.moves[raid.move_1].name;
      let move_type_1 = MAIN.emotes[MAIN.moves[raid.move_1].type.toLowerCase()];
      let move_name_2 = MAIN.moves[raid.move_2].name;
      let move_type_2 = MAIN.emotes[MAIN.moves[raid.move_2].type.toLowerCase()];

      // GET THE RAID BOSS SPRITE
      let raid_sprite = await MAIN.Get_Sprite(raid.form, raid.pokemon_id);

      // CREATE THE RAID EMBED
      raid_embed = Embed_Config(gym_name,raid.gym_url,raid.level,end_time,end_mins,defending_team,is_exclusive,raid_sponsor,gym_notes,raid.latitude,raid.longitude,map_url,raid_sprite,embed_color,img_url,embed_area,pokemon_name,form_name,move_name_1,move_type_1,move_name_2,move_type_2,weaknesses)
      // ADD FOOTER IF RAID LOBBIES ARE ENABLED
      if(raid.level >= server.min_raid_lobbies){ raid_embed.setFooter(raid.gym_id); }

      // CHECK CONFIGS AND SEND TO USER OR FEED
      if(member && MAIN.config.RAID.Subscriptions == 'ENABLED'){
        if(MAIN.config.DEBUG.Raids == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Embed] [raids.js] Sent a '+pokemon_name+' Raid Boss to '+member.user.tag+' ('+member.id+').'); }
        MAIN.Send_DM(server.id, member.id, raid_embed, target.bot);
      } else if(MAIN.config.RAID.Discord_Feeds == 'ENABLED'){
        if(MAIN.config.DEBUG.Raids == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Embed] [raids.js] Sent a '+pokemon_name+' Raid Boss to '+target.guild.name+' ('+target.id+').'); }
        MAIN.Send_Embed('raid', raid.level, server, role_id, raid_embed, target.id);
      } else{ console.info('[Pokébot] Raid ignored due to Disabled Discord Feed setting.'); }

      // STRINGIFY THE EMBED
      db_embed = JSON.stringify(raid_embed);

      // CHECK FOR RAID LOBBIES
      setTimeout( async function() {
        if(raid.level >= server.min_raid_lobbies ){
          MAIN.pdb.query(`SELECT * FROM active_raids WHERE gym_id = ?`, [gym_id], function (error, record, fields) {
            if(record[0]){

              // UPDATE EMBED
              MAIN.pdb.query(`UPDATE active_raids SET embed = ? WHERE gym_id = ?`, [db_embed, gym_id], function (error, record, fields) {
                if(error){ console.error(error); }
              });
            }
          });
        }
      }, 5000); break;
  } return;
}
