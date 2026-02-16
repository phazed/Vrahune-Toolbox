// vault-fix-r4
// tool-monster-vault.js
(() => {
  const TOOL_ID = "monsterVaultTool";
  const TOOL_NAME = "Monster Vault";
  const STORAGE_KEY = "vrahuneMonsterVaultStateV2";
  const LEGACY_STORAGE_KEY = "vrahuneMonsterVaultStateV1";

  const SRD_MONSTERS = [{"id":"srd521-animated-armor","name":"Animated Armor","sizeType":"Medium Construct, Unaligned","cr":"1","xp":200,"ac":18,"hp":33,"speed":25,"speedText":"25 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-animated-flying-sword","name":"Animated Flying Sword","sizeType":"Small Construct, Unaligned","cr":"1/4","xp":50,"ac":17,"hp":14,"speed":5,"speedText":"5 ft., Fly 50 ft. (hover)","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-animated-rug-of-smothering","name":"Animated Rug of Smothering","sizeType":"Large Construct, Unaligned","cr":"2","xp":450,"ac":12,"hp":27,"speed":10,"speedText":"10 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ankheg","name":"Ankheg","sizeType":"Large Monstrosity, Unaligned","cr":"2","xp":450,"ac":14,"hp":45,"speed":30,"speedText":"30 ft., Burrow 10 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-assassin","name":"Assassin","sizeType":"Medium or Small Humanoid, Neutral","cr":"8","xp":3900,"ac":16,"hp":97,"speed":30,"speedText":"30 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-awakened-shrub","name":"Awakened Shrub","sizeType":"Small Plant, Neutral","cr":"0","xp":10,"ac":9,"hp":10,"speed":20,"speedText":"20 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-awakened-tree","name":"Awakened Tree","sizeType":"Huge Plant, Neutral","cr":"2","xp":450,"ac":13,"hp":59,"speed":20,"speedText":"20 ft.","initiative":8,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-axe-beak","name":"Axe Beak","sizeType":"Large Monstrosity, Unaligned","cr":"1/4","xp":50,"ac":11,"hp":19,"speed":50,"speedText":"50 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-azer-sentinel","name":"Azer Sentinel","sizeType":"Medium Elemental, Lawful Neutral","cr":"2","xp":450,"ac":17,"hp":39,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-balor","name":"Balor","sizeType":"Huge Fiend (Demon), Chaotic Evil","cr":"19","xp":22000,"ac":19,"hp":287,"speed":40,"speedText":"40 ft., Fly 80 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bandit","name":"Bandit","sizeType":"Medium or Small Humanoid, Neutral","cr":"1/8","xp":25,"ac":12,"hp":11,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bandit-captain","name":"Bandit Captain","sizeType":"Medium or Small Humanoid, Neutral","cr":"2","xp":450,"ac":15,"hp":52,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-barbed-devil","name":"Barbed Devil","sizeType":"Medium Fiend (Devil), Lawful Evil","cr":"5","xp":1800,"ac":15,"hp":110,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-basilisk","name":"Basilisk","sizeType":"Medium Monstrosity, Unaligned","cr":"3","xp":700,"ac":15,"hp":52,"speed":20,"speedText":"20 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bearded-devil","name":"Bearded Devil","sizeType":"Medium Fiend (Devil), Lawful Evil","cr":"3","xp":700,"ac":13,"hp":58,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-behir","name":"Behir","sizeType":"Huge Monstrosity, Neutral Evil","cr":"11","xp":7,"ac":17,"hp":168,"speed":50,"speedText":"50 ft., Climb 50 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-berserker","name":"Berserker","sizeType":"Medium or Small Humanoid, Neutral","cr":"2","xp":450,"ac":13,"hp":67,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-black-dragon-wyrmling","name":"Black Dragon Wyrmling","sizeType":"Medium Dragon (Chromatic), Chaotic Evil","cr":"2","xp":450,"ac":17,"hp":33,"speed":30,"speedText":"30 ft., Fly 60 ft., Swim 30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-black-dragon","name":"Young Black Dragon","sizeType":"Large Dragon (Chromatic), Chaotic Evil","cr":"7","xp":2900,"ac":18,"hp":127,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-black-dragon","name":"Adult Black Dragon","sizeType":"Huge Dragon (Chromatic), Chaotic Evil","cr":"14","xp":11500,"ac":19,"hp":195,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":22,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-black-dragon","name":"Ancient Black Dragon","sizeType":"Gargantuan Dragon (Chromatic), Chaotic Evil","cr":"21","xp":33000,"ac":22,"hp":367,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":26,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-black-pudding","name":"Black Pudding","sizeType":"Large Ooze, Unaligned","cr":"4","xp":1100,"ac":7,"hp":68,"speed":20,"speedText":"20 ft., Climb 20 ft.","initiative":7,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-blink-dog","name":"Blink Dog","sizeType":"Medium Fey, Lawful Good","cr":"1/4","xp":50,"ac":13,"hp":22,"speed":40,"speedText":"40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-blue-dragon-wyrmling","name":"Blue Dragon Wyrmling","sizeType":"Medium Dragon (Chromatic), Lawful Evil","cr":"3","xp":700,"ac":17,"hp":65,"speed":30,"speedText":"30 ft., Burrow 15 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-blue-dragon","name":"Young Blue Dragon","sizeType":"Large Dragon (Chromatic), Lawful Evil","cr":"9","xp":5000,"ac":18,"hp":152,"speed":40,"speedText":"40 ft., Burrow 20 ft., Fly 80 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-blue-dragon","name":"Adult Blue Dragon","sizeType":"Huge Dragon (Chromatic), Lawful Evil","cr":"16","xp":15000,"ac":19,"hp":212,"speed":40,"speedText":"40 ft., Burrow 30 ft., Fly 80 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-blue-dragon","name":"Ancient Blue Dragon","sizeType":"Gargantuan Dragon (Chromatic), Lawful Evil","cr":"23","xp":50000,"ac":22,"hp":481,"speed":40,"speedText":"40 ft., Burrow 40 ft., Fly 80 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bone-devil","name":"Bone Devil","sizeType":"Large Fiend (Devil), Lawful Evil","cr":"9","xp":5000,"ac":16,"hp":161,"speed":40,"speedText":"40 ft., Fly 40 ft.","initiative":17,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-brass-dragon-wyrmling","name":"Brass Dragon Wyrmling","sizeType":"Medium Dragon (Metallic), Chaotic Good","cr":"1","xp":200,"ac":15,"hp":22,"speed":30,"speedText":"30 ft., Burrow 15 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-brass-dragon","name":"Young Brass Dragon","sizeType":"Large Dragon (Metallic), Chaotic Good","cr":"6","xp":2300,"ac":17,"hp":110,"speed":40,"speedText":"40 ft., Burrow 20 ft., Fly 80 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-brass-dragon","name":"Adult Brass Dragon","sizeType":"Huge Dragon (Metallic), Chaotic Good","cr":"13","xp":10000,"ac":18,"hp":172,"speed":40,"speedText":"40 ft., Burrow 30 ft., Fly 80 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-brass-dragon","name":"Ancient Brass Dragon","sizeType":"Gargantuan Dragon (Metallic), Chaotic Good","cr":"20","xp":25000,"ac":20,"hp":332,"speed":40,"speedText":"40 ft., Burrow 40 ft., Fly 80 ft.","initiative":22,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bronze-dragon-wyrmling","name":"Bronze Dragon Wyrmling","sizeType":"Medium Dragon (Metallic), Lawful Good","cr":"2","xp":450,"ac":15,"hp":39,"speed":30,"speedText":"30 ft., Fly 60 ft., Swim 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-bronze-dragon","name":"Young Bronze Dragon","sizeType":"Large Dragon (Metallic), Lawful Good","cr":"8","xp":3900,"ac":17,"hp":142,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-bronze-dragon","name":"Adult Bronze Dragon","sizeType":"Huge Dragon (Metallic), Lawful Good","cr":"15","xp":13000,"ac":18,"hp":212,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-bronze-dragon","name":"Ancient Bronze Dragon","sizeType":"Gargantuan Dragon (Metallic), Lawful Good","cr":"22","xp":41000,"ac":22,"hp":444,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bugbear-stalker","name":"Bugbear Stalker","sizeType":"Medium Fey (Goblinoid), Chaotic Evil","cr":"3","xp":700,"ac":15,"hp":65,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bugbear-warrior","name":"Bugbear Warrior","sizeType":"Medium Fey (Goblinoid), Chaotic Evil","cr":"1","xp":200,"ac":14,"hp":33,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bulette","name":"Bulette","sizeType":"Large Monstrosity, Unaligned","cr":"5","xp":1800,"ac":17,"hp":94,"speed":40,"speedText":"40 ft., Burrow 40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-centaur-trooper","name":"Centaur Trooper","sizeType":"Large Fey, Neutral Good","cr":"2","xp":450,"ac":16,"hp":45,"speed":50,"speedText":"50 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-chain-devil","name":"Chain Devil","sizeType":"Medium Fiend (Devil), Lawful Evil","cr":"8","xp":3900,"ac":15,"hp":85,"speed":30,"speedText":"30 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-chimera","name":"Chimera","sizeType":"Large Monstrosity, Chaotic Evil","cr":"6","xp":2300,"ac":14,"hp":114,"speed":30,"speedText":"30 ft., Fly 60 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-chuul","name":"Chuul","sizeType":"Large Aberration, Chaotic Evil","cr":"4","xp":1100,"ac":16,"hp":76,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-clay-golem","name":"Clay Golem","sizeType":"Large Construct, Unaligned","cr":"9","xp":5000,"ac":14,"hp":123,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-cloaker","name":"Cloaker","sizeType":"Large Aberration, Chaotic Neutral","cr":"8","xp":3900,"ac":14,"hp":91,"speed":10,"speedText":"10 ft., Fly 40 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-cloud-giant","name":"Cloud Giant","sizeType":"Huge Giant, Neutral","cr":"9","xp":5000,"ac":14,"hp":200,"speed":40,"speedText":"40 ft., Fly 20 ft. (hover)","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-cockatrice","name":"Cockatrice","sizeType":"Small Monstrosity, Unaligned","cr":"1/2","xp":100,"ac":11,"hp":22,"speed":20,"speedText":"20 ft., Fly 40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-commoner","name":"Commoner","sizeType":"Medium or Small Humanoid, Neutral","cr":"0","xp":10,"ac":10,"hp":4,"speed":30,"speedText":"30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-copper-dragon-wyrmling","name":"Copper Dragon Wyrmling","sizeType":"Medium Dragon (Metallic), Chaotic Good","cr":"1","xp":200,"ac":16,"hp":22,"speed":30,"speedText":"30 ft., Climb 30 ft., Fly 60 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-copper-dragon","name":"Young Copper Dragon","sizeType":"Large Dragon (Metallic), Chaotic Good","cr":"7","xp":2900,"ac":17,"hp":119,"speed":40,"speedText":"40 ft., Climb 40 ft., Fly 80 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-copper-dragon","name":"Adult Copper Dragon","sizeType":"Huge Dragon (Metallic), Chaotic Good","cr":"14","xp":11500,"ac":18,"hp":184,"speed":40,"speedText":"40 ft., Climb 40 ft., Fly 80 ft.","initiative":21,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-copper-dragon","name":"Ancient Copper Dragon","sizeType":"Gargantuan Dragon (Metallic), Chaotic Good","cr":"21","xp":33000,"ac":21,"hp":367,"speed":40,"speedText":"40 ft., Climb 40 ft., Fly 80 ft.","initiative":25,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-couatl","name":"Couatl","sizeType":"Medium Celestial, Lawful Good","cr":"4","xp":1100,"ac":19,"hp":60,"speed":30,"speedText":"30 ft., Fly 90 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-swarm-of-crawling-claws","name":"Swarm of Crawling Claws","sizeType":"Medium Swarm of Tiny Undead, Neutral Evil","cr":"3","xp":700,"ac":12,"hp":49,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-cultist","name":"Cultist","sizeType":"Medium or Small Humanoid, Neutral","cr":"1/8","xp":25,"ac":12,"hp":9,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-cultist-fanatic","name":"Cultist Fanatic","sizeType":"Medium or Small Humanoid, Neutral","cr":"2","xp":450,"ac":13,"hp":44,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-darkmantle","name":"Darkmantle","sizeType":"Small Aberration, Unaligned","cr":"1/2","xp":100,"ac":11,"hp":22,"speed":10,"speedText":"10 ft., Fly 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-death-dog","name":"Death Dog","sizeType":"Medium Monstrosity, Neutral Evil","cr":"1","xp":200,"ac":12,"hp":39,"speed":40,"speedText":"40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-deva","name":"Deva","sizeType":"Medium Celestial (Angel), Lawful Good","cr":"10","xp":5900,"ac":17,"hp":229,"speed":30,"speedText":"30 ft., Fly 90 ft. (hover)","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-djinni","name":"Djinni","sizeType":"Large Elemental (Genie), Neutral","cr":"11","xp":7,"ac":17,"hp":218,"speed":30,"speedText":"30 ft., Fly 90 ft. (hover)","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-doppelganger","name":"Doppelganger","sizeType":"Medium Monstrosity, Neutral","cr":"3","xp":700,"ac":14,"hp":52,"speed":30,"speedText":"30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-dragon-turtle","name":"Dragon Turtle","sizeType":"Gargantuan Dragon, Neutral","cr":"17","xp":18000,"ac":20,"hp":356,"speed":20,"speedText":"20 ft., Swim 50 ft.","initiative":16,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-dretch","name":"Dretch","sizeType":"Small Fiend (Demon), Chaotic Evil","cr":"1/4","xp":50,"ac":11,"hp":18,"speed":20,"speedText":"20 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-drider","name":"Drider","sizeType":"Large Monstrosity, Chaotic Evil","cr":"6","xp":2300,"ac":19,"hp":123,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-druid","name":"Druid","sizeType":"Medium or Small Humanoid (Druid), Neutral","cr":"2","xp":450,"ac":13,"hp":44,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-dryad","name":"Dryad","sizeType":"Medium Fey, Neutral","cr":"1","xp":200,"ac":16,"hp":22,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-earth-elemental","name":"Earth Elemental","sizeType":"Large Elemental, Neutral","cr":"5","xp":1800,"ac":17,"hp":147,"speed":30,"speedText":"30 ft., Burrow 30 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-efreeti","name":"Efreeti","sizeType":"Large Elemental (Genie), Neutral","cr":"11","xp":7,"ac":17,"hp":212,"speed":40,"speedText":"40 ft., Fly 60 ft. (hover)","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-erinyes","name":"Erinyes","sizeType":"Medium Fiend (Devil), Lawful Evil","cr":"12","xp":8400,"ac":18,"hp":178,"speed":30,"speedText":"30 ft., Fly 60 ft.","initiative":17,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ettercap","name":"Ettercap","sizeType":"Medium Monstrosity, Neutral Evil","cr":"2","xp":450,"ac":13,"hp":44,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ettin","name":"Ettin","sizeType":"Large Giant, Chaotic Evil","cr":"4","xp":1100,"ac":12,"hp":85,"speed":40,"speedText":"40 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-fire-elemental","name":"Fire Elemental","sizeType":"Large Elemental, Neutral","cr":"5","xp":1800,"ac":13,"hp":93,"speed":50,"speedText":"50 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-fire-giant","name":"Fire Giant","sizeType":"Huge Giant, Lawful Evil","cr":"9","xp":5000,"ac":18,"hp":162,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-flesh-golem","name":"Flesh Golem","sizeType":"Medium Construct, Neutral","cr":"5","xp":1800,"ac":9,"hp":127,"speed":30,"speedText":"30 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-frost-giant","name":"Frost Giant","sizeType":"Huge Giant, Neutral Evil","cr":"8","xp":3900,"ac":15,"hp":149,"speed":40,"speedText":"40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-shrieker-fungus","name":"Shrieker Fungus","sizeType":"Medium Plant, Unaligned","cr":"0","xp":10,"ac":5,"hp":13,"speed":5,"speedText":"5 ft.","initiative":5,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-violet-fungus","name":"Violet Fungus","sizeType":"Medium Plant, Unaligned","cr":"1/4","xp":50,"ac":5,"hp":18,"speed":5,"speedText":"5 ft.","initiative":5,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-gargoyle","name":"Gargoyle","sizeType":"Medium Elemental, Chaotic Evil","cr":"2","xp":450,"ac":15,"hp":67,"speed":30,"speedText":"30 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-gelatinous-cube","name":"Gelatinous Cube","sizeType":"Large Ooze, Unaligned","cr":"2","xp":450,"ac":6,"hp":63,"speed":15,"speedText":"15 ft.","initiative":6,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ghast","name":"Ghast","sizeType":"Medium Undead, Chaotic Evil","cr":"2","xp":450,"ac":13,"hp":36,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ghost","name":"Ghost","sizeType":"Medium Undead, Neutral","cr":"4","xp":1100,"ac":11,"hp":45,"speed":5,"speedText":"5 ft., Fly 40 ft. (hover)","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ghoul","name":"Ghoul","sizeType":"Medium Undead, Chaotic Evil","cr":"1","xp":200,"ac":12,"hp":22,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-gibbering-mouther","name":"Gibbering Mouther","sizeType":"Medium Aberration, Chaotic Neutral","cr":"2","xp":450,"ac":9,"hp":52,"speed":20,"speedText":"20 ft., Swim 20 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-glabrezu","name":"Glabrezu","sizeType":"Large Fiend (Demon), Chaotic Evil","cr":"9","xp":5000,"ac":17,"hp":189,"speed":40,"speedText":"40 ft.","initiative":16,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-gladiator","name":"Gladiator","sizeType":"Medium or Small Humanoid, Neutral","cr":"5","xp":1800,"ac":16,"hp":112,"speed":30,"speedText":"30 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-gnoll-warrior","name":"Gnoll Warrior","sizeType":"Medium Fiend, Chaotic Evil","cr":"1/2","xp":100,"ac":15,"hp":27,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-goblin-minion","name":"Goblin Minion","sizeType":"Small Fey (Goblinoid), Chaotic Neutral","cr":"1/8","xp":25,"ac":12,"hp":7,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-goblin-warrior","name":"Goblin Warrior","sizeType":"Small Fey (Goblinoid), Chaotic Neutral","cr":"1/4","xp":50,"ac":15,"hp":10,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-goblin-boss","name":"Goblin Boss","sizeType":"Small Fey (Goblinoid), Chaotic Neutral","cr":"1","xp":200,"ac":17,"hp":21,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-gold-dragon-wyrmling","name":"Gold Dragon Wyrmling","sizeType":"Medium Dragon (Metallic), Lawful Good","cr":"3","xp":700,"ac":17,"hp":60,"speed":30,"speedText":"30 ft., Fly 60 ft., Swim 30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-gold-dragon","name":"Young Gold Dragon","sizeType":"Large Dragon (Metallic), Lawful Good","cr":"10","xp":5900,"ac":18,"hp":178,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":16,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-gold-dragon","name":"Adult Gold Dragon","sizeType":"Huge Dragon (Metallic), Lawful Good","cr":"17","xp":18000,"ac":19,"hp":243,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-gold-dragon","name":"Ancient Gold Dragon","sizeType":"Gargantuan Dragon (Metallic), Lawful Good","cr":"24","xp":62000,"ac":22,"hp":546,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":26,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-gorgon","name":"Gorgon","sizeType":"Large Construct, Unaligned","cr":"5","xp":1800,"ac":19,"hp":114,"speed":40,"speedText":"40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-gray-ooze","name":"Gray Ooze","sizeType":"Medium Ooze, Unaligned","cr":"1/2","xp":100,"ac":9,"hp":22,"speed":10,"speedText":"10 ft., Climb 10 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-green-dragon-wyrmling","name":"Green Dragon Wyrmling","sizeType":"Medium Dragon (Chromatic), Lawful Evil","cr":"2","xp":450,"ac":17,"hp":38,"speed":30,"speedText":"30 ft., Fly 60 ft., Swim 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-green-dragon","name":"Young Green Dragon","sizeType":"Large Dragon (Chromatic), Lawful Evil","cr":"8","xp":3900,"ac":18,"hp":136,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-green-dragon","name":"Adult Green Dragon","sizeType":"Huge Dragon (Chromatic), Lawful Evil","cr":"15","xp":13000,"ac":19,"hp":207,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":21,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-green-dragon","name":"Ancient Green Dragon","sizeType":"Gargantuan Dragon (Chromatic), Lawful Evil","cr":"22","xp":41000,"ac":21,"hp":402,"speed":40,"speedText":"40 ft., Fly 80 ft., Swim 40 ft.","initiative":25,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-green-hag","name":"Green Hag","sizeType":"Medium Fey, Neutral Evil","cr":"3","xp":700,"ac":17,"hp":82,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-grick","name":"Grick","sizeType":"Medium Aberration, Unaligned","cr":"2","xp":450,"ac":14,"hp":54,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-griffon","name":"Griffon","sizeType":"Large Monstrosity, Unaligned","cr":"2","xp":450,"ac":12,"hp":59,"speed":30,"speedText":"30 ft., Fly 80 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-grimlock","name":"Grimlock","sizeType":"Medium Aberration, Neutral Evil","cr":"1/4","xp":50,"ac":11,"hp":11,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-guardian-naga","name":"Guardian Naga","sizeType":"Large Celestial, Lawful Good","cr":"10","xp":5900,"ac":18,"hp":136,"speed":40,"speedText":"40 ft., Climb 40 ft., Swim 40 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-guard","name":"Guard","sizeType":"Medium or Small Humanoid, Neutral","cr":"1/8","xp":25,"ac":16,"hp":11,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-guard-captain","name":"Guard Captain","sizeType":"Medium or Small Humanoid, Neutral","cr":"4","xp":1100,"ac":18,"hp":75,"speed":30,"speedText":"30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-half-dragon","name":"Half-Dragon","sizeType":"Medium Dragon, Neutral","cr":"5","xp":1800,"ac":18,"hp":105,"speed":40,"speedText":"40 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-harpy","name":"Harpy","sizeType":"Medium Monstrosity, Chaotic Evil","cr":"1","xp":200,"ac":11,"hp":38,"speed":20,"speedText":"20 ft., Fly 40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hell-hound","name":"Hell Hound","sizeType":"Medium Fiend, Lawful Evil","cr":"3","xp":700,"ac":15,"hp":58,"speed":50,"speedText":"50 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hezrou","name":"Hezrou","sizeType":"Large Fiend (Demon), Chaotic Evil","cr":"8","xp":3900,"ac":18,"hp":157,"speed":30,"speedText":"30 ft.","initiative":16,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hill-giant","name":"Hill Giant","sizeType":"Huge Giant, Chaotic Evil","cr":"5","xp":1800,"ac":13,"hp":105,"speed":40,"speedText":"40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hippogriff","name":"Hippogriff","sizeType":"Large Monstrosity, Unaligned","cr":"1","xp":200,"ac":11,"hp":26,"speed":40,"speedText":"40 ft., Fly 60 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hobgoblin-warrior","name":"Hobgoblin Warrior","sizeType":"Medium Fey (Goblinoid), Lawful Evil","cr":"1/2","xp":100,"ac":18,"hp":11,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hobgoblin-captain","name":"Hobgoblin Captain","sizeType":"Medium Fey (Goblinoid), Lawful Evil","cr":"3","xp":700,"ac":17,"hp":58,"speed":30,"speedText":"30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-homunculus","name":"Homunculus","sizeType":"Tiny Construct, Neutral","cr":"0","xp":10,"ac":13,"hp":4,"speed":20,"speedText":"20 ft., Fly 40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-horned-devil","name":"Horned Devil","sizeType":"Large Fiend (Devil), Lawful Evil","cr":"11","xp":7,"ac":18,"hp":199,"speed":30,"speedText":"30 ft., Fly 60 ft.","initiative":17,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hydra","name":"Hydra","sizeType":"Huge Monstrosity, Unaligned","cr":"8","xp":3900,"ac":15,"hp":184,"speed":40,"speedText":"40 ft., Swim 40 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ice-devil","name":"Ice Devil","sizeType":"Large Fiend (Devil), Lawful Evil","cr":"14","xp":11500,"ac":18,"hp":228,"speed":40,"speedText":"40 ft.","initiative":17,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-imp","name":"Imp","sizeType":"Tiny Fiend (Devil), Lawful Evil","cr":"1","xp":200,"ac":13,"hp":21,"speed":20,"speedText":"20 ft., Fly 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-incubus","name":"Incubus","sizeType":"Medium Fiend, Neutral Evil","cr":"4","xp":1100,"ac":15,"hp":66,"speed":30,"speedText":"30 ft., Fly 60 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-invisible-stalker","name":"Invisible Stalker","sizeType":"Large Elemental, Neutral","cr":"6","xp":2300,"ac":14,"hp":97,"speed":50,"speedText":"50 ft., Fly 50 ft. (hover)","initiative":22,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-iron-golem","name":"Iron Golem","sizeType":"Large Construct, Unaligned","cr":"16","xp":15000,"ac":20,"hp":252,"speed":30,"speedText":"30 ft.","initiative":19,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-knight","name":"Knight","sizeType":"Medium or Small Humanoid, Neutral","cr":"3","xp":700,"ac":18,"hp":52,"speed":30,"speedText":"30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-kobold-warrior","name":"Kobold Warrior","sizeType":"Small Dragon, Neutral","cr":"1/8","xp":25,"ac":14,"hp":7,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-kraken","name":"Kraken","sizeType":"Gargantuan Monstrosity (Titan), Chaotic Evil","cr":"23","xp":50000,"ac":18,"hp":481,"speed":30,"speedText":"30 ft., Swim 120 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-lamia","name":"Lamia","sizeType":"Large Fiend, Chaotic Evil","cr":"4","xp":1100,"ac":13,"hp":97,"speed":40,"speedText":"40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-lemure","name":"Lemure","sizeType":"Medium Fiend (Devil), Lawful Evil","cr":"0","xp":10,"ac":9,"hp":9,"speed":20,"speedText":"20 ft.","initiative":7,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-lich","name":"Lich","sizeType":"Medium Undead (Wizard), Neutral Evil","cr":"21","xp":33000,"ac":20,"hp":315,"speed":30,"speedText":"30 ft.","initiative":27,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-mage","name":"Mage","sizeType":"Medium or Small Humanoid (Wizard), Neutral","cr":"6","xp":2300,"ac":15,"hp":81,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-archmage","name":"Archmage","sizeType":"Medium or Small Humanoid (Wizard), Neutral","cr":"12","xp":8000,"ac":17,"hp":170,"speed":30,"speedText":"30 ft.","initiative":17,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-magmin","name":"Magmin","sizeType":"Small Elemental, Chaotic Neutral","cr":"1/2","xp":100,"ac":14,"hp":13,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-manticore","name":"Manticore","sizeType":"Large Monstrosity, Lawful Evil","cr":"3","xp":700,"ac":14,"hp":68,"speed":30,"speedText":"30 ft., Fly 50 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-marilith","name":"Marilith","sizeType":"Large Fiend (Demon), Chaotic Evil","cr":"16","xp":15000,"ac":16,"hp":220,"speed":40,"speedText":"40 ft., Climb 40 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-medusa","name":"Medusa","sizeType":"Medium Monstrosity, Lawful Evil","cr":"6","xp":2300,"ac":15,"hp":127,"speed":30,"speedText":"30 ft.","initiative":16,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-dust-mephit","name":"Dust Mephit","sizeType":"Small Elemental, Neutral Evil","cr":"1/2","xp":100,"ac":12,"hp":17,"speed":30,"speedText":"30 ft., Fly 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ice-mephit","name":"Ice Mephit","sizeType":"Small Elemental, Neutral Evil","cr":"1/2","xp":100,"ac":11,"hp":21,"speed":30,"speedText":"30 ft., Fly 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-magma-mephit","name":"Magma Mephit","sizeType":"Small Elemental, Neutral Evil","cr":"1/2","xp":100,"ac":11,"hp":18,"speed":30,"speedText":"30 ft., Fly 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-steam-mephit","name":"Steam Mephit","sizeType":"Small Elemental, Neutral Evil","cr":"1/4","xp":50,"ac":10,"hp":17,"speed":30,"speedText":"30 ft., Fly 30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-merfolk-skirmisher","name":"Merfolk Skirmisher","sizeType":"Medium Elemental, Neutral","cr":"1/8","xp":25,"ac":11,"hp":11,"speed":10,"speedText":"10 ft., Swim 40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-merrow","name":"Merrow","sizeType":"Large Monstrosity, Chaotic Evil","cr":"2","xp":450,"ac":13,"hp":45,"speed":10,"speedText":"10 ft., Swim 40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-mimic","name":"Mimic","sizeType":"Medium Monstrosity, Neutral","cr":"2","xp":450,"ac":12,"hp":58,"speed":20,"speedText":"20 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-minotaur-of-baphomet","name":"Minotaur of Baphomet","sizeType":"Large Monstrosity, Chaotic Evil","cr":"3","xp":700,"ac":14,"hp":85,"speed":40,"speedText":"40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-mummy","name":"Mummy","sizeType":"Medium or Small Undead, Lawful Evil","cr":"3","xp":700,"ac":11,"hp":58,"speed":20,"speedText":"20 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-mummy-lord","name":"Mummy Lord","sizeType":"Medium or Small Undead (Cleric), Lawful Evil","cr":"15","xp":13000,"ac":17,"hp":187,"speed":30,"speedText":"30 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-nalfeshnee","name":"Nalfeshnee","sizeType":"Large Fiend (Demon), Chaotic Evil","cr":"13","xp":10000,"ac":18,"hp":184,"speed":20,"speedText":"20 ft., Fly 30 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-night-hag","name":"Night Hag","sizeType":"Medium Fiend, Neutral Evil","cr":"5","xp":1800,"ac":17,"hp":112,"speed":30,"speedText":"30 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-nightmare","name":"Nightmare","sizeType":"Large Fiend, Neutral Evil","cr":"3","xp":700,"ac":13,"hp":68,"speed":60,"speedText":"60 ft., Fly 90 ft. (hover)","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-noble","name":"Noble","sizeType":"Medium or Small Humanoid, Neutral","cr":"1/8","xp":25,"ac":15,"hp":9,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ochre-jelly","name":"Ochre Jelly","sizeType":"Large Ooze, Unaligned","cr":"2","xp":450,"ac":8,"hp":52,"speed":20,"speedText":"20 ft., Climb 20 ft.","initiative":8,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ogre","name":"Ogre","sizeType":"Large Giant, Chaotic Evil","cr":"2","xp":450,"ac":11,"hp":68,"speed":40,"speedText":"40 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-oni","name":"Oni","sizeType":"Large Fiend, Lawful Evil","cr":"7","xp":2900,"ac":17,"hp":119,"speed":30,"speedText":"30 ft., Fly 30 ft. (hover)","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-otyugh","name":"Otyugh","sizeType":"Large Aberration, Neutral","cr":"5","xp":1800,"ac":14,"hp":104,"speed":30,"speedText":"30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-owlbear","name":"Owlbear","sizeType":"Large Monstrosity, Unaligned","cr":"3","xp":700,"ac":13,"hp":59,"speed":40,"speedText":"40 ft., Climb 40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-pegasus","name":"Pegasus","sizeType":"Large Celestial, Chaotic Good","cr":"2","xp":450,"ac":12,"hp":59,"speed":60,"speedText":"60 ft., Fly 90 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-phase-spider","name":"Phase Spider","sizeType":"Large Monstrosity, Unaligned","cr":"3","xp":700,"ac":14,"hp":45,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-pirate","name":"Pirate","sizeType":"Medium or Small Humanoid, Neutral","cr":"1","xp":200,"ac":14,"hp":33,"speed":30,"speedText":"30 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-pirate-captain","name":"Pirate Captain","sizeType":"Medium or Small Humanoid, Neutral","cr":"6","xp":2300,"ac":17,"hp":84,"speed":30,"speedText":"30 ft.","initiative":17,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-pit-fiend","name":"Pit Fiend","sizeType":"Large Fiend (Devil), Lawful Evil","cr":"20","xp":25000,"ac":21,"hp":337,"speed":30,"speedText":"30 ft., Fly 60 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-planetar","name":"Planetar","sizeType":"Large Celestial (Angel), Lawful Good","cr":"16","xp":15000,"ac":19,"hp":262,"speed":40,"speedText":"40 ft., Fly 120 ft. (hover)","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-priest-acolyte","name":"Priest Acolyte","sizeType":"Medium or Small Humanoid (Cleric), Neutral","cr":"1/4","xp":50,"ac":13,"hp":11,"speed":30,"speedText":"30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-priest","name":"Priest","sizeType":"Medium or Small Humanoid (Cleric), Neutral","cr":"2","xp":450,"ac":13,"hp":38,"speed":30,"speedText":"30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-pseudodragon","name":"Pseudodragon","sizeType":"Tiny Dragon, Neutral Good","cr":"1/4","xp":50,"ac":14,"hp":10,"speed":15,"speedText":"15 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-purple-worm","name":"Purple Worm","sizeType":"Gargantuan Monstrosity, Unaligned","cr":"15","xp":13000,"ac":18,"hp":247,"speed":50,"speedText":"50 ft., Burrow 50 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-quasit","name":"Quasit","sizeType":"Tiny Fiend (Demon), Chaotic Evil","cr":"1","xp":200,"ac":13,"hp":25,"speed":40,"speedText":"40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-rakshasa","name":"Rakshasa","sizeType":"Medium Fiend, Lawful Evil","cr":"13","xp":10000,"ac":17,"hp":221,"speed":40,"speedText":"40 ft.","initiative":18,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-red-dragon-wyrmling","name":"Red Dragon Wyrmling","sizeType":"Medium Dragon (Chromatic), Chaotic Evil","cr":"4","xp":1100,"ac":17,"hp":75,"speed":30,"speedText":"30 ft., Climb 30 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-red-dragon","name":"Young Red Dragon","sizeType":"Large Dragon (Chromatic), Chaotic Evil","cr":"10","xp":5900,"ac":18,"hp":178,"speed":40,"speedText":"40 ft., Climb 40 ft., Fly 80 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-red-dragon","name":"Adult Red Dragon","sizeType":"Huge Dragon (Chromatic), Chaotic Evil","cr":"17","xp":18000,"ac":19,"hp":256,"speed":40,"speedText":"40 ft., Climb 40 ft., Fly 80 ft.","initiative":22,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-red-dragon","name":"Ancient Red Dragon","sizeType":"Gargantuan Dragon (Chromatic), Chaotic Evil","cr":"24","xp":62000,"ac":22,"hp":507,"speed":40,"speedText":"40 ft., Climb 40 ft., Fly 80 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-remorhaz","name":"Remorhaz","sizeType":"Huge Monstrosity, Unaligned","cr":"11","xp":7,"ac":17,"hp":195,"speed":40,"speedText":"40 ft., Burrow 30 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-roc","name":"Roc","sizeType":"Gargantuan Monstrosity, Unaligned","cr":"11","xp":7,"ac":15,"hp":248,"speed":20,"speedText":"20 ft., Fly 120 ft.","initiative":18,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-roper","name":"Roper","sizeType":"Large Aberration, Neutral Evil","cr":"5","xp":1800,"ac":20,"hp":93,"speed":10,"speedText":"10 ft., Climb 20 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-rust-monster","name":"Rust Monster","sizeType":"Medium Monstrosity, Unaligned","cr":"1/2","xp":100,"ac":14,"hp":33,"speed":40,"speedText":"40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-sahuagin-warrior","name":"Sahuagin Warrior","sizeType":"Medium Fiend, Lawful Evil","cr":"1/2","xp":100,"ac":12,"hp":22,"speed":30,"speedText":"30 ft., Swim 40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-salamander","name":"Salamander","sizeType":"Large Elemental, Neutral Evil","cr":"5","xp":1800,"ac":15,"hp":90,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-satyr","name":"Satyr","sizeType":"Medium Fey, Chaotic Neutral","cr":"1/2","xp":100,"ac":13,"hp":31,"speed":40,"speedText":"40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-scout","name":"Scout","sizeType":"Medium or Small Humanoid, Neutral","cr":"1/2","xp":100,"ac":13,"hp":16,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-sea-hag","name":"Sea Hag","sizeType":"Medium Fey, Chaotic Evil","cr":"2","xp":450,"ac":14,"hp":52,"speed":30,"speedText":"30 ft., Swim 40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-shadow","name":"Shadow","sizeType":"Medium Undead, Chaotic Evil","cr":"1/2","xp":100,"ac":12,"hp":27,"speed":40,"speedText":"40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-shambling-mound","name":"Shambling Mound","sizeType":"Large Plant, Unaligned","cr":"5","xp":1800,"ac":15,"hp":110,"speed":30,"speedText":"30 ft., Swim 20 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-shield-guardian","name":"Shield Guardian","sizeType":"Large Construct, Unaligned","cr":"7","xp":2900,"ac":17,"hp":142,"speed":30,"speedText":"30 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-silver-dragon-wyrmling","name":"Silver Dragon Wyrmling","sizeType":"Medium Dragon (Metallic), Lawful Good","cr":"2","xp":450,"ac":17,"hp":45,"speed":30,"speedText":"30 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-silver-dragon","name":"Young Silver Dragon","sizeType":"Large Dragon (Metallic), Lawful Good","cr":"9","xp":5000,"ac":18,"hp":168,"speed":40,"speedText":"40 ft., Fly 80 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-silver-dragon","name":"Adult Silver Dragon","sizeType":"Huge Dragon (Metallic), Lawful Good","cr":"16","xp":15000,"ac":19,"hp":216,"speed":40,"speedText":"40 ft., Fly 80 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-silver-dragon","name":"Ancient Silver Dragon","sizeType":"Gargantuan Dragon (Metallic), Lawful Good","cr":"23","xp":50000,"ac":22,"hp":468,"speed":40,"speedText":"40 ft., Fly 80 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-skeleton","name":"Skeleton","sizeType":"Medium Undead, Lawful Evil","cr":"1/4","xp":50,"ac":14,"hp":13,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-warhorse-skeleton","name":"Warhorse Skeleton","sizeType":"Large Undead, Lawful Evil","cr":"1/2","xp":100,"ac":13,"hp":22,"speed":60,"speedText":"60 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-minotaur-skeleton","name":"Minotaur Skeleton","sizeType":"Large Undead, Lawful Evil","cr":"2","xp":450,"ac":12,"hp":45,"speed":40,"speedText":"40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-solar","name":"Solar","sizeType":"Large Celestial (Angel), Lawful Good","cr":"21","xp":33000,"ac":21,"hp":297,"speed":50,"speedText":"50 ft., Fly 150 ft. (hover)","initiative":30,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-specter","name":"Specter","sizeType":"Medium Undead, Chaotic Evil","cr":"1","xp":200,"ac":12,"hp":22,"speed":30,"speedText":"30 ft., Fly 50 ft. (hover)","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-sphinx-of-wonder","name":"Sphinx of Wonder","sizeType":"Tiny Celestial, Lawful Good","cr":"1","xp":200,"ac":13,"hp":24,"speed":20,"speedText":"20 ft., Fly 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-sphinx-of-lore","name":"Sphinx of Lore","sizeType":"Large Celestial, Lawful Neutral","cr":"11","xp":7,"ac":17,"hp":170,"speed":40,"speedText":"40 ft., Fly 60 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-sphinx-of-valor","name":"Sphinx of Valor","sizeType":"Large Celestial, Lawful Neutral","cr":"17","xp":18000,"ac":17,"hp":199,"speed":40,"speedText":"40 ft., Fly 60 ft.","initiative":22,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-spirit-naga","name":"Spirit Naga","sizeType":"Large Fiend, Chaotic Evil","cr":"8","xp":3900,"ac":17,"hp":135,"speed":40,"speedText":"40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-sprite","name":"Sprite","sizeType":"Tiny Fey, Neutral Good","cr":"1/4","xp":50,"ac":15,"hp":10,"speed":10,"speedText":"10 ft., Fly 40 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-spy","name":"Spy","sizeType":"Medium or Small Humanoid, Neutral","cr":"1","xp":200,"ac":12,"hp":27,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-stirge","name":"Stirge","sizeType":"Tiny Monstrosity, Unaligned","cr":"1/8","xp":25,"ac":13,"hp":5,"speed":10,"speedText":"10 ft., Fly 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-stone-giant","name":"Stone Giant","sizeType":"Huge Giant, Neutral","cr":"7","xp":2900,"ac":17,"hp":126,"speed":40,"speedText":"40 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-stone-golem","name":"Stone Golem","sizeType":"Large Construct, Unaligned","cr":"10","xp":5900,"ac":18,"hp":220,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-storm-giant","name":"Storm Giant","sizeType":"Huge Giant, Chaotic Good","cr":"13","xp":10000,"ac":16,"hp":230,"speed":50,"speedText":"50 ft., Fly 25 ft. (hover), Swim 50 ft.","initiative":17,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-succubus","name":"Succubus","sizeType":"Medium Fiend, Neutral Evil","cr":"4","xp":1100,"ac":15,"hp":71,"speed":30,"speedText":"30 ft., Fly 60 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-tarrasque","name":"Tarrasque","sizeType":"Gargantuan Monstrosity (Titan), Unaligned","cr":"30","xp":155000,"ac":25,"hp":697,"speed":60,"speedText":"60 ft., Burrow 40 ft., Climb 60 ft.","initiative":28,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-tough","name":"Tough","sizeType":"Medium or Small Humanoid, Neutral","cr":"1/2","xp":100,"ac":12,"hp":32,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-tough-boss","name":"Tough Boss","sizeType":"Medium or Small Humanoid, Neutral","cr":"4","xp":1100,"ac":16,"hp":82,"speed":30,"speedText":"30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-treant","name":"Treant","sizeType":"Huge Plant, Chaotic Good","cr":"9","xp":5000,"ac":16,"hp":138,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-troll","name":"Troll","sizeType":"Large Giant, Chaotic Evil","cr":"5","xp":1800,"ac":15,"hp":94,"speed":30,"speedText":"30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-troll-limb","name":"Troll Limb","sizeType":"Small Giant, Chaotic Evil","cr":"1/2","xp":100,"ac":13,"hp":14,"speed":20,"speedText":"20 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-unicorn","name":"Unicorn","sizeType":"Large Celestial, Lawful Good","cr":"5","xp":1800,"ac":12,"hp":97,"speed":50,"speedText":"50 ft.","initiative":18,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-vampire-familiar","name":"Vampire Familiar","sizeType":"Medium or Small Humanoid, Neutral Evil","cr":"3","xp":700,"ac":15,"hp":65,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-vampire-spawn","name":"Vampire Spawn","sizeType":"Medium or Small Undead, Neutral Evil","cr":"5","xp":1800,"ac":16,"hp":90,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-vampire","name":"Vampire","sizeType":"Medium or Small Undead, Lawful Evil","cr":"13","xp":10000,"ac":16,"hp":195,"speed":40,"speedText":"40 ft., Climb 40 ft.","initiative":24,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-vrock","name":"Vrock","sizeType":"Large Fiend (Demon), Chaotic Evil","cr":"6","xp":2300,"ac":15,"hp":152,"speed":40,"speedText":"40 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-warrior-infantry","name":"Warrior Infantry","sizeType":"Medium or Small Humanoid, Neutral","cr":"1/8","xp":25,"ac":13,"hp":9,"speed":30,"speedText":"30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-warrior-veteran","name":"Warrior Veteran","sizeType":"Medium or Small Humanoid, Neutral","cr":"3","xp":700,"ac":17,"hp":65,"speed":30,"speedText":"30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-water-elemental","name":"Water Elemental","sizeType":"Large Elemental, Neutral","cr":"5","xp":1800,"ac":14,"hp":114,"speed":30,"speedText":"30 ft., Swim 90 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-werebear","name":"Werebear","sizeType":"Medium or Small Monstrosity (Lycanthrope), Neutral Good","cr":"5","xp":1800,"ac":15,"hp":135,"speed":30,"speedText":"30 ft., 40 ft. (bear form only), Climb 30 ft. (bear","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-wereboar","name":"Wereboar","sizeType":"Medium or Small Monstrosity (Lycanthrope), Neutral Evil","cr":"4","xp":1100,"ac":15,"hp":97,"speed":30,"speedText":"30 ft., 40 ft. (boar form only)","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-wererat","name":"Wererat","sizeType":"Medium or Small Monstrosity (Lycanthrope), Lawful Evil","cr":"2","xp":450,"ac":13,"hp":60,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-weretiger","name":"Weretiger","sizeType":"Medium or Small Monstrosity (Lycanthrope), Neutral","cr":"4","xp":1100,"ac":12,"hp":120,"speed":30,"speedText":"30 ft., 40 ft. (tiger form only)","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-werewolf","name":"Werewolf","sizeType":"Medium or Small Monstrosity (Lycanthrope), Chaotic Evil","cr":"3","xp":700,"ac":15,"hp":71,"speed":30,"speedText":"30 ft., 40 ft. (wolf form only)","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-white-dragon-wyrmling","name":"White Dragon Wyrmling","sizeType":"Medium Dragon (Chromatic), Chaotic Evil","cr":"2","xp":450,"ac":16,"hp":32,"speed":30,"speedText":"30 ft., Burrow 15 ft., Fly 60 ft., Swim 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-young-white-dragon","name":"Young White Dragon","sizeType":"Large Dragon (Chromatic), Chaotic Evil","cr":"6","xp":2300,"ac":17,"hp":123,"speed":40,"speedText":"40 ft., Burrow 20 ft., Fly 80 ft., Swim 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-adult-white-dragon","name":"Adult White Dragon","sizeType":"Huge Dragon (Chromatic), Chaotic Evil","cr":"13","xp":10000,"ac":18,"hp":200,"speed":40,"speedText":"40 ft., Burrow 30 ft., Fly 80 ft., Swim 40 ft.","initiative":20,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ancient-white-dragon","name":"Ancient White Dragon","sizeType":"Gargantuan Dragon (Chromatic), Chaotic Evil","cr":"20","xp":25000,"ac":20,"hp":333,"speed":40,"speedText":"40 ft., Burrow 40 ft., Fly 80 ft., Swim 40 ft.","initiative":22,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-wight","name":"Wight","sizeType":"Medium Undead, Neutral Evil","cr":"3","xp":700,"ac":14,"hp":82,"speed":30,"speedText":"30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-will-o-wisp","name":"Will-o’-Wisp","sizeType":"Tiny Undead, Chaotic Evil","cr":"2","xp":450,"ac":19,"hp":27,"speed":5,"speedText":"5 ft., Fly 50 ft. (hover)","initiative":19,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-winter-wolf","name":"Winter Wolf","sizeType":"Large Monstrosity, Neutral Evil","cr":"3","xp":700,"ac":13,"hp":75,"speed":50,"speedText":"50 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-worg","name":"Worg","sizeType":"Large Fey, Neutral Evil","cr":"1/2","xp":100,"ac":13,"hp":26,"speed":50,"speedText":"50 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-wraith","name":"Wraith","sizeType":"Medium or Small Undead, Neutral Evil","cr":"5","xp":1800,"ac":13,"hp":67,"speed":5,"speedText":"5 ft., Fly 60 ft. (hover)","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-wyvern","name":"Wyvern","sizeType":"Large Dragon, Unaligned","cr":"6","xp":2300,"ac":14,"hp":127,"speed":30,"speedText":"30 ft., Fly 80 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-xorn","name":"Xorn","sizeType":"Medium Elemental, Neutral","cr":"5","xp":1800,"ac":19,"hp":84,"speed":20,"speedText":"20 ft., Burrow 20 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-zombie","name":"Zombie","sizeType":"Medium Undead, Neutral Evil","cr":"1/4","xp":50,"ac":8,"hp":15,"speed":20,"speedText":"20 ft.","initiative":8,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ogre-zombie","name":"Ogre Zombie","sizeType":"Large Undead, Neutral Evil","cr":"2","xp":450,"ac":8,"hp":85,"speed":30,"speedText":"30 ft.","initiative":8,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-allosaurus","name":"Allosaurus","sizeType":"Large Beast (Dinosaur), Unaligned","cr":"2","xp":450,"ac":13,"hp":51,"speed":60,"speedText":"60 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ankylosaurus","name":"Ankylosaurus","sizeType":"Huge Beast (Dinosaur), Unaligned","cr":"3","xp":700,"ac":15,"hp":68,"speed":30,"speedText":"30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-ape","name":"Ape","sizeType":"Medium Beast, Unaligned","cr":"1/2","xp":100,"ac":12,"hp":19,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-archelon","name":"Archelon","sizeType":"Huge Beast (Dinosaur), Unaligned","cr":"4","xp":1100,"ac":17,"hp":90,"speed":20,"speedText":"20 ft., Swim 80 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-baboon","name":"Baboon","sizeType":"Small Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":3,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-badger","name":"Badger","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":11,"hp":5,"speed":20,"speedText":"20 ft., Burrow 5 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-bat","name":"Bat","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":1,"speed":5,"speedText":"5 ft., Fly 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-black-bear","name":"Black Bear","sizeType":"Medium Beast, Unaligned","cr":"1/2","xp":100,"ac":11,"hp":19,"speed":30,"speedText":"30 ft., Climb 30 ft., Swim 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-blood-hawk","name":"Blood Hawk","sizeType":"Small Beast, Unaligned","cr":"1/8","xp":25,"ac":12,"hp":7,"speed":10,"speedText":"10 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-boar","name":"Boar","sizeType":"Medium Beast, Unaligned","cr":"1/4","xp":50,"ac":11,"hp":13,"speed":40,"speedText":"40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-brown-bear","name":"Brown Bear","sizeType":"Large Beast, Unaligned","cr":"1","xp":200,"ac":11,"hp":22,"speed":40,"speedText":"40 ft., Climb 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-camel","name":"Camel","sizeType":"Large Beast, Unaligned","cr":"1/8","xp":25,"ac":10,"hp":17,"speed":50,"speedText":"50 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-cat","name":"Cat","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":2,"speed":40,"speedText":"40 ft., Climb 40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-constrictor-snake","name":"Constrictor Snake","sizeType":"Large Beast, Unaligned","cr":"1/4","xp":50,"ac":13,"hp":13,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-crab","name":"Crab","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":11,"hp":3,"speed":20,"speedText":"20 ft., Swim 20 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-crocodile","name":"Crocodile","sizeType":"Large Beast, Unaligned","cr":"1/2","xp":100,"ac":12,"hp":13,"speed":20,"speedText":"20 ft., Swim 30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-deer","name":"Deer","sizeType":"Medium Beast, Unaligned","cr":"0","xp":10,"ac":13,"hp":4,"speed":50,"speedText":"50 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-dire-wolf","name":"Dire Wolf","sizeType":"Large Beast, Unaligned","cr":"1","xp":200,"ac":14,"hp":22,"speed":50,"speedText":"50 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-draft-horse","name":"Draft Horse","sizeType":"Large Beast, Unaligned","cr":"1/4","xp":50,"ac":10,"hp":15,"speed":40,"speedText":"40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-eagle","name":"Eagle","sizeType":"Small Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":4,"speed":10,"speedText":"10 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-elephant","name":"Elephant","sizeType":"Huge Beast, Unaligned","cr":"4","xp":1100,"ac":12,"hp":76,"speed":40,"speedText":"40 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-elk","name":"Elk","sizeType":"Large Beast, Unaligned","cr":"1/4","xp":50,"ac":10,"hp":11,"speed":50,"speedText":"50 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-flying-snake","name":"Flying Snake","sizeType":"Tiny Monstrosity, Unaligned","cr":"1/8","xp":25,"ac":14,"hp":5,"speed":30,"speedText":"30 ft., Fly 60 ft., Swim 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-frog","name":"Frog","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":11,"hp":1,"speed":20,"speedText":"20 ft., Swim 20 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-ape","name":"Giant Ape","sizeType":"Huge Beast, Unaligned","cr":"7","xp":2900,"ac":12,"hp":168,"speed":40,"speedText":"40 ft., Climb 40 ft.","initiative":15,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-badger","name":"Giant Badger","sizeType":"Medium Beast, Unaligned","cr":"1/4","xp":50,"ac":13,"hp":15,"speed":30,"speedText":"30 ft., Burrow 10 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-bat","name":"Giant Bat","sizeType":"Large Beast, Unaligned","cr":"1/4","xp":50,"ac":13,"hp":22,"speed":10,"speedText":"10 ft., Fly 60 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-boar","name":"Giant Boar","sizeType":"Large Beast, Unaligned","cr":"2","xp":450,"ac":13,"hp":42,"speed":40,"speedText":"40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-centipede","name":"Giant Centipede","sizeType":"Small Beast, Unaligned","cr":"1/4","xp":50,"ac":14,"hp":9,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-constrictor-snake","name":"Giant Constrictor Snake","sizeType":"Huge Beast, Unaligned","cr":"2","xp":450,"ac":12,"hp":60,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-crab","name":"Giant Crab","sizeType":"Medium Beast, Unaligned","cr":"1/8","xp":25,"ac":15,"hp":13,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-crocodile","name":"Giant Crocodile","sizeType":"Huge Beast, Unaligned","cr":"5","xp":1800,"ac":14,"hp":85,"speed":30,"speedText":"30 ft., Swim 50 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-eagle","name":"Giant Eagle","sizeType":"Large Celestial, Neutral Good","cr":"1","xp":200,"ac":13,"hp":26,"speed":10,"speedText":"10 ft., Fly 80 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-elk","name":"Giant Elk","sizeType":"Huge Celestial, Neutral Good","cr":"2","xp":450,"ac":14,"hp":42,"speed":60,"speedText":"60 ft.","initiative":16,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-fire-beetle","name":"Giant Fire Beetle","sizeType":"Small Beast, Unaligned","cr":"0","xp":10,"ac":13,"hp":4,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-frog","name":"Giant Frog","sizeType":"Medium Beast, Unaligned","cr":"1/4","xp":50,"ac":11,"hp":18,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-goat","name":"Giant Goat","sizeType":"Large Beast, Unaligned","cr":"1/2","xp":100,"ac":11,"hp":19,"speed":40,"speedText":"40 ft., Climb 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-hyena","name":"Giant Hyena","sizeType":"Large Beast, Unaligned","cr":"1","xp":200,"ac":12,"hp":45,"speed":50,"speedText":"50 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-lizard","name":"Giant Lizard","sizeType":"Large Beast, Unaligned","cr":"1/4","xp":50,"ac":12,"hp":19,"speed":40,"speedText":"40 ft., Climb 40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-octopus","name":"Giant Octopus","sizeType":"Large Beast, Unaligned","cr":"1","xp":200,"ac":11,"hp":45,"speed":10,"speedText":"10 ft., Swim 60 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-owl","name":"Giant Owl","sizeType":"Large Celestial, Neutral","cr":"1/4","xp":50,"ac":12,"hp":19,"speed":5,"speedText":"5 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-rat","name":"Giant Rat","sizeType":"Small Beast, Unaligned","cr":"1/8","xp":25,"ac":13,"hp":7,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-scorpion","name":"Giant Scorpion","sizeType":"Large Beast, Unaligned","cr":"3","xp":700,"ac":15,"hp":52,"speed":40,"speedText":"40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-seahorse","name":"Giant Seahorse","sizeType":"Large Beast, Unaligned","cr":"1/2","xp":100,"ac":14,"hp":16,"speed":5,"speedText":"5 ft., Swim 40 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-shark","name":"Giant Shark","sizeType":"Huge Beast, Unaligned","cr":"5","xp":1800,"ac":13,"hp":92,"speed":5,"speedText":"5 ft., Swim 60 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-spider","name":"Giant Spider","sizeType":"Large Beast, Unaligned","cr":"1","xp":200,"ac":14,"hp":26,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-toad","name":"Giant Toad","sizeType":"Large Beast, Unaligned","cr":"1","xp":200,"ac":11,"hp":39,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-venomous-snake","name":"Giant Venomous Snake","sizeType":"Medium Beast, Unaligned","cr":"1/4","xp":50,"ac":14,"hp":11,"speed":40,"speedText":"40 ft., Swim 40 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-vulture","name":"Giant Vulture","sizeType":"Large Monstrosity, Neutral Evil","cr":"1","xp":200,"ac":10,"hp":25,"speed":10,"speedText":"10 ft., Fly 60 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-wasp","name":"Giant Wasp","sizeType":"Medium Beast, Unaligned","cr":"1/2","xp":100,"ac":13,"hp":22,"speed":10,"speedText":"10 ft., Fly 50 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-weasel","name":"Giant Weasel","sizeType":"Medium Beast, Unaligned","cr":"1/8","xp":25,"ac":13,"hp":9,"speed":40,"speedText":"40 ft., Climb 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-giant-wolf-spider","name":"Giant Wolf Spider","sizeType":"Medium Beast, Unaligned","cr":"1/4","xp":50,"ac":13,"hp":11,"speed":40,"speedText":"40 ft., Climb 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-goat","name":"Goat","sizeType":"Medium Beast, Unaligned","cr":"0","xp":10,"ac":10,"hp":4,"speed":40,"speedText":"40 ft., Climb 30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hawk","name":"Hawk","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":13,"hp":1,"speed":10,"speedText":"10 ft., Fly 60 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hippopotamus","name":"Hippopotamus","sizeType":"Large Beast, Unaligned","cr":"4","xp":1100,"ac":14,"hp":82,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":8,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hunter-shark","name":"Hunter Shark","sizeType":"Large Beast, Unaligned","cr":"2","xp":450,"ac":12,"hp":45,"speed":5,"speedText":"5 ft., Swim 40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-hyena","name":"Hyena","sizeType":"Medium Beast, Unaligned","cr":"0","xp":10,"ac":11,"hp":5,"speed":50,"speedText":"50 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-jackal","name":"Jackal","sizeType":"Small Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":3,"speed":40,"speedText":"40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-killer-whale","name":"Killer Whale","sizeType":"Huge Beast, Unaligned","cr":"3","xp":700,"ac":12,"hp":90,"speed":5,"speedText":"5 ft., Swim 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-lion","name":"Lion","sizeType":"Large Beast, Unaligned","cr":"1","xp":200,"ac":12,"hp":22,"speed":50,"speedText":"50 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-lizard","name":"Lizard","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":10,"hp":2,"speed":20,"speedText":"20 ft., Climb 20 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-mammoth","name":"Mammoth","sizeType":"Huge Beast, Unaligned","cr":"6","xp":2300,"ac":13,"hp":126,"speed":50,"speedText":"50 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-mastiff","name":"Mastiff","sizeType":"Medium Beast, Unaligned","cr":"1/8","xp":25,"ac":12,"hp":5,"speed":40,"speedText":"40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-mule","name":"Mule","sizeType":"Medium Beast, Unaligned","cr":"1/8","xp":25,"ac":10,"hp":11,"speed":40,"speedText":"40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-octopus","name":"Octopus","sizeType":"Small Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":3,"speed":5,"speedText":"5 ft., Swim 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-owl","name":"Owl","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":11,"hp":1,"speed":5,"speedText":"5 ft., Fly 60 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-panther","name":"Panther","sizeType":"Medium Beast, Unaligned","cr":"1/4","xp":50,"ac":13,"hp":13,"speed":50,"speedText":"50 ft., Climb 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-piranha","name":"Piranha","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":13,"hp":1,"speed":5,"speedText":"5 ft., Swim 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-plesiosaurus","name":"Plesiosaurus","sizeType":"Large Beast (Dinosaur), Unaligned","cr":"2","xp":450,"ac":13,"hp":68,"speed":20,"speedText":"20 ft., Swim 40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-polar-bear","name":"Polar Bear","sizeType":"Large Beast, Unaligned","cr":"2","xp":450,"ac":12,"hp":42,"speed":40,"speedText":"40 ft., Swim 40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-pony","name":"Pony","sizeType":"Medium Beast, Unaligned","cr":"1/8","xp":25,"ac":10,"hp":11,"speed":40,"speedText":"40 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-pteranodon","name":"Pteranodon","sizeType":"Medium Beast (Dinosaur), Unaligned","cr":"1/4","xp":50,"ac":13,"hp":13,"speed":10,"speedText":"10 ft., Fly 60 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-rat","name":"Rat","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":10,"hp":1,"speed":20,"speedText":"20 ft., Climb 20 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-raven","name":"Raven","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":2,"speed":10,"speedText":"10 ft., Fly 50 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-reef-shark","name":"Reef Shark","sizeType":"Medium Beast, Unaligned","cr":"1/2","xp":100,"ac":12,"hp":22,"speed":5,"speedText":"5 ft., Swim 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-rhinoceros","name":"Rhinoceros","sizeType":"Large Beast, Unaligned","cr":"2","xp":450,"ac":13,"hp":45,"speed":40,"speedText":"40 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-riding-horse","name":"Riding Horse","sizeType":"Large Beast, Unaligned","cr":"1/4","xp":50,"ac":11,"hp":13,"speed":60,"speedText":"60 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-saber-toothed-tiger","name":"Saber-Toothed Tiger","sizeType":"Large Beast, Unaligned","cr":"2","xp":450,"ac":13,"hp":52,"speed":40,"speedText":"40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-scorpion","name":"Scorpion","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":11,"hp":1,"speed":10,"speedText":"10 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-seahorse","name":"Seahorse","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":1,"speed":5,"speedText":"5 ft., Swim 20 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-spider","name":"Spider","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":12,"hp":1,"speed":20,"speedText":"20 ft., Climb 20 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-swarm-of-bats","name":"Swarm of Bats","sizeType":"Large Swarm of Tiny Beasts, Unaligned","cr":"1/4","xp":50,"ac":12,"hp":11,"speed":5,"speedText":"5 ft., Fly 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-swarm-of-insects","name":"Swarm of Insects","sizeType":"Medium Swarm of Tiny Beasts, Unaligned","cr":"1/2","xp":100,"ac":11,"hp":19,"speed":20,"speedText":"20 ft., Climb or Fly 20 ft. (GM’s choice)","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-swarm-of-piranhas","name":"Swarm of Piranhas","sizeType":"Medium Swarm of Tiny Beasts, Unaligned","cr":"1","xp":200,"ac":13,"hp":28,"speed":5,"speedText":"5 ft., Swim 40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-swarm-of-rats","name":"Swarm of Rats","sizeType":"Medium Swarm of Tiny Beasts, Unaligned","cr":"1/4","xp":50,"ac":10,"hp":14,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-swarm-of-ravens","name":"Swarm of Ravens","sizeType":"Medium Swarm of Tiny Beasts, Unaligned","cr":"1/4","xp":50,"ac":12,"hp":11,"speed":10,"speedText":"10 ft., Fly 50 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-swarm-of-venomous-snakes","name":"Swarm of Venomous Snakes","sizeType":"Medium Swarm of Tiny Beasts, Unaligned","cr":"2","xp":450,"ac":14,"hp":36,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":14,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-tiger","name":"Tiger","sizeType":"Large Beast, Unaligned","cr":"1","xp":200,"ac":13,"hp":30,"speed":40,"speedText":"40 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-triceratops","name":"Triceratops","sizeType":"Huge Beast (Dinosaur), Unaligned","cr":"5","xp":1800,"ac":14,"hp":114,"speed":50,"speedText":"50 ft.","initiative":9,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-tyrannosaurus-rex","name":"Tyrannosaurus Rex","sizeType":"Huge Beast (Dinosaur), Unaligned","cr":"8","xp":3900,"ac":13,"hp":136,"speed":50,"speedText":"50 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-venomous-snake","name":"Venomous Snake","sizeType":"Tiny Beast, Unaligned","cr":"1/8","xp":25,"ac":12,"hp":5,"speed":30,"speedText":"30 ft., Swim 30 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-vulture","name":"Vulture","sizeType":"Medium Beast, Unaligned","cr":"0","xp":10,"ac":10,"hp":5,"speed":10,"speedText":"10 ft., Fly 50 ft.","initiative":10,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-warhorse","name":"Warhorse","sizeType":"Large Beast, Unaligned","cr":"1/2","xp":100,"ac":11,"hp":19,"speed":60,"speedText":"60 ft.","initiative":11,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-weasel","name":"Weasel","sizeType":"Tiny Beast, Unaligned","cr":"0","xp":10,"ac":13,"hp":1,"speed":30,"speedText":"30 ft., Climb 30 ft.","initiative":13,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false},{"id":"srd521-wolf","name":"Wolf","sizeType":"Medium Beast, Unaligned","cr":"1/4","xp":50,"ac":12,"hp":11,"speed":40,"speedText":"40 ft.","initiative":12,"type":"Enemy","source":"SRD 5.2.1","isHomebrew":false}];

  // 5e CR -> XP reference (used as fallback + auto-fix for malformed values).
  const CR_XP = {
    "0": 10,
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    "1": 200,
    "2": 450,
    "3": 700,
    "4": 1100,
    "5": 1800,
    "6": 2300,
    "7": 2900,
    "8": 3900,
    "9": 5000,
    "10": 5900,
    "11": 7200,
    "12": 8400,
    "13": 10000,
    "14": 11500,
    "15": 13000,
    "16": 15000,
    "17": 18000,
    "18": 20000,
    "19": 22000,
    "20": 25000,
    "21": 33000,
    "22": 41000,
    "23": 50000,
    "24": 62000,
    "25": 75000,
    "26": 90000,
    "27": 105000,
    "28": 120000,
    "29": 135000,
    "30": 155000
  };

  function uid(prefix = "mv") {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function intOr(v, fallback = 0) {
    const n = parseInt(String(v ?? "").replace(/,/g, ""), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }


  function toPlainText(value, depth = 0) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value).trim();
    }
    if (Array.isArray(value)) {
      return value
        .map((v) => toPlainText(v, depth + 1))
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    if (typeof value === "object") {
      if (depth > 5) return "";
      const preferred = [
        value.text,
        value.description,
        value.desc,
        value.effect,
        value.summary,
        value.note,
        value.value,
        value.entries
      ];
      const picked = preferred.map((v) => toPlainText(v, depth + 1)).filter(Boolean).join(" ").trim();
      if (picked) return picked;
      return Object.values(value)
        .map((v) => toPlainText(v, depth + 1))
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    return "";
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function crToFloat(cr) {
    if (!cr && cr !== 0) return -1;
    const s = String(cr).trim();
    if (!s) return -1;
    if (s.includes("/")) {
      const [a, b] = s.split("/");
      const num = Number(a);
      const den = Number(b);
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) return num / den;
      return -1;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : -1;
  }

  function normalizeCR(raw, fallback = "1/2") {
    const s = String(raw ?? "").trim();
    return s || fallback;
  }

  function normalizeXP(rawXp, cr) {
    const cleaned = String(rawXp ?? "").replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    const fromCR = CR_XP[String(cr)] ?? null;

    // Keep valid explicit values unless they are obviously malformed for high CR monsters.
    if (Number.isFinite(parsed) && parsed >= 0) {
      const crNum = crToFloat(cr);
      if (!(parsed <= 9 && crNum >= 5 && fromCR != null)) return parsed;
    }

    if (fromCR != null) return fromCR;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  function defaultAbilities() {
    return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  }

  function parseFeatureText(text) {
    const lines = toPlainText(text)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);

    return lines.map((line) => {
      const splitByDouble = line.split(/\s*::\s*/);
      if (splitByDouble.length >= 2) {
        return {
          name: splitByDouble.shift() || "Feature",
          text: splitByDouble.join(" :: ")
        };
      }

      const dotIdx = line.indexOf(".");
      if (dotIdx > 0 && dotIdx < 42) {
        const name = line.slice(0, dotIdx).trim();
        const text = line.slice(dotIdx + 1).trim();
        if (name && text) return { name, text };
      }

      return { name: "Feature", text: line };
    });
  }

  function normalizeFeatureArray(input) {
    if (!input) return [];

    if (typeof input === "string") {
      return parseFeatureText(input);
    }

    if (!Array.isArray(input)) return [];

    return input
      .map((item) => {
        if (!item) return null;

        if (typeof item === "string") {
          const parsed = parseFeatureText(item);
          return parsed.length ? parsed[0] : null;
        }

        if (typeof item === "object") {
          const name = String(
            item.name || item.title || item.label || item.action || "Feature"
          ).trim() || "Feature";
          const text = toPlainText(
            item.text ?? item.desc ?? item.description ?? item.effect ?? item.entries ?? item
          );
          if (!text) return null;
          return {
            name,
            text,
            attackBonus: Number.isFinite(Number(item.attackBonus ?? item.attack_bonus))
              ? Number(item.attackBonus ?? item.attack_bonus)
              : null
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  function featuresToText(features) {
    return (Array.isArray(features) ? features : [])
      .map((f) => {
        const name = String(f?.name || "").trim();
        const text = String(f?.text || "").trim();
        if (!name && !text) return "";
        if (!name || name === "Feature") return text;
        return `${name} :: ${text}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  function normalizeAbilities(raw) {
    const base = defaultAbilities();
    const src = raw && typeof raw === "object" ? raw : {};

    return {
      str: clamp(intOr(src.str, base.str), 1, 30),
      dex: clamp(intOr(src.dex, base.dex), 1, 30),
      con: clamp(intOr(src.con, base.con), 1, 30),
      int: clamp(intOr(src.int, base.int), 1, 30),
      wis: clamp(intOr(src.wis, base.wis), 1, 30),
      cha: clamp(intOr(src.cha, base.cha), 1, 30)
    };
  }

  function extractDetailsFromRaw(raw) {
    const details = raw?.details && typeof raw.details === "object" ? raw.details : raw || {};
    const abilitiesSource = details.abilityScores || {
      str: details.str,
      dex: details.dex,
      con: details.con,
      int: details.int,
      wis: details.wis,
      cha: details.cha
    };

    return {
      proficiencyBonus:
        details.proficiencyBonus == null && details.pb == null
          ? null
          : clamp(intOr(details.proficiencyBonus ?? details.pb, 2), 0, 20),
      abilityScores: normalizeAbilities(abilitiesSource),
      savingThrows: String(details.savingThrows || details.saves || "").trim(),
      skills: String(details.skills || "").trim(),
      damageVulnerabilities: String(details.damageVulnerabilities || details.vulnerabilities || "").trim(),
      damageResistances: String(details.damageResistances || details.resistances || "").trim(),
      damageImmunities: String(details.damageImmunities || details.immunities || "").trim(),
      conditionImmunities: String(details.conditionImmunities || "").trim(),
      senses: String(details.senses || "").trim(),
      languages: String(details.languages || "").trim(),
      challengeNote: String(details.challengeNote || details.challenge || "").trim(),
      traits: normalizeFeatureArray(details.traits),
      actions: normalizeFeatureArray(details.actions),
      bonusActions: normalizeFeatureArray(details.bonusActions),
      reactions: normalizeFeatureArray(details.reactions),
      legendaryActions: normalizeFeatureArray(details.legendaryActions)
    };
  }

  function normalizeMonster(raw, { isHomebrew = false } = {}) {
    const name = String(raw?.name || "").trim() || "Unnamed Monster";
    const cr = normalizeCR(raw?.cr, "1/2");
    const speedNumeric = Math.max(0, intOr(raw?.speed, 30));
    const hp = Math.max(1, intOr(raw?.hp, 10));

    const details = extractDetailsFromRaw(raw);

    return {
      id: String(raw?.id || uid(isHomebrew ? "hbm" : "srd")),
      name,
      sizeType: String(raw?.sizeType || raw?.size || "Medium Creature, Unaligned"),
      cr,
      xp: normalizeXP(raw?.xp, cr),
      ac: Math.max(0, intOr(raw?.ac, 13)),
      hp,
      speed: speedNumeric,
      speedText: String(raw?.speedText || `${speedNumeric} ft.`),
      initiative: Math.max(0, intOr(raw?.initiative, 10)),
      type: ["PC", "NPC", "Enemy"].includes(raw?.type) ? raw.type : "Enemy",
      source: String(raw?.source || (isHomebrew ? "Homebrew" : "SRD 5.2.1")),
      isHomebrew: !!isHomebrew,
      details,
      // top-level aliases for compatibility with any existing encounter code
      traits: details.traits,
      actions: details.actions,
      bonusActions: details.bonusActions,
      reactions: details.reactions,
      legendaryActions: details.legendaryActions,
      abilityScores: details.abilityScores
    };
  }

  function defaultDraft() {
    return {
      name: "",
      sizeType: "Medium Creature, Unaligned",
      cr: "1/2",
      xp: 100,
      ac: 13,
      hp: 10,
      speed: 30,
      speedText: "30 ft.",
      initiative: 10,
      type: "Enemy",
      source: "Homebrew",

      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      pb: 2,

      savingThrows: "",
      skills: "",
      damageVulnerabilities: "",
      damageResistances: "",
      damageImmunities: "",
      conditionImmunities: "",
      senses: "",
      languages: "",
      challengeNote: "",

      traitsText: "",
      actionsText: "",
      bonusActionsText: "",
      reactionsText: "",
      legendaryActionsText: ""
    };
  }

  function defaultState() {
    return {
      search: "",
      sourceFilter: "all",
      crFilter: "all",
      homebrew: [],
      srdDetailsById: {},
      srdDetailLookupFailures: {},
      editingId: null,
      expandedIds: [],
      activeTab: "vault",
      draft: defaultDraft()
    };
  }

  function normalizeDraft(input) {
    const d = input && typeof input === "object" ? input : {};
    const base = defaultDraft();

    return {
      ...base,
      name: String(d.name ?? base.name),
      sizeType: String(d.sizeType ?? base.sizeType),
      cr: normalizeCR(d.cr, base.cr),
      xp: Math.max(0, intOr(d.xp, base.xp)),
      ac: clamp(intOr(d.ac, base.ac), 0, 99),
      hp: Math.max(1, intOr(d.hp, base.hp)),
      speed: Math.max(0, intOr(d.speed, base.speed)),
      speedText: String(d.speedText || base.speedText),
      initiative: clamp(intOr(d.initiative, base.initiative), 0, 99),
      type: ["PC", "NPC", "Enemy"].includes(d.type) ? d.type : base.type,
      source: String(d.source || base.source),

      str: clamp(intOr(d.str, base.str), 1, 30),
      dex: clamp(intOr(d.dex, base.dex), 1, 30),
      con: clamp(intOr(d.con, base.con), 1, 30),
      int: clamp(intOr(d.int, base.int), 1, 30),
      wis: clamp(intOr(d.wis, base.wis), 1, 30),
      cha: clamp(intOr(d.cha, base.cha), 1, 30),
      pb: clamp(intOr(d.pb, base.pb), 0, 20),

      savingThrows: String(d.savingThrows || ""),
      skills: String(d.skills || ""),
      damageVulnerabilities: String(d.damageVulnerabilities || ""),
      damageResistances: String(d.damageResistances || ""),
      damageImmunities: String(d.damageImmunities || ""),
      conditionImmunities: String(d.conditionImmunities || ""),
      senses: String(d.senses || ""),
      languages: String(d.languages || ""),
      challengeNote: String(d.challengeNote || ""),

      traitsText: String(d.traitsText || ""),
      actionsText: String(d.actionsText || ""),
      bonusActionsText: String(d.bonusActionsText || ""),
      reactionsText: String(d.reactionsText || ""),
      legendaryActionsText: String(d.legendaryActionsText || "")
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeState(JSON.parse(raw));

      // migrate v1 if present
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const migrated = normalizeState(JSON.parse(legacyRaw));
        saveState(migrated);
        return migrated;
      }

      return defaultState();
    } catch {
      return defaultState();
    }
  }

  function normalizeState(input) {
    const base = defaultState();
    const s = input && typeof input === "object" ? input : {};

    base.search = String(s.search || "");
    base.sourceFilter = String(s.sourceFilter || "all");
    base.crFilter = String(s.crFilter || "all");
    base.editingId = s.editingId ? String(s.editingId) : null;
    base.expandedIds = Array.isArray(s.expandedIds) ? s.expandedIds.map((x) => String(x)) : [];
    base.activeTab = s.activeTab === "homebrew" ? "homebrew" : "vault";

    base.homebrew = Array.isArray(s.homebrew)
      ? s.homebrew.map((m) => normalizeMonster(m, { isHomebrew: true }))
      : [];

    if (s.srdDetailsById && typeof s.srdDetailsById === "object") {
      Object.entries(s.srdDetailsById).forEach(([id, details]) => {
        if (!details) return;
        base.srdDetailsById[String(id)] = extractDetailsFromRaw({ details });
      });
    }

    if (s.srdDetailLookupFailures && typeof s.srdDetailLookupFailures === "object") {
      Object.entries(s.srdDetailLookupFailures).forEach(([id, val]) => {
        if (val) base.srdDetailLookupFailures[String(id)] = true;
      });
    }

    // Support old state shape (v1 draft without details)
    if (s.draft && typeof s.draft === "object") {
      const looksOld = !("traitsText" in s.draft) && !("actionsText" in s.draft) && !("str" in s.draft);
      if (looksOld) {
        const seed = normalizeMonster({ ...s.draft, isHomebrew: true }, { isHomebrew: true });
        base.draft = draftFromMonster(seed);
      } else {
        base.draft = normalizeDraft(s.draft);
      }
    }

    return base;
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Monster Vault: save failed", err);
    }
  }

  function normalizeSrdList() {
    return SRD_MONSTERS.map((m) => normalizeMonster(m, { isHomebrew: false }));
  }

  const SRD_BASE = normalizeSrdList();

  function getSrdMonstersWithDetails() {
    return SRD_BASE.map((m) => {
      const details = state.srdDetailsById?.[m.id];
      if (!details) return m;
      return normalizeMonster(
        {
          ...m,
          details,
          traits: details.traits,
          actions: details.actions,
          bonusActions: details.bonusActions,
          reactions: details.reactions,
          legendaryActions: details.legendaryActions
        },
        { isHomebrew: false }
      );
    });
  }

  function allMonsters() {
    return [...getSrdMonstersWithDetails(), ...state.homebrew]
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function hasDetails(monster) {
    const d = monster?.details;
    if (!d) return false;
    return (
      (d.traits?.length || 0) +
      (d.actions?.length || 0) +
      (d.bonusActions?.length || 0) +
      (d.reactions?.length || 0) +
      (d.legendaryActions?.length || 0)
    ) > 0;
  }


  function slugifyMonsterName(name) {
    return String(name || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function fetchJson(url) {
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  function detailsFromApiMonster(raw) {
    if (!raw || typeof raw !== "object") return null;

    const senses = raw.senses && typeof raw.senses === "object"
      ? Object.entries(raw.senses)
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
          .join(", ")
      : String(raw.senses || "");

    const asStringList = (v) => {
      if (Array.isArray(v)) return v.map((x) => toPlainText(x)).filter(Boolean).join(", ");
      return toPlainText(v);
    };

    const details = {
      proficiencyBonus: raw.proficiency_bonus ?? raw.prof_bonus ?? null,
      abilityScores: normalizeAbilities({
        str: raw.strength ?? raw.str,
        dex: raw.dexterity ?? raw.dex,
        con: raw.constitution ?? raw.con,
        int: raw.intelligence ?? raw.int,
        wis: raw.wisdom ?? raw.wis,
        cha: raw.charisma ?? raw.cha
      }),
      savingThrows: asStringList(raw.saving_throws || raw.saves || raw.proficiencies),
      skills: asStringList(raw.skills),
      damageVulnerabilities: asStringList(raw.damage_vulnerabilities),
      damageResistances: asStringList(raw.damage_resistances),
      damageImmunities: asStringList(raw.damage_immunities),
      conditionImmunities: asStringList(raw.condition_immunities),
      senses,
      languages: asStringList(raw.languages),
      challengeNote: String(raw.challenge_rating || raw.cr || ""),
      traits: normalizeFeatureArray(raw.special_abilities || raw.traits),
      actions: normalizeFeatureArray(raw.actions),
      bonusActions: normalizeFeatureArray(raw.bonus_actions),
      reactions: normalizeFeatureArray(raw.reactions),
      legendaryActions: normalizeFeatureArray(raw.legendary_actions)
    };

    return extractDetailsFromRaw({ details });
  }

  async function hydrateSrdDetailsById(id) {
    if (!id) return null;
    if (state.srdDetailsById[id]) return state.srdDetailsById[id];
    if (state.srdDetailLookupFailures[id]) return null;

    const monster = SRD_BASE.find((m) => m.id === id);
    if (!monster) return null;

    const slug = slugifyMonsterName(monster.name);
    if (!slug) return null;

    const candidates = [
      `https://www.dnd5eapi.co/api/2014/monsters/${slug}`,
      `https://www.dnd5eapi.co/api/monsters/${slug}`,
      `https://www.dnd5eapi.co/api/2024/monsters/${slug}`
    ];

    for (const url of candidates) {
      try {
        const payload = await fetchJson(url);
        const details = detailsFromApiMonster(payload);
        if (!details) continue;

        const actionCount =
          (details.actions?.length || 0) +
          (details.bonusActions?.length || 0) +
          (details.reactions?.length || 0) +
          (details.legendaryActions?.length || 0);

        if (actionCount > 0 || (details.traits?.length || 0) > 0) {
          state.srdDetailsById[id] = details;
          saveState(state);
          publishApi();
          return details;
        }
      } catch {
        // try next endpoint
      }
    }

    state.srdDetailLookupFailures[id] = true;
    saveState(state);
    return null;
  }

  function filteredMonsters() {
    const q = state.search.trim().toLowerCase();

    return allMonsters().filter((m) => {
      if (state.sourceFilter === "homebrew" && !m.isHomebrew) return false;
      if (state.sourceFilter === "srd" && m.isHomebrew) return false;
      if (state.crFilter !== "all" && String(m.cr) !== state.crFilter) return false;

      if (!q) return true;

      const hay = [
        m.name,
        m.sizeType,
        m.cr,
        m.source,
        m.details?.languages,
        m.details?.senses,
        ...(m.details?.actions || []).map((x) => `${x.name} ${x.text}`),
        ...(m.details?.traits || []).map((x) => `${x.name} ${x.text}`)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }

  function clearDraft() {
    state.editingId = null;
    state.draft = defaultDraft();
  }

  function draftFromMonster(mon) {
    const d = mon.details || extractDetailsFromRaw(mon);
    return normalizeDraft({
      name: mon.name,
      sizeType: mon.sizeType,
      cr: mon.cr,
      xp: mon.xp,
      ac: mon.ac,
      hp: mon.hp,
      speed: mon.speed,
      speedText: mon.speedText || `${mon.speed} ft.`,
      initiative: mon.initiative,
      type: mon.type,
      source: mon.source || "Homebrew",

      str: d.abilityScores?.str,
      dex: d.abilityScores?.dex,
      con: d.abilityScores?.con,
      int: d.abilityScores?.int,
      wis: d.abilityScores?.wis,
      cha: d.abilityScores?.cha,
      pb: d.proficiencyBonus ?? 2,

      savingThrows: d.savingThrows,
      skills: d.skills,
      damageVulnerabilities: d.damageVulnerabilities,
      damageResistances: d.damageResistances,
      damageImmunities: d.damageImmunities,
      conditionImmunities: d.conditionImmunities,
      senses: d.senses,
      languages: d.languages,
      challengeNote: d.challengeNote,

      traitsText: featuresToText(d.traits),
      actionsText: featuresToText(d.actions),
      bonusActionsText: featuresToText(d.bonusActions),
      reactionsText: featuresToText(d.reactions),
      legendaryActionsText: featuresToText(d.legendaryActions)
    });
  }

  function setDraftFromMonster(mon, mode = "edit") {
    state.editingId = mode === "clone" ? null : mon.id;
    const baseDraft = draftFromMonster(mon);
    if (mode === "clone") {
      baseDraft.name = `${mon.name} (Homebrew)`;
      baseDraft.source = "Homebrew";
    }
    state.draft = baseDraft;
    state.activeTab = "homebrew";
  }

  function draftToHomebrewMonster(draft, idOverride = null) {
    return normalizeMonster(
      {
        id: idOverride || uid("hbm"),
        name: draft.name,
        sizeType: draft.sizeType,
        cr: draft.cr,
        xp: draft.xp,
        ac: draft.ac,
        hp: draft.hp,
        speed: draft.speed,
        speedText: draft.speedText || `${draft.speed} ft.`,
        initiative: draft.initiative,
        type: draft.type,
        source: draft.source || "Homebrew",
        details: {
          proficiencyBonus: draft.pb,
          abilityScores: {
            str: draft.str,
            dex: draft.dex,
            con: draft.con,
            int: draft.int,
            wis: draft.wis,
            cha: draft.cha
          },
          savingThrows: draft.savingThrows,
          skills: draft.skills,
          damageVulnerabilities: draft.damageVulnerabilities,
          damageResistances: draft.damageResistances,
          damageImmunities: draft.damageImmunities,
          conditionImmunities: draft.conditionImmunities,
          senses: draft.senses,
          languages: draft.languages,
          challengeNote: draft.challengeNote,
          traits: parseFeatureText(draft.traitsText),
          actions: parseFeatureText(draft.actionsText),
          bonusActions: parseFeatureText(draft.bonusActionsText),
          reactions: parseFeatureText(draft.reactionsText),
          legendaryActions: parseFeatureText(draft.legendaryActionsText)
        }
      },
      { isHomebrew: true }
    );
  }

  function upsertHomebrewFromDraft() {
    const monster = draftToHomebrewMonster(state.draft, state.editingId || uid("hbm"));
    const idx = state.homebrew.findIndex((m) => m.id === monster.id);

    if (idx >= 0) state.homebrew[idx] = monster;
    else state.homebrew.push(monster);

    if (!state.expandedIds.includes(monster.id)) state.expandedIds.push(monster.id);

    clearDraft();
    state.activeTab = "vault";
    saveState(state);
    publishApi();
  }

  function deleteHomebrew(id) {
    state.homebrew = state.homebrew.filter((m) => m.id !== id);
    state.expandedIds = state.expandedIds.filter((x) => x !== id);
    if (state.editingId === id) clearDraft();
    saveState(state);
    publishApi();
  }

  function toggleExpanded(id) {
    if (!id) return;
    if (state.expandedIds.includes(id)) {
      state.expandedIds = state.expandedIds.filter((x) => x !== id);
    } else {
      state.expandedIds.push(id);
    }
    saveState(state);
  }

  function exportHomebrew() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 2,
      monsters: state.homebrew
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monster-vault-homebrew.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importHomebrewFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const list = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.monsters)
            ? parsed.monsters
            : [];

        if (!list.length) {
          window.alert("No monsters found in that JSON.");
          return;
        }

        const normalized = list.map((m) => normalizeMonster(m, { isHomebrew: true }));
        const byId = new Map(state.homebrew.map((m) => [m.id, m]));
        normalized.forEach((m) => byId.set(m.id, m));
        state.homebrew = [...byId.values()];

        saveState(state);
        publishApi();
        renderMonsterVaultTool();
      } catch (err) {
        console.error(err);
        window.alert("Could not import file. Use a JSON export from Monster Vault.");
      }
    };
    reader.readAsText(file);
  }

  function toEncounterCombatant(monsterOrId, overrides = {}) {
    const src =
      typeof monsterOrId === "string"
        ? allMonsters().find((m) => m.id === monsterOrId)
        : normalizeMonster(monsterOrId, { isHomebrew: !!monsterOrId?.isHomebrew });

    if (!src) return null;

    const out = {
      id: uid("c"),
      name: src.name,
      type: ["PC", "NPC", "Enemy"].includes(src.type) ? src.type : "Enemy",
      initiative: Math.max(0, intOr(src.initiative, 10)),
      ac: Math.max(0, intOr(src.ac, 13)),
      speed: Math.max(0, intOr(src.speed, 30)),
      hpCurrent: Math.max(0, intOr(src.hp, 1)),
      hpMax: Math.max(1, intOr(src.hp, 1)),
      level: src.type === "Enemy" ? 1 : 3,
      cr: src.cr || "1/2",
      sourceMonsterId: src.id,
      sourceMonsterName: src.name,
      source: src.source,
      xp: src.xp,
      sizeType: src.sizeType,
      details: JSON.parse(JSON.stringify(src.details || {})),
      traits: JSON.parse(JSON.stringify(src.details?.traits || [])),
      actions: JSON.parse(JSON.stringify(src.details?.actions || [])),
      bonusActions: JSON.parse(JSON.stringify(src.details?.bonusActions || [])),
      reactions: JSON.parse(JSON.stringify(src.details?.reactions || [])),
      legendaryActions: JSON.parse(JSON.stringify(src.details?.legendaryActions || [])),
      conditions: []
    };

    const merged = { ...out, ...(overrides || {}) };
    merged.hpMax = Math.max(1, intOr(merged.hpMax, out.hpMax));
    merged.hpCurrent = clamp(intOr(merged.hpCurrent, out.hpCurrent), 0, merged.hpMax);
    merged.ac = Math.max(0, intOr(merged.ac, out.ac));
    merged.speed = Math.max(0, intOr(merged.speed, out.speed));
    merged.initiative = Math.max(0, intOr(merged.initiative, out.initiative));
    merged.cr = normalizeCR(merged.cr, out.cr);
    return merged;
  }


  function publishApi() {
    const api = {
      version: 3,
      getAllMonsters() {
        return allMonsters().map((m) => JSON.parse(JSON.stringify(m)));
      },
      getMonsterById(id) {
        const mon = allMonsters().find((m) => m.id === id);
        return mon ? JSON.parse(JSON.stringify(mon)) : null;
      },
      getMonsterIndex() {
        return allMonsters().map((m) => {
          const actionCount = (m.details?.actions?.length || 0) + (m.details?.bonusActions?.length || 0) + (m.details?.reactions?.length || 0) + (m.details?.legendaryActions?.length || 0);
          return {
            id: String(m.id || ""),
            name: String(m.name || "Unnamed Monster"),
            type: ["PC", "NPC", "Enemy"].includes(m.type) ? m.type : "Enemy",
            cr: normalizeCR(m.cr, "1/8"),
            ac: Math.max(0, intOr(m.ac, 10)),
            hp: Math.max(1, intOr(m.hp, 1)),
            speed: Math.max(0, intOr(m.speed, 30)),
            initiative: Math.max(0, intOr(m.initiative, 10)),
            sizeType: String(m.sizeType || ""),
            source: m.isHomebrew ? "Homebrew" : "SRD 2024",
            sourceType: m.isHomebrew ? "homebrew" : "srd",
            actionsCount: actionCount
          };
        });
      },
      searchMonsters(query = "") {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return this.getAllMonsters();
        return allMonsters()
          .filter((m) => `${m.name} ${m.cr} ${m.sizeType} ${m.source}`.toLowerCase().includes(q))
          .map((m) => JSON.parse(JSON.stringify(m)));
      },
      addHomebrewMonster(rawMonster) {
        const monster = normalizeMonster(
          {
            ...(rawMonster || {}),
            id: rawMonster?.id || uid("hbm")
          },
          { isHomebrew: true }
        );

        const idx = state.homebrew.findIndex((m) => m.id === monster.id);
        if (idx >= 0) state.homebrew[idx] = monster;
        else state.homebrew.push(monster);

        saveState(state);
        publishApi();
        renderMonsterVaultTool();
        return JSON.parse(JSON.stringify(monster));
      },
      removeHomebrewMonster(id) {
        deleteHomebrew(String(id || ""));
      },
      toEncounterCombatant(monsterOrId, overrides = {}) {
        return toEncounterCombatant(monsterOrId, overrides);
      }
    };

    // Add compatibility data fields for older tools that expect direct arrays.
    const indexSnapshot = api.getMonsterIndex();
    const allSnapshot = api.getAllMonsters();
    api.monsters = allSnapshot;
    api.items = indexSnapshot;
    api.index = indexSnapshot;
    api.data = allSnapshot;
    api.results = indexSnapshot;

    window.VrahuneMonsterVault = api;

    // Compatibility aliases for older integrations.
    window.MonsterVault = api;
    window.vrahuneMonsterVault = api;

    // Cross-tool snapshots to avoid empty picker if an integration grabs globals before api methods.
    window.__vrahuneMonsterVaultIndex = indexSnapshot;
    window.__vrahuneMonsterVaultMonsters = allSnapshot;
    window.__vrahuneMonsterVaultVersion = api.version;

    const detail = {
      total: indexSnapshot.length,
      homebrew: state.homebrew.length,
      srd: Math.max(0, indexSnapshot.length - state.homebrew.length),
      version: api.version
    };

    window.dispatchEvent(new CustomEvent("vrahune-monster-vault-updated", { detail }));
    window.dispatchEvent(new CustomEvent("vrahune-monster-vault-ready", { detail }));
  }

  function renderFeatureList(label, list) {

    const arr = Array.isArray(list) ? list : [];
    if (!arr.length) return "";

    return `
      <div class="mv-detail-section">
        <div class="mv-detail-heading">${esc(label)} (${arr.length})</div>
        <ul class="mv-feature-list">
          ${arr
            .map((f) => {
              const name = String(f?.name || "Feature").trim();
              const text = toPlainText(f?.text ?? f?.description ?? f);
              if (!text) return "";
              return `<li><b>${esc(name)}.</b> ${esc(text)}</li>`;
            })
            .join("")}
        </ul>
      </div>
    `;
  }

  function renderMonsterDetails(monster) {
    const d = monster.details || {};
    const a = d.abilityScores || defaultAbilities();

    const miscRows = [
      ["Saving Throws", d.savingThrows],
      ["Skills", d.skills],
      ["Vulnerabilities", d.damageVulnerabilities],
      ["Resistances", d.damageResistances],
      ["Immunities", d.damageImmunities],
      ["Condition Immunities", d.conditionImmunities],
      ["Senses", d.senses],
      ["Languages", d.languages],
      ["Challenge Notes", d.challengeNote]
    ].filter(([, value]) => String(value || "").trim());

    const actionCount =
      (d.actions?.length || 0) +
      (d.bonusActions?.length || 0) +
      (d.reactions?.length || 0) +
      (d.legendaryActions?.length || 0);

    return `
      <div class="mv-details">
        <div class="mv-details-grid">
          <div class="mv-statline"><span>STR</span><b>${a.str}</b></div>
          <div class="mv-statline"><span>DEX</span><b>${a.dex}</b></div>
          <div class="mv-statline"><span>CON</span><b>${a.con}</b></div>
          <div class="mv-statline"><span>INT</span><b>${a.int}</b></div>
          <div class="mv-statline"><span>WIS</span><b>${a.wis}</b></div>
          <div class="mv-statline"><span>CHA</span><b>${a.cha}</b></div>
          <div class="mv-statline"><span>PB</span><b>${d.proficiencyBonus == null ? "—" : `+${d.proficiencyBonus}`}</b></div>
          <div class="mv-statline"><span>XP</span><b>${Number(monster.xp || 0).toLocaleString()}</b></div>
        </div>

        ${miscRows.length
          ? `<div class="mv-detail-lines">${miscRows
              .map(([k, v]) => `<div class="mv-detail-line"><span>${esc(k)}</span><b>${esc(v)}</b></div>`)
              .join("")}</div>`
          : ""}

        ${renderFeatureList("Traits", d.traits)}

        ${actionCount
          ? `
            ${renderFeatureList("Actions", d.actions)}
            ${renderFeatureList("Bonus Actions", d.bonusActions)}
            ${renderFeatureList("Reactions", d.reactions)}
            ${renderFeatureList("Legendary Actions", d.legendaryActions)}
          `
          : `<div class="mv-muted" style="margin-top:4px;">No actions recorded for this entry yet. Add them in homebrew editor to use attack/details toggles in encounter cards.</div>`}
      </div>
    `;
  }

  function renderMonsterRows(list) {
    return list
      .slice(0, 420)
      .map((m) => {
        const isOpen = state.expandedIds.includes(m.id);
        const tag = m.isHomebrew ? "Homebrew" : "SRD";
        const actionsCount = (m.details?.actions?.length || 0) + (m.details?.bonusActions?.length || 0) + (m.details?.reactions?.length || 0) + (m.details?.legendaryActions?.length || 0);
        const hasLoadedDetails = hasDetails(m);
        const isLoading = srdLoadInFlight.has(m.id);

        const actions = m.isHomebrew
          ? `
            <button class="btn btn-secondary btn-xs" data-mv-edit="${esc(m.id)}">Edit</button>
            <button class="btn btn-secondary btn-xs" data-mv-delete="${esc(m.id)}">Delete</button>
          `
          : `
            <button class="btn btn-secondary btn-xs" data-mv-clone="${esc(m.id)}">Clone to Homebrew</button>
            <span class="mv-source-tag">${tag}</span>
          `;

        return `
          <div class="mv-row-wrap ${isOpen ? "open" : ""}">
            <div class="mv-row">
              <div class="mv-main">
                <div class="mv-name">${esc(m.name)}</div>
                <div class="mv-meta">
                  CR ${esc(m.cr)} · XP ${Number(m.xp || 0).toLocaleString()} · AC ${m.ac} · HP ${m.hp} · Spd ${m.speed} · Init ${m.initiative}
                </div>
                <div class="mv-submeta">
                  ${esc(m.sizeType)} · ${esc(m.source)}${hasDetails(m) ? ` · Details ${actionsCount ? `· Actions ${actionsCount}` : ""}` : " · Details auto-load on open"}
                </div>
              </div>
              <div class="mv-actions">
                <button class="btn btn-secondary btn-xs" data-mv-toggle="${esc(m.id)}" ${isLoading ? "disabled" : ""}>
                  ${isLoading ? "Loading..." : (isOpen ? "Hide details" : "Details")}
                </button>
                ${actions}
              </div>
            </div>
            ${isOpen ? renderMonsterDetails(m) : ""}
          </div>
        `;
      })
      .join("");
  }

  let state = loadState();
  const srdLoadInFlight = new Set();

  function renderMonsterVaultTool() {
    const panel = document.getElementById("generatorPanel");
    const label = document.getElementById("activeGeneratorLabel");
    if (!panel || !label) return;
    label.textContent = TOOL_NAME;

    const all = allMonsters();
    const filtered = filteredMonsters();
    const crOptions = [...new Set(all.map((m) => String(m.cr || "")).filter(Boolean))]
      .sort((a, b) => crToFloat(a) - crToFloat(b));

    panel.innerHTML = `
      <style>
        .mv-root {
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: #dbe4ff;
        }

        .mv-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          padding: 8px 10px;
          border: 1px solid #2a3240;
          border-radius: 10px;
          background: #0b111a;
        }

        .mv-title {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: .01em;
        }

        .mv-counts {
          font-size: .76rem;
          color: #97a9ce;
        }

        .mv-controls {
          display: grid;
          grid-template-columns: 1.4fr .6fr .5fr;
          gap: 8px;
        }

        .mv-section-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .mv-tab {
          border: 1px solid #2f3b4f;
          background: #0b111a;
          color: #b7c8ea;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: .74rem;
          font-weight: 620;
          cursor: pointer;
          transition: border-color .15s ease, background .15s ease, color .15s ease;
        }

        .mv-tab:hover {
          border-color: #516b96;
          color: #e5eeff;
        }

        .mv-tab.active {
          border-color: #6f89b3;
          background: linear-gradient(180deg, #1d2d44, #162233);
          color: #edf4ff;
        }

        .mv-layout {
          display: grid;
          grid-template-columns: 1.35fr .95fr;
          gap: 10px;
          min-height: 520px;
        }

        .mv-layout.single {
          grid-template-columns: 1fr;
          min-height: 0;
        }

        .mv-card {
          border: 1px solid #2a3240;
          border-radius: 10px;
          background: #0a0f16;
          padding: 8px;
          min-width: 0;
        }

        .mv-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 650px;
          overflow: auto;
          padding-right: 2px;
        }

        .mv-row-wrap {
          border: 1px solid #233046;
          border-radius: 9px;
          background: #0c131f;
        }

        .mv-row-wrap.open {
          border-color: #43557a;
          box-shadow: 0 0 0 1px rgba(99, 129, 183, 0.22);
        }

        .mv-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 8px;
        }

        .mv-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .mv-name {
          font-size: .84rem;
          color: #edf3ff;
          font-weight: 650;
        }

        .mv-meta {
          font-size: .72rem;
          color: #9bb0d7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 640px;
        }

        .mv-submeta {
          font-size: .70rem;
          color: #7d92bb;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 700px;
        }

        .mv-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .mv-source-tag {
          border: 1px solid #2f3c53;
          border-radius: 999px;
          padding: 2px 7px;
          font-size: .7rem;
          color: #9fb2d8;
        }

        .mv-details {
          border-top: 1px solid #28354d;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          background: linear-gradient(180deg, rgba(8, 13, 21, .8), rgba(8, 13, 21, .35));
        }

        .mv-details-grid {
          display: grid;
          gap: 6px;
          grid-template-columns: repeat(8, minmax(0, 1fr));
        }

        .mv-statline {
          border: 1px solid #2c3950;
          border-radius: 7px;
          padding: 4px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: #0a111d;
        }

        .mv-statline span {
          font-size: .62rem;
          color: #94aad6;
          letter-spacing: .03em;
          text-transform: uppercase;
        }

        .mv-statline b {
          font-size: .76rem;
          color: #eef4ff;
        }

        .mv-detail-lines {
          display: grid;
          gap: 4px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .mv-detail-line {
          border: 1px solid #253248;
          border-radius: 7px;
          background: #0a1019;
          padding: 4px 6px;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .mv-detail-line span {
          font-size: .63rem;
          color: #8ea2c8;
          text-transform: uppercase;
          letter-spacing: .03em;
        }

        .mv-detail-line b {
          font-size: .71rem;
          color: #dfe9ff;
          font-weight: 560;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .mv-detail-section {
          border: 1px solid #253248;
          border-radius: 8px;
          padding: 6px 7px;
          background: #090f18;
        }

        .mv-detail-heading {
          font-size: .68rem;
          color: #9eb2d8;
          text-transform: uppercase;
          letter-spacing: .04em;
          margin-bottom: 4px;
        }

        .mv-feature-list {
          margin: 0;
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mv-feature-list li {
          font-size: .74rem;
          color: #dbe4f7;
          line-height: 1.35;
        }

        .mv-editor-title {
          font-size: .8rem;
          color: #a8bde3;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: .03em;
        }

        .mv-form-grid {
          display: grid;
          gap: 7px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .mv-form-grid .full {
          grid-column: 1 / -1;
        }

        .mv-stat-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          margin-top: 2px;
        }

        .mv-btn-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
          justify-content: flex-end;
        }

        .mv-muted {
          font-size: .74rem;
          color: #8ca1c9;
        }

        .mv-help {
          font-size: .71rem;
          color: #90a4ca;
          margin-top: 2px;
        }

        textarea.mv-textarea {
          width: 100%;
          min-height: 74px;
          resize: vertical;
          font-family: inherit;
          font-size: .76rem;
          color: #dfe9fb;
          background: #0a1018;
          border: 1px solid #26344a;
          border-radius: 8px;
          padding: 6px 7px;
        }

        @media (max-width: 1120px) {
          .mv-layout {
            grid-template-columns: 1fr;
          }
          .mv-controls {
            grid-template-columns: 1fr;
          }
          .mv-details-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .mv-detail-lines {
            grid-template-columns: 1fr;
          }
          .mv-stat-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .mv-details-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      </style>

      <div class="mv-root">
        <div class="mv-topbar">
          <div>
            <div class="mv-title">Monster Vault</div>
            <div class="mv-counts">SRD 5.2.1 monsters: ${SRD_BASE.length} · Homebrew: ${state.homebrew.length} · Total: ${all.length}</div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-xs" id="mvExportBtn">Export Homebrew</button>
            <button class="btn btn-secondary btn-xs" id="mvImportBtn">Import Homebrew</button>
            <input id="mvImportInput" type="file" accept="application/json,.json" style="display:none;" />
          </div>
        </div>

        <div class="mv-section-tabs">
          <button class="mv-tab ${state.activeTab === "vault" ? "active" : ""}" data-mv-tab="vault">Monster Vault</button>
          <button class="mv-tab ${state.activeTab === "homebrew" ? "active" : ""}" data-mv-tab="homebrew">Create Homebrew Monster</button>
        </div>

        ${state.activeTab === "vault" ? `
        <div class="mv-controls">
          <div>
            <label for="mvSearch">Search</label>
            <input id="mvSearch" type="text" placeholder="Search monsters, attacks, traits..." value="${esc(state.search)}">
          </div>
          <div>
            <label for="mvSourceFilter">Source</label>
            <select id="mvSourceFilter">
              <option value="all" ${state.sourceFilter === "all" ? "selected" : ""}>All</option>
              <option value="srd" ${state.sourceFilter === "srd" ? "selected" : ""}>SRD</option>
              <option value="homebrew" ${state.sourceFilter === "homebrew" ? "selected" : ""}>Homebrew</option>
            </select>
          </div>
          <div>
            <label for="mvCrFilter">CR</label>
            <select id="mvCrFilter">
              <option value="all" ${state.crFilter === "all" ? "selected" : ""}>All</option>
              ${crOptions.map((cr) => `<option value="${esc(cr)}" ${state.crFilter === cr ? "selected" : ""}>${esc(cr)}</option>`).join("")}
            </select>
          </div>
        </div>
        ` : ""}

        <div class="mv-layout ${state.activeTab === "homebrew" ? "single" : ""}">
          ${state.activeTab === "vault" ? `
          <div class="mv-card">
            <div class="mv-muted" style="margin-bottom:8px;">${filtered.length} result${filtered.length === 1 ? "" : "s"}${filtered.length > 420 ? " (showing first 420)" : ""}</div>
            <div class="mv-list">
              ${renderMonsterRows(filtered) || `<div class="mv-muted">No monsters match your filters.</div>`}
            </div>
          </div>
          ` : ""}

          ${state.activeTab === "homebrew" ? `
          <div class="mv-card">
            <div class="mv-editor-title">${state.editingId ? "Edit homebrew monster" : "Create homebrew monster"}</div>
            <div class="mv-form-grid">
              <div class="full">
                <label for="mvName">Name</label>
                <input id="mvName" type="text" value="${esc(state.draft.name)}" placeholder="Frostbound Ravager">
              </div>

              <div class="full">
                <label for="mvSizeType">Size & type</label>
                <input id="mvSizeType" type="text" value="${esc(state.draft.sizeType)}" placeholder="Large Monstrosity, Chaotic Evil">
              </div>

              <div>
                <label for="mvCr">CR</label>
                <input id="mvCr" type="text" value="${esc(state.draft.cr)}" placeholder="5">
              </div>

              <div>
                <label for="mvXp">XP</label>
                <input id="mvXp" type="number" min="0" value="${state.draft.xp}">
              </div>

              <div>
                <label for="mvType">Tag</label>
                <select id="mvType">
                  <option value="Enemy" ${state.draft.type === "Enemy" ? "selected" : ""}>Enemy</option>
                  <option value="NPC" ${state.draft.type === "NPC" ? "selected" : ""}>NPC</option>
                  <option value="PC" ${state.draft.type === "PC" ? "selected" : ""}>PC</option>
                </select>
              </div>

              <div>
                <label for="mvAc">AC</label>
                <input id="mvAc" type="number" min="0" value="${state.draft.ac}">
              </div>

              <div>
                <label for="mvHp">HP</label>
                <input id="mvHp" type="number" min="1" value="${state.draft.hp}">
              </div>

              <div>
                <label for="mvSpeed">Speed</label>
                <input id="mvSpeed" type="number" min="0" value="${state.draft.speed}">
              </div>

              <div>
                <label for="mvSpeedText">Speed text</label>
                <input id="mvSpeedText" type="text" value="${esc(state.draft.speedText)}" placeholder="30 ft., Fly 60 ft.">
              </div>

              <div>
                <label for="mvInitiative">Initiative</label>
                <input id="mvInitiative" type="number" min="0" value="${state.draft.initiative}">
              </div>

              <div>
                <label for="mvPb">PB</label>
                <input id="mvPb" type="number" min="0" value="${state.draft.pb}">
              </div>

              <div class="full">
                <label>Ability scores</label>
                <div class="mv-stat-grid">
                  <input id="mvStr" type="number" min="1" max="30" value="${state.draft.str}" title="STR" placeholder="STR">
                  <input id="mvDex" type="number" min="1" max="30" value="${state.draft.dex}" title="DEX" placeholder="DEX">
                  <input id="mvCon" type="number" min="1" max="30" value="${state.draft.con}" title="CON" placeholder="CON">
                  <input id="mvInt" type="number" min="1" max="30" value="${state.draft.int}" title="INT" placeholder="INT">
                  <input id="mvWis" type="number" min="1" max="30" value="${state.draft.wis}" title="WIS" placeholder="WIS">
                  <input id="mvCha" type="number" min="1" max="30" value="${state.draft.cha}" title="CHA" placeholder="CHA">
                </div>
              </div>

              <div class="full">
                <label for="mvSaves">Saving throws</label>
                <input id="mvSaves" type="text" value="${esc(state.draft.savingThrows)}" placeholder="Dex +6, Wis +3">
              </div>

              <div class="full">
                <label for="mvSkills">Skills</label>
                <input id="mvSkills" type="text" value="${esc(state.draft.skills)}" placeholder="Stealth +8, Perception +4">
              </div>

              <div class="full">
                <label for="mvResists">Damage resistances</label>
                <input id="mvResists" type="text" value="${esc(state.draft.damageResistances)}" placeholder="cold, fire">
              </div>

              <div class="full">
                <label for="mvImmunities">Damage immunities</label>
                <input id="mvImmunities" type="text" value="${esc(state.draft.damageImmunities)}" placeholder="poison">
              </div>

              <div class="full">
                <label for="mvVuln">Damage vulnerabilities</label>
                <input id="mvVuln" type="text" value="${esc(state.draft.damageVulnerabilities)}" placeholder="radiant">
              </div>

              <div class="full">
                <label for="mvCondImm">Condition immunities</label>
                <input id="mvCondImm" type="text" value="${esc(state.draft.conditionImmunities)}" placeholder="charmed, frightened">
              </div>

              <div>
                <label for="mvSenses">Senses</label>
                <input id="mvSenses" type="text" value="${esc(state.draft.senses)}" placeholder="darkvision 60 ft.">
              </div>

              <div>
                <label for="mvLanguages">Languages</label>
                <input id="mvLanguages" type="text" value="${esc(state.draft.languages)}" placeholder="Common, Draconic">
              </div>

              <div class="full">
                <label for="mvChallengeNote">Challenge notes</label>
                <input id="mvChallengeNote" type="text" value="${esc(state.draft.challengeNote)}" placeholder="Mythic trait active in phase 2">
              </div>

              <div class="full">
                <label for="mvTraits">Traits (one per line)</label>
                <textarea id="mvTraits" class="mv-textarea" placeholder="Pack Tactics :: The monster has advantage on attack rolls while an ally is within 5 feet.">${esc(state.draft.traitsText)}</textarea>
              </div>

              <div class="full">
                <label for="mvActions">Actions / attacks (one per line)</label>
                <textarea id="mvActions" class="mv-textarea" placeholder="Bite :: Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6+4) piercing damage.">${esc(state.draft.actionsText)}</textarea>
                <div class="mv-help">Format: <b>Name :: description</b> or <b>Name. description</b>. This is what your encounter card "Details" toggle will use.</div>
              </div>

              <div class="full">
                <label for="mvBonusActions">Bonus actions</label>
                <textarea id="mvBonusActions" class="mv-textarea" placeholder="Dash :: The monster moves up to its speed.">${esc(state.draft.bonusActionsText)}</textarea>
              </div>

              <div class="full">
                <label for="mvReactions">Reactions</label>
                <textarea id="mvReactions" class="mv-textarea" placeholder="Parry :: The monster adds +2 AC against one melee attack that would hit.">${esc(state.draft.reactionsText)}</textarea>
              </div>

              <div class="full">
                <label for="mvLegendary">Legendary actions</label>
                <textarea id="mvLegendary" class="mv-textarea" placeholder="Tail Swipe :: The monster makes one tail attack.">${esc(state.draft.legendaryActionsText)}</textarea>
              </div>

              <div class="full">
                <label for="mvSource">Source label</label>
                <input id="mvSource" type="text" value="${esc(state.draft.source)}" placeholder="Homebrew">
              </div>
            </div>

            <div class="mv-btn-row">
              <button class="btn btn-secondary btn-xs" id="mvClearDraftBtn">${state.editingId ? "Cancel edit" : "Clear"}</button>
              <button class="btn btn-xs" id="mvSaveDraftBtn">${state.editingId ? "Update homebrew monster" : "Add homebrew monster"}</button>
            </div>
          </div>
          ` : ""}
        </div>
      </div>
    `;

    const search = panel.querySelector("#mvSearch");
    if (search) {
      search.addEventListener("input", () => {
        state.search = search.value || "";
        saveState(state);
        renderMonsterVaultTool();
      });
    }

    const sourceSel = panel.querySelector("#mvSourceFilter");
    if (sourceSel) {
      sourceSel.addEventListener("change", () => {
        state.sourceFilter = sourceSel.value || "all";
        saveState(state);
        renderMonsterVaultTool();
      });
    }

    const crSel = panel.querySelector("#mvCrFilter");
    if (crSel) {
      crSel.addEventListener("change", () => {
        state.crFilter = crSel.value || "all";
        saveState(state);
        renderMonsterVaultTool();
      });
    }

    panel.querySelectorAll("[data-mv-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-mv-tab");
        state.activeTab = tab === "homebrew" ? "homebrew" : "vault";
        saveState(state);
        renderMonsterVaultTool();
      });
    });

    const exportBtn = panel.querySelector("#mvExportBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportHomebrew);

    const importBtn = panel.querySelector("#mvImportBtn");
    const importInput = panel.querySelector("#mvImportInput");
    if (importBtn && importInput) {
      importBtn.addEventListener("click", () => importInput.click());
      importInput.addEventListener("change", () => {
        const file = importInput.files && importInput.files[0];
        if (file) importHomebrewFromFile(file);
        importInput.value = "";
      });
    }

    panel.querySelectorAll("[data-mv-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-mv-toggle");
        if (!id) return;
        if (srdLoadInFlight.has(id)) return;

        const alreadyOpen = state.expandedIds.includes(id);
        if (alreadyOpen) {
          toggleExpanded(id);
          renderMonsterVaultTool();
          return;
        }

        toggleExpanded(id);
        renderMonsterVaultTool();

        const mon = allMonsters().find((m) => m.id === id);
        if (mon && !mon.isHomebrew && !hasDetails(mon)) {
          srdLoadInFlight.add(id);
          renderMonsterVaultTool();
          try {
            await hydrateSrdDetailsById(id);
          } finally {
            srdLoadInFlight.delete(id);
          }
          renderMonsterVaultTool();
        }
      });
    });
    panel.querySelectorAll("[data-mv-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-mv-edit");
        if (!id) return;
        const mon = state.homebrew.find((m) => m.id === id);
        if (!mon) return;
        setDraftFromMonster(mon, "edit");
        saveState(state);
        renderMonsterVaultTool();
      });
    });

    panel.querySelectorAll("[data-mv-clone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-mv-clone");
        if (!id) return;
        const mon = allMonsters().find((m) => m.id === id);
        if (!mon) return;
        setDraftFromMonster(mon, "clone");
        saveState(state);
        renderMonsterVaultTool();
      });
    });

    panel.querySelectorAll("[data-mv-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-mv-delete");
        if (!id) return;
        if (!window.confirm("Delete this homebrew monster from the vault?")) return;
        deleteHomebrew(id);
        renderMonsterVaultTool();
      });
    });

    const saveDraftBtn = panel.querySelector("#mvSaveDraftBtn");
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener("click", () => {
        const g = (id) => panel.querySelector(`#${id}`);

        state.draft.name = String(g("mvName")?.value || "").trim();
        state.draft.sizeType = String(g("mvSizeType")?.value || "").trim() || "Medium Creature, Unaligned";
        state.draft.cr = normalizeCR(g("mvCr")?.value, "1/2");
        state.draft.xp = Math.max(0, intOr(g("mvXp")?.value, normalizeXP(undefined, state.draft.cr)));
        state.draft.type = String(g("mvType")?.value || "Enemy");
        state.draft.ac = clamp(intOr(g("mvAc")?.value, 13), 0, 99);
        state.draft.hp = Math.max(1, intOr(g("mvHp")?.value, 10));
        state.draft.speed = Math.max(0, intOr(g("mvSpeed")?.value, 30));
        state.draft.speedText = String(g("mvSpeedText")?.value || `${state.draft.speed} ft.`).trim() || `${state.draft.speed} ft.`;
        state.draft.initiative = clamp(intOr(g("mvInitiative")?.value, 10), 0, 99);
        state.draft.pb = clamp(intOr(g("mvPb")?.value, 2), 0, 20);
        state.draft.source = String(g("mvSource")?.value || "Homebrew").trim() || "Homebrew";

        state.draft.str = clamp(intOr(g("mvStr")?.value, 10), 1, 30);
        state.draft.dex = clamp(intOr(g("mvDex")?.value, 10), 1, 30);
        state.draft.con = clamp(intOr(g("mvCon")?.value, 10), 1, 30);
        state.draft.int = clamp(intOr(g("mvInt")?.value, 10), 1, 30);
        state.draft.wis = clamp(intOr(g("mvWis")?.value, 10), 1, 30);
        state.draft.cha = clamp(intOr(g("mvCha")?.value, 10), 1, 30);

        state.draft.savingThrows = String(g("mvSaves")?.value || "").trim();
        state.draft.skills = String(g("mvSkills")?.value || "").trim();
        state.draft.damageResistances = String(g("mvResists")?.value || "").trim();
        state.draft.damageImmunities = String(g("mvImmunities")?.value || "").trim();
        state.draft.damageVulnerabilities = String(g("mvVuln")?.value || "").trim();
        state.draft.conditionImmunities = String(g("mvCondImm")?.value || "").trim();
        state.draft.senses = String(g("mvSenses")?.value || "").trim();
        state.draft.languages = String(g("mvLanguages")?.value || "").trim();
        state.draft.challengeNote = String(g("mvChallengeNote")?.value || "").trim();

        state.draft.traitsText = String(g("mvTraits")?.value || "").trim();
        state.draft.actionsText = String(g("mvActions")?.value || "").trim();
        state.draft.bonusActionsText = String(g("mvBonusActions")?.value || "").trim();
        state.draft.reactionsText = String(g("mvReactions")?.value || "").trim();
        state.draft.legendaryActionsText = String(g("mvLegendary")?.value || "").trim();

        if (!state.draft.name) {
          window.alert("Please give the monster a name.");
          return;
        }

        upsertHomebrewFromDraft();
        renderMonsterVaultTool();
      });
    }

    const clearBtn = panel.querySelector("#mvClearDraftBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        clearDraft();
        saveState(state);
        renderMonsterVaultTool();
      });
    }
  }

  function init() {
    if (typeof window.registerTool === "function") {
      window.registerTool({
        id: TOOL_ID,
        name: TOOL_NAME,
        description: "SRD monsters + homebrew vault for encounter prep.",
        render: renderMonsterVaultTool
      });
    }

    publishApi();

    if (typeof window.renderToolsNav === "function") {
      window.renderToolsNav();
    }

    const prevRender = window.renderToolPanel;
    if (typeof prevRender === "function" && !prevRender.__monsterVaultWrapped) {
      const wrappedRender = function (toolId) {
        if (toolId === TOOL_ID) {
          renderMonsterVaultTool();
          return;
        }
        return prevRender(toolId);
      };
      wrappedRender.__monsterVaultWrapped = true;
      window.renderToolPanel = wrappedRender;
    }
  }

  init();
})();
