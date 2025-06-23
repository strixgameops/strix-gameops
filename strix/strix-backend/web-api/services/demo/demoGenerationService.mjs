import { Alerts } from "../../../models/alertModel.js";
import { Game } from "../../../models/gameModel.js";
import { DeploymentCatalog } from "../../../models/deploymentCatalog.js";
import { Studio } from "../../../models/studioModel.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import nodemailer from "nodemailer";
import axios from "axios";
import { NodeModel } from "../../../models/nodeModel.js";
import { Segments } from "../../../models/segmentsModel.js";
import { PWplayers } from "../../../models/PWplayers.js";
import { v4 as uuid } from "uuid";
import * as d3 from "d3-random";
import dotenv from "dotenv";

dayjs.extend(utc);
dotenv.config();

export class DemoGenerationService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.Aelements = [
      // Default elements
      "lastReturnDate",
      "totalPaymentsCount",
      "totalPaymentsSumm",
      "meanPaymentRecency",
      "lastPaymentDate",
      "country",
      "language",
      "platform",
      "meanSessionLength",
      "engineVersion",
      "gameVersion",

      // Fav map
      "66dcbc2729ea5587ae46790b",
      // Fav gamemode
      "66dcbc3d29ea5587ae467989",
      // Wins
      "66dcbc4829ea5587ae467a05",
      // Loses
      "66dcbc5429ea5587ae467a84",
    ];
    this.Selements = [
      // Cups
      "663bd07ccd73d3ab9452ee81",
      // Guild
      "663d095299aa302b3e13095e",
      // Total Matches
      "663d155b77b0dc8621b75750",
      // Fav hero
      "663e45e7be9b75936d06bf7d",
      // Winrate
      "663e4631be9b75936d06c04b",
      // Won in a row
      "663e480ea2e5dcd1c6966b31",
      // Lost in a row
      "663e484c7a10254518c2bdc5",
      // Chars unlocked
      "663e49a3fddd8932e8139146",
    ];
  }

  initialize() {
    if (
      process.env.GENERATE_DATA === "true" &&
      process.env.SERVER_ROLE === "demoGeneration"
    ) {
      this.generateSessions(
        "brawlDemo",
        "e76e507f-15f8-0206-e6ac-6d08111e5921",
        "1.0.0.1",
        "production"
      );
    }
    if (
      process.env.REGENERATE_DEMO_PLAYERS === "true" &&
      process.env.SERVER_ROLE === "demoGeneration"
    ) {
      this.populatePlayerWarehouse_brawlDemo(
        "brawlDemo",
        "1.0.0.1",
        parseInt(process.env.REGENERATE_DEMO_PLAYERS_BATCHES_COUNT),
        parseInt(process.env.REGENERATE_DEMO_PLAYERS_BATCH_AMOUNT),
        process.env.REGENERATE_DEMO_PLAYERS_FULL_RESET === "true"
      );
    }
  }

  getRandomCountry() {
    const countries = [
      { name: "United States", proportion: 0.3 },
      { name: "India", proportion: 0.2 },
      { name: "Germany", proportion: 0.15 },
      { name: "United Kingdom", proportion: 0.125 },
      { name: "Portugal", proportion: 0.125 },
      { name: "France", proportion: 0.05 },
      { name: "Spain", proportion: 0.05 },
    ];

    const randomValue = Math.random();

    let cumulative = 0;
    for (const country of countries) {
      cumulative += country.proportion;
      if (randomValue < cumulative) {
        return country.name;
      }
    }
  }

  getRandomLanguage() {
    const languages = [
      { name: "English", proportion: 0.65 },
      { name: "Chinese", proportion: 0.13 },
      { name: "Indian", proportion: 0.12 },
      { name: "German", proportion: 0.07 },
      { name: "Portuguese", proportion: 0.03 },
      { name: "French", proportion: 0.03 },
      { name: "Spanish", proportion: 0.03 },
    ];

    //     0  1
    const randomValue = Math.random();

    //
    let cumulative = 0;
    for (const lang of languages) {
      cumulative += lang.proportion;
      if (randomValue < cumulative) {
        return lang.name;
      }
    }
  }

  getRandomPlatform() {
    const languages = [
      { name: "Android 10", proportion: 0.75 },
      { name: "iOS 14", proportion: 0.25 },
      // { name: "Windows 10", proportion: 0.125 },
      // { name: "MacOS 11", proportion: 0.125 },
      // { name: "Linux", proportion: 0.125 },
    ];

    const randomValue = Math.random();

    let cumulative = 0;
    for (const lang of languages) {
      cumulative += lang.proportion;
      if (randomValue < cumulative) {
        return lang.name;
      }
    }
  }

  getRandomEngineVersion() {
    const engines = [
      "Unity 2021.3.9f1",
      "Unity 2021.3.8f1",
      "Unity 2021.3.7f1",
      "Unity 2021.3.6f1",
      "Unreal Engine 5.1",
      "Unreal Engine 5.0",
      "Unreal Engine 4.27",
    ];
    return engines[Math.floor(Math.random() * engines.length)];
  }

  getRandomGameVersion() {
    const versions = ["1.9.1", "1.9.0", "1.8.0", "1.7.0"];
    return versions[Math.floor(Math.random() * versions.length)];
  }

  getRandomDate(
    start,
    end,
    startHour = 0,
    endHour = 23,
    startMinute = 0,
    endMinute = 59,
    startSecond = 0,
    endSecond = 59
  ) {
    var date = new Date(+start + Math.random() * (end - start));

    var hour = Math.floor(
      startHour + Math.random() * (endHour - startHour + 1)
    );

    var minute = Math.floor(
      startMinute + Math.random() * (endMinute - startMinute + 1)
    );

    var second = Math.floor(
      startSecond + Math.random() * (endSecond - startSecond + 1)
    );

    date.setHours(hour, minute, second);

    return date;
  }
  addMinutesToDate(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  getRandomHeroName() {
    const languages = [
      { name: "hero_shelly", proportion: 0.2 },
      { name: "hero_bull", proportion: 0.1 },
      { name: "hero_frank", proportion: 0.15 },
      { name: "hero_edgar", proportion: 0.25 },
      { name: "hero_poko", proportion: 0.1 },
      { name: "hero_colt", proportion: 0.2 },
    ];

    const randomValue = Math.random();

    let cumulative = 0;
    for (const lang of languages) {
      cumulative += lang.proportion;
      if (randomValue < cumulative) {
        return lang.name;
      }
    }
  }
  getRandomMapName() {
    const languages = [
      { name: "map_sd_skull_creek", proportion: 0.125 },
      { name: "map_sd_rockwall_brawl", proportion: 0.125 },
      { name: "map_dsd_double_trouble", proportion: 0.125 },
      { name: "map_dsd_dark_passage", proportion: 0.125 },
      { name: "map_gg_hard_rock_mine", proportion: 0.125 },
      { name: "map_gg_under_mine", proportion: 0.125 },
      { name: "map_bb_freezing_rippels", proportion: 0.125 },
      { name: "map_bb_cool_shapes", proportion: 0.125 },
    ];

    const randomValue = Math.random();

    let cumulative = 0;
    for (const lang of languages) {
      cumulative += lang.proportion;
      if (randomValue < cumulative) {
        return lang.name;
      }
    }
  }
  getRandomReportMessage() {
    const languages = [
      { name: "Too low FPS", proportion: 0.3 },
      { name: "Too high velocity", proportion: 0.3 },
      { name: "Too much DPS", proportion: 0.3 },
      { name: "Too much money", proportion: 0.1 },
    ];

    const randomValue = Math.random();

    let cumulative = 0;
    for (const lang of languages) {
      cumulative += lang.proportion;
      if (randomValue < cumulative) {
        return lang.name;
      }
    }
  }
  getRandomCrashMessage() {
    const languages = [
      { name: "Error allocating memory", proportion: 0.5 },
      { name: "Null exception", proportion: 0.5 },
    ];

    const randomValue = Math.random();

    let cumulative = 0;
    for (const lang of languages) {
      cumulative += lang.proportion;
      if (randomValue < cumulative) {
        return lang.name;
      }
    }
  }
  async DEMO_INTERNAL_incrementSegmentPlayerCount(
    gameID,
    branch,
    segmentID,
    incrementNumber = 1
  ) {
    // Should only be used for DEMO data generation
    try {
      await Segments.updateOne(
        {
          gameID: gameID,
          "branches.branch": branch,
          "branches.segments.segmentID": segmentID,
        },
        {
          $inc: {
            "branches.$[i].segments.$[j].segmentPlayerCount": incrementNumber,
          },
        },
        {
          arrayFilters: [{ "i.branch": branch }, { "j.segmentID": segmentID }],
        }
      );
    } catch (err) {
      console.error("Error incrementing segment player count:", err);
    }
  }
  randomNumberInRange(min, max, isFloat, toFixed = 3) {
    if (isFloat) {
      return parseFloat(Math.random() * (max - min) + min).toFixed(toFixed);
    } else {
      return Math.round(Math.random() * (max - min)) + min;
    }
  }
  //
  //
  //
  //
  // PLAYERS GENERATION
  //
  //
  //
  //

  async generatePlayer(
    clientID,
    freshJoin,
    gameID,
    branchName,
    incrementSegments = true,
    environment
  ) {
    function getRandomDateInRange(start, end) {
      return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      );
    }

    function getRandomCountry() {
      const countries = [
        { name: "United States", proportion: 0.3 },
        { name: "India", proportion: 0.2 },
        { name: "China", proportion: 0.15 },
        { name: "Germany", proportion: 0.15 },
        { name: "United Kingdom", proportion: 0.125 },
        { name: "Portugal", proportion: 0.025 },
        { name: "France", proportion: 0.025 },
        { name: "Spain", proportion: 0.025 },
      ];

      const randomValue = Math.random();

      let cumulative = 0;
      for (const country of countries) {
        cumulative += country.proportion;
        if (randomValue < cumulative) {
          return country.name;
        }
      }
    }

    function getRandomLanguage() {
      const languages = [
        { name: "English", proportion: 0.65 },
        { name: "Chinese", proportion: 0.13 },
        { name: "Indian", proportion: 0.12 },
        { name: "German", proportion: 0.07 },
        { name: "Portuguese", proportion: 0.03 },
        { name: "French", proportion: 0.03 },
        { name: "Spanish", proportion: 0.03 },
      ];

      const randomValue = Math.random();

      let cumulative = 0;
      for (const lang of languages) {
        cumulative += lang.proportion;
        if (randomValue < cumulative) {
          return lang.name;
        }
      }
    }

    function getRandomPlatform() {
      const platforms = [
        "Android 10",
        "iOS 14",
        "Windows 10",
        "MacOS 11",
        "Linux",
      ];
      return platforms[Math.floor(Math.random() * platforms.length)];
    }

    function getRandomEngineVersion() {
      const engines = [
        "Unity 2021.3.9f1",
        "Unity 2021.3.8f1",
        "Unity 2021.3.7f1",
        "Unity 2021.3.6f1",
        "Unreal Engine 5.1",
        "Unreal Engine 5.0",
        "Unreal Engine 4.27",
      ];
      return engines[Math.floor(Math.random() * engines.length)];
    }

    function getRandomGameVersion() {
      const versions = ["1.9.1", "1.9.0", "1.8.0", "1.7.0"];
      return versions[Math.floor(Math.random() * versions.length)];
    }

    function getRandomFavMap() {
      const favmaps = [
        { name: "skull_creek", proportion: 0.25 },
        { name: "rockwall_brawl", proportion: 0.2 },
        { name: "dark_passage", proportion: 0.15 },
        { name: "freezing_ripples", proportion: 0.1 },
        { name: "double_trouble", proportion: 0.075 },
        { name: "hard_rock_mine", proportion: 0.075 },
        { name: "undermine", proportion: 0.075 },
        { name: "cool_shapes", proportion: 0.075 },
      ];

      const randomValue = Math.random();

      let cumulative = 0;
      for (const map of favmaps) {
        cumulative += map.proportion;
        if (randomValue < cumulative) {
          return map.name;
        }
      }
    }

    function getRandomFavHero() {
      const favhero = [
        { name: "shelly", proportion: 0.35 },
        { name: "edgar", proportion: 0.2 },
        { name: "colt", proportion: 0.15 },
        { name: "poko", proportion: 0.1 },
        { name: "bull", proportion: 0.1 },
        { name: "frank", proportion: 0.1 },
      ];

      const randomValue = Math.random();

      let cumulative = 0;
      for (const hero of favhero) {
        cumulative += hero.proportion;
        if (randomValue < cumulative) {
          return hero.name;
        }
      }
    }

    function getRandomFavGamemode() {
      const favgms = [
        { name: "sd", proportion: 0.35 },
        { name: "gem_grab", proportion: 0.25 },
        { name: "duo_sd", proportion: 0.25 },
        { name: "brawlball", proportion: 0.15 },
      ];

      const randomValue = Math.random();

      let cumulative = 0;
      for (const gm of favgms) {
        cumulative += gm.proportion;
        if (randomValue < cumulative) {
          return gm.name;
        }
      }
    }

    const getRandomPaymentDateOffset = () => {
      if (this.randomNumberInRange(0, 1, true) > 0.3) {
        return 0;
      }
      if (this.randomNumberInRange(0, 1, true) > 0.7) {
        return this.randomNumberInRange(1, 7, false);
      }
      if (this.randomNumberInRange(0, 1, true) > 0.85) {
        return this.randomNumberInRange(8, 30, false);
      }
      return this.randomNumberInRange(1, 30, false);
    }

    let global_lrd;
    let global_tpc;
    let global_mpr;

    let uniformRandom = d3.randomUniform(0, 1);
    let normalRandom = d3.randomNormal(5, 2);

    let global_totalMatches = Math.round(d3.randomNormal(500, 50)());
    let global_winrate = d3.randomNormal(0.5, 0.1)();

    let global_losestreak;
    let global_favhero;
    let global_charsunlocked;
    let global_country;

    let firstJoin = freshJoin
      ? new Date()
      : this.getRandomDate(
          new Date().setDate(new Date().getDate() - 160),
          new Date()
        );

    const id = clientID ? clientID : uuid();
    let player = {
      clientKey: `${gameID}:${branchName}:${id}`,
      gameID: gameID,
      branch: branchName,
      clientID: id,
      elements: {
        statistics: this.Selements.map((element) => {
          let tempVal;
          switch (element) {
            // Cups
            case "663bd07ccd73d3ab9452ee81":
              let tempWins = Math.round(global_totalMatches * global_winrate);
              let tempLoses = Math.round(
                global_totalMatches * (1 - global_winrate)
              );
              tempVal =
                Math.round(tempWins * d3.randomUniform(20, 25)()) +
                Math.round(tempLoses * d3.randomUniform(-5, 8)());
              break;

            // Guild
            case "663d095299aa302b3e13095e":
              tempVal = uniformRandom(0, 1) <= 0.65 ? "true" : "false";
              break;

            // Fav hero
            case "663e45e7be9b75936d06bf7d":
              tempVal = getRandomFavHero();
              global_favhero = tempVal;
              break;

            // Total matches
            case "663d155b77b0dc8621b75750":
              tempVal = global_totalMatches;
              break;

            // Winrate
            case "663e4631be9b75936d06c04b":
              tempVal = parseFloat((global_winrate * 100).toFixed(2));
              break;

            // Won in a row
            case "663e480ea2e5dcd1c6966b31":
              tempVal = Math.abs(Math.round(d3.randomNormal(2, 5)()));
              break;

            // Lost in a row
            case "663e484c7a10254518c2bdc5":
              tempVal = Math.abs(Math.round(d3.randomNormal(3, 1)()));
              global_losestreak = tempVal;
              break;

            // Chars unlocked
            case "663e49a3fddd8932e8139146":
              tempVal = uniformRandom(0, 1) <= 0.39 ? "true" : "false";
              global_charsunlocked = tempVal;
              break;
          }
          return { elementID: element, elementValue: tempVal };
        }),
        analytics: this.Aelements.map((element) => {
          let tempVal;
          let tempValArray = undefined;
          switch (element) {
            case "lastReturnDate":
              tempVal =
                uniformRandom(0, 1) < 0.95
                  ? getRandomDateInRange(
                      new Date(),
                      new Date(Date.now() - 1000 * 60 * 60 * 24 * 25)
                    )
                  : getRandomDateInRange(
                      new Date(),
                      new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
                    );
              global_lrd = new Date(tempVal);
              break;

            case "lastPaymentDate":
              if (global_mpr !== -1) {
                //       meanPaymentRecency
                const daysAgo = Math.min(
                  15,
                  Math.max(3, Math.ceil(global_mpr))
                );
                tempVal = getRandomDateInRange(
                  global_lrd,
                  new Date(Date.now() - 1000 * 60 * 60 * 24 * daysAgo)
                );
              } else {
                tempVal = new Date(0); //   ,
              }
              break;

            case "totalPaymentsCount":
              const randValue = uniformRandom();
              if (randValue < 0.9) {
                tempVal = 0;
              } else if (randValue < 0.95) {
                tempVal = Math.max(1, Math.floor(normalRandom(5, 2))); //   1  10
              } else {
                tempVal = Math.floor(normalRandom(20, 5)); //   10
              }
              global_tpc = tempVal;
              break;

            case "totalPaymentsSumm":
              tempVal = parseFloat(
                (global_tpc * Math.max(1, d3.randomNormal(0.5, 1)())).toFixed(2)
              );
              break;

            case "meanPaymentRecency":
              if (global_tpc !== 0) {
                //    meanPaymentRecency
                const baseRecency = 30; //  ,
                tempVal = baseRecency / global_tpc;
                //   ,
                tempVal *= uniformRandom(0.8, 1.2);
                tempVal = parseFloat(Math.max(0, tempVal).toFixed(1)); // ,     1

                const randomOffset = getRandomPaymentDateOffset();
                if (randomOffset === 0) {
                  tempValArray = [firstJoin];
                } else {
                  const futureDate = new Date(firstJoin);
                  futureDate.setDate(futureDate.getDate() + randomOffset);
                  tempValArray = [futureDate.toISOString()];
                }
              } else {
                tempVal = -1;
              }
              global_mpr = tempVal;
              break;

            case "country":
              tempVal = getRandomCountry();
              global_country = tempVal;
              break;

            case "language":
              tempVal = getRandomLanguage();
              break;

            case "platform":
              tempVal = getRandomPlatform();
              break;

            case "meanSessionLength":
              tempVal = Math.floor(d3.randomNormal(1800, 100)());
              break;

            case "engineVersion":
              tempVal = getRandomEngineVersion();
              break;

            case "gameVersion":
              tempVal = getRandomGameVersion();
              break;

            // Fav map
            case "66dcbc2729ea5587ae46790b":
              tempVal = getRandomFavMap();
              break;

            // Fav gamemode
            case "66dcbc3d29ea5587ae467989":
              tempVal = getRandomFavGamemode();
              break;

            // Wins
            case "66dcbc4829ea5587ae467a05":
              tempVal = Math.round(global_totalMatches * global_winrate);
              break;

            // Loses
            case "66dcbc5429ea5587ae467a84":
              tempVal = Math.round(global_totalMatches * (1 - global_winrate));
              break;
          }
          return {
            elementID: element,
            elementValue: tempVal,
            elementValues: tempValArray,
          };
        }),
      },
      inventory: [],
      offers: [],
      abtests: [],
      segments: [],
      firstJoinDate: firstJoin,
      environment: environment,
    };

    const possibleSegments = [
      // Chars unlocked
      "663e2c06f9318aad701a93d9",

      // FavHero edgar
      "663e611e511c1fb47b4e59f5",

      // FavHero bull
      "663e6132511c1fb47b4e5ae2",

      // Lose streak >3
      "663e6143511c1fb47b4e5b82",

      // Richest countries
      "665241db408e2153a7ffbe08",
    ];
    player.segments.push("everyone");
    possibleSegments.forEach((segment) => {
      switch (segment) {
        case "663e2c06f9318aad701a93d9":
          if (global_charsunlocked === "true") {
            player.segments.push(segment);
          }
          break;
        case "663e611e511c1fb47b4e59f5":
          if (global_favhero === "edgar") {
            player.segments.push(segment);
          }
          break;
        case "663e6132511c1fb47b4e5ae2":
          if (global_favhero === "bull") {
            player.segments.push(segment);
          }
          break;
        case "663e6143511c1fb47b4e5b82":
          if (global_losestreak > 3) {
            player.segments.push(segment);
          }
          break;
        case "665241db408e2153a7ffbe08":
          if (
            global_country === "United States" ||
            global_country === "China" ||
            global_country === "India"
          ) {
            player.segments.push(segment);
          }
          break;
      }
    });

    const utilityService = this.moduleContainer.get("utility");
    player.segments.map(async (segment) => {
      if (incrementSegments) {
        await this.DEMO_INTERNAL_incrementSegmentPlayerCount(
          gameID,
          utilityService.getBranchWithWorkingSuffix(branchName),
          segment,
          1
        );
      }
    });

    const possibleABTests = [
      // Fav hero edgar abtest | 50%
      "r1QXt5sGw",

      // Richest countries | 25%
      "YB9eUtzSf",

      // Richest countries | 25%
      "LC07CMADy",
    ];
    if (
      player.segments.includes("663e611e511c1fb47b4e59f5") &&
      this.randomNumberInRange(0, 1, true) > 0.5
    ) {
      // fav hero edgar abtest

      player.abtests.push({
        testID: "r1QXt5sGw",
        groupType: "test",
      });
      player.segments.push("abtest_r1QXt5sGw");
    }
    if (
      player.segments.includes("665241db408e2153a7ffbe08") &&
      this.randomNumberInRange(0, 1, true) > 0.75
    ) {
      // fav hero edgar abtest
      player.abtests.push({
        testID: "YB9eUtzSf",
        groupType: "test",
      });
      player.segments.push("abtest_YB9eUtzSf");
    }
    if (
      player.segments.includes("665241db408e2153a7ffbe08") &&
      this.randomNumberInRange(0, 1, true) > 0.75
    ) {
      // fav hero edgar abtest
      player.abtests.push({
        testID: "LC07CMADy",
        groupType: "test",
      });
      player.segments.push("abtest_LC07CMADy");
    }

    return player;
  }
  async populatePlayerWarehouse_brawlDemo(
    gameID,
    branchName,
    totalBatches,
    batchSize,
    removeBeforePopulating = false
  ) {
    try {
      let segmentCounts = {};

      console.log(
        "Player generation started with totalBatches:",
        totalBatches,
        "and batchSize:",
        batchSize
      );

      if (removeBeforePopulating) {
        const utilityService = this.moduleContainer.get("utility");

        const res = await PWplayers.deleteMany({
          gameID: utilityService.getDemoGameID(gameID),
          branch: branchName,
        });
        console.log("Deleted players", res);
      }

      console.log(
        "Generating players for PW. Batch size: " +
          batchSize +
          ", total batches: " +
          totalBatches
      );

      // const { playersModel, a_elementsModel, s_elementsModel, offersModel } =
      //   await acquireTable_Players(
      //     await getStudioIDByGameID(getDemoGameID(gameID))
      //   );

      let playersGenerated = [];
      for (let i = 0; i < totalBatches; i++) {
        console.log("Generating batch " + (i + 1) + " of " + totalBatches);
        const playerPromises = Array.from({ length: batchSize }, () =>
          this.generatePlayer(
            undefined,
            false,
            gameID,
            branchName,
            !removeBeforePopulating,
            environment
          )
        );
        const players = await Promise.all(playerPromises);
        playersGenerated = playersGenerated.concat(players);
        players.forEach((p) => {
          p.segments.map((segment) => {
            segmentCounts[segment] = segmentCounts[segment]
              ? segmentCounts[segment] + 1
              : 1;
          });
        });

        console.log("Populated player warehouse, saving");
        try {
          // await playersModel.bulkCreate(players);
          // await a_elementsModel.bulkCreate(
          //   players.flatMap((player) =>
          //     player.elements.analytics.map((analytics) => ({
          //       clientKey: player.clientKey,
          //       elementID: analytics.elementID,
          //       elementValue: analytics.elementValue,
          //       elementValues: analytics.elementValues || [],
          //     }))
          //   )
          // );
          // await s_elementsModel.bulkCreate(
          //   players.flatMap((player) =>
          //     player.elements.statistics.map((statistics) => ({
          //       clientKey: player.clientKey,
          //       elementID: statistics.elementID,
          //       elementValue: statistics.elementValue,
          //     }))
          //   )
          // );
          // await offersModel.bulkCreate(
          //   players.flatMap((player) =>
          //     player.offers.map((o) => ({
          //       clientKey: player.clientKey,
          //       offerID: o.offerID,
          //       purchasedTimes: o.purchasedTimes,
          //       currentAmount: o.currentAmount,
          //       expiration: o.expiration,
          //     }))
          //   )
          // );

          await PWplayers.collection.insertMany(players);
        } catch (error) {
          console.log("Error inserting players:", error);
        }
        console.log("Saved");
      }

      if (removeBeforePopulating) {
        const segments = await Segments.find({
          gameID,
          branch: branchName,
        });
        segments.forEach((segment) => {
          segment.segmentPlayerCount = segmentCounts[segment.segmentID];
        });
        console.log("Populated segments, saving");
        await segments.save();
      }

      console.log("Populated database");

      return playersGenerated;
    } catch (err) {
      console.error(err);
    }
  }
  //
  //
  //
  //
  //
  // ANALYTICS DEMO DATA GENERATION
  //
  //
  //
  //

  async generateSessions(gameID, gameSecret, branchName, environment) {
    //
    // Fetch data from the DB
    //
    const utilityService = this.moduleContainer.get("utility");
    const offerService = this.moduleContainer.get("offer");
    const analyticsEventsService = this.moduleContainer.get("analytics");
    const warehouseService = this.moduleContainer.get("warehouse");

    let offers = await offerService.getOffers(
      gameID,
      utilityService.getBranchWithWorkingSuffix(branchName),
      false,
      false
    );
    const currencyEntities = await NodeModel.find(
      {
        gameID: gameID,
        branch: utilityService.getBranchWithWorkingSuffix(branchName),
        "entityBasic.isCurrency": true,
      },
      {
        "entityBasic.mainConfigs": 0,
        "entityBasic.entityIcon": 0,
        "entityBasic.inheritedConfigs": 0,
      }
    );

    let pricingTemplates = await offerService.getPricing(gameID, branchName);

    async function getGameAnalyticsEvents() {
      return await analyticsEventsService.getAllAnalyticsEvents(
        gameID,
        utilityService.getBranchWithWorkingSuffix(branchName),
        false
      );
    }
    let analyticsEvents = await getGameAnalyticsEvents();
    analyticsEvents = analyticsEvents.events;

    const offersASKUs = await offerService.getAssociatedSKUs(
      gameID,
      utilityService.getBranchWithWorkingSuffix(branchName)
    );

    const leaderboards = await warehouseService.getLeaderboards(
      gameID,
      utilityService.getBranchWithWorkingSuffix(branchName)
    );

    //
    // Event getters
    //
    function makeNewSessionEvent(timestamp, isNewPlayer, customData) {
      return {
        time: timestamp.toISOString(),
        type: "newSession",
        actions: { isNewPlayer: isNewPlayer },
        customData: customData,
      };
    }
    function makeEndSessionEvent(timestamp, sessionLength, customData) {
      return {
        time: timestamp.toISOString(),
        type: "endSession",
        actions: {
          sessionLength: sessionLength,
        },
        customData: customData,
      };
    }
    function makeDesignEvent(timestamp, type, actions, customData) {
      function getRandomValue(type) {
        switch (type) {
          case "string":
            return Math.random().toString(36).substring(7);
          case "number":
            return Math.floor(Math.random() * 1000);
          case "boolean":
            return Math.random() > 0.5;
          case "timestamp":
            return Date.now() - Math.floor(Math.random() * 1000000);
          case "uuid":
            return uuid();
          default:
            return null;
        }
      }

      function generateEvent() {
        const schema = {
          itemID: "uuid",
          userID: "uuid",
          sessionID: "uuid",
          eventType: "string",
          eventCategory: "string",
          eventTimestamp: "timestamp",
          screenName: "string",
          platform: "string",
          appVersion: "string",
          deviceModel: "string",
          osVersion: "string",
          country: "string",
          region: "string",
          city: "string",
          networkType: "string",
          isLoggedIn: "boolean",
          purchaseAmount: "number",
          coinsEarned: "number",
          level: "number",
          isPremiumUser: "boolean",
        };

        const event = {};
        for (const [key, type] of Object.entries(schema)) {
          event[key] = getRandomValue(type);
        }

        return event;
      }
      return {
        time: timestamp.toISOString(),
        type: type,
        customData: { ...actions, ...customData, ...generateEvent() },
      };
    }
    const makeAdEvent = (timestamp, customData) => {
      return {
        time: timestamp.toISOString(),
        type: "adEvent",
        actions: {
          adNetwork: "AdMob",
          adType: "interstitial",
          timeSpent: this.randomNumberInRange(5, 30, false),
        },
        customData: customData,
      };
    }
    function makeEconomyEvent(
      timestamp,
      currencyID,
      amount,
      type,
      origin,
      customData
    ) {
      return {
        time: timestamp.toISOString(),
        type: "economyEvent",
        actions: {
          currencyID: currencyID,
          amount: parseInt(amount),
          type: type,
          origin: origin,
        },
        customData: customData,
      };
    }
    function makeOfferShownEvent(
      timestamp,
      offerID,
      price,
      discount,
      currency,
      customData
    ) {
      return {
        time: timestamp.toISOString(),
        type: "offerShown",
        actions: {
          offerID: offerID,
          price: parseFloat(price.toFixed(2)),
          currency: currency,
          discount: discount,
        },
        customData: customData,
      };
    }
    function makeOfferEvent(
      timestamp,
      offerID,
      price,
      discount,
      currency,
      customData,
      eventHeaders
    ) {
      const orderId =
        offers.find((o) => o.offerID === offerID).offerPrice.targetCurrency ===
        "money"
          ? uuid()
          : undefined;
      if (orderId) {
        sendPaymentDoc(
          offerID,
          eventHeaders,
          parseFloat(price.toFixed(2)),
          timestamp
        );
        return null;
      } else {
        return {
          time: timestamp.toISOString(),
          type: "offerEvent",
          actions: {
            offerID: offerID,
            price: parseFloat(price.toFixed(2)),
            currency: currency,
            orderId: orderId,
            discount: discount || 0,
          },
          customData: customData,
        };
      }
    }
    const sendPaymentDoc = async (offerID, eventHeaders, price, timestamp) => {
      await this.uncatcheableRequest(process.env.GENERATE_PAYMENT_DATA_URL, {
        secret: eventHeaders.secret,
        session: eventHeaders.session,
        device: eventHeaders.device,
        build: eventHeaders.build,
        asku: offersASKUs.find((sku) => sku.offerID === offerID)?.sku,
        receipt: JSON.stringify({ demo: true }),
        discount: Math.round(d3.randomUniform(0, 40)()),
        isDemo: true,
        demoSecretKey: process.env.ENCRYPT_SECRET_KEY,
        demoPrice: price,
        demoTimestamp: dayjs.utc(timestamp).valueOf(),
      });
      // await PaymentTransactions.create({
      //   gameID: getDemoGameID(gameID),
      //   studioID: studioID,
      //   clientID: clientID,
      //   branch: branchName,
      //   offerID: offerID,
      //   asku: offerID,
      //   orderID: orderID,
      //   data: {},
      //   price: parseFloat(price.toFixed(2)),
      // });
    }
    function makeReportEvent(
      timestamp,
      severity,
      reportID,
      message,
      customData
    ) {
      return {
        time: timestamp.toISOString(),
        type: "reportEvent",
        actions: {
          severity: severity,
          reportID: reportID,
          message: message,
        },
        customData: customData,
      };
    }

    const sendSession = async (session) => {
      try {
        await this.uncatcheableRequest(process.env.GENERATE_DATA_URL, session);
      } catch (error) {
        console.error("Error sending session:", error);
      }
    }

    let totalPlayers = parseInt(
      process.env.GENERATE_DATA_PLAYERS_TOTAL.toString()
    );

    console.log("Downloading existing players to generate data...");
    let existingPlayers = await PWplayers.find(
      {
        gameID: "brawlDemo",
        branch: utilityService.getBranchWithoutSuffix(branchName),
        environment: environment,
      },
      { clientID: 1, abtests: 1, _id: 0 }
    )
      .sort({ lastJoinDate: 1 })
      .limit(totalPlayers)
      .lean();

    totalPlayers = existingPlayers.length;

    existingPlayers = existingPlayers.map((p) => ({
      ...p,
      isNewPlayer: false,
    }));

    const addPlayer = async () => {
      const player = await this.generatePlayer(
        uuid(),
        true,
        gameID,
        utilityService.getBranchWithoutSuffix(branchName),
        false,
        environment
      );
      existingPlayers.push({ ...player, isNewPlayer: true });
      totalPlayers++;
      return player;
    }
    const populatePWForNewDemoPlayer = async (player) =>  {
      setTimeout(async () => {
        const exists = await PWplayers.exists({
          clientID: player.clientID,
          branch: player.branch,
          environment: player.environment,
          gameID: player.gameID,
        });
        if (exists) {
          await PWplayers.updateOne(
            {
              clientID: player.clientID,
              branch: player.branch,
              gameID: player.gameID,
              environment: player.environment,
            },
            {
              $set: {
                ...player,
              },
            }
          );
        } else {
          await populatePWForNewDemoPlayer(player);
        }
      }, 300);
    }
    const removePlayers = () => {
      const numToRemove = 100;
      let players = getRandomPlayers(existingPlayers, numToRemove).map(
        (c) => c.clientID
      );
      existingPlayers = existingPlayers.filter(
        (p) => !players.includes(p.clientID)
      );
      totalPlayers = totalPlayers - numToRemove;
    }

    const getRandomPlayers = (array, count) => {
      const shuffled = array.slice(0);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, count);
    }

    const sessionsAmount = 200000;
    const sendInterval = 1000 / parseFloat(process.env.GENERATE_DATA_RATE);

    const constructSession = async (forcePlayer) => {
      const matchesAmount = d3.randomUniform(2, 8)();

      // Setting the first event's timestamp
      let eventTimestamp =
        process.env.GENERATE_DATA_PERIOD === "0"
          ? new Date()
          : this.getRandomDate(
              new Date().setDate(
                new Date().getDate() -
                  parseInt(process.env.GENERATE_DATA_PERIOD)
              ),
              new Date()
            );
      const incTimestamp = (eventTimestamp, timeMin = null, timeMax = null) => {
        if (timeMin === null || timeMax === null) {
          return this.addMinutesToDate(
            eventTimestamp,
            d3.randomUniform(1, 6)()
          );
        } else {
          return this.addMinutesToDate(
            eventTimestamp,
            d3.randomUniform(timeMin, timeMax)()
          );
        }
      }

      function quicklyGetOfferPriceAmount(offer, curr) {
        let amount =
          offer.offerPrice.targetCurrency === "money"
            ? pricingTemplates.find(
                (t) => t.asku === offer.offerPrice.pricingTemplateAsku
              ).baseValue
            : offer.offerPrice.amount;
        let discount = quicklyGetOfferDiscount(offer);

        if (discount && discount > 0) {
          amount = amount - amount * (discount / 100);
        }
        return amount;
      }
      function quicklyGetOfferCurrency(offer, playerCurrency) {
        if (offer.offerPrice.targetCurrency === "money") {
          return playerCurrency;
        } else {
          return currencyEntities.find(
            (n) => n.nodeID === offer.offerPrice.nodeID
          ).entityBasic.entityID;
        }
      }
      function quicklyGetOfferDiscount(offer) {
        return (
          offer.offerPrice.discount || Math.round(d3.randomUniform(20, 40)())
        );
      }

      let player = forcePlayer ? forcePlayer : undefined;
      function pickRandomPlayer() {
        let rand;
        // 70% chance to pick from the last 30% of players (newer ones)
        if (existingPlayers.length > 0 && Math.random() < 0.7) {
          const start = Math.floor(existingPlayers.length * 0.7);
          const end = existingPlayers.length - 1;
          rand = Math.floor(Math.random() * (end - start + 1)) + start;
        } else {
          rand = Math.floor(Math.random() * existingPlayers.length);
        }
        player = existingPlayers[rand];
        // Ensure valid player, fallback if needed
        if (!player?.clientID) {
          pickRandomPlayer();
        }
      }
      if (!player) {
        pickRandomPlayer();
      }

      let eventHeaders = {
        device: player.clientID,
        secret: gameSecret,
        session: uuid(),
        language: this.getRandomLanguage(),
        country: this.getRandomCountry(),
        platform: this.getRandomPlatform(),
        gameVersion: this.getRandomGameVersion(),
        engineVersion: this.getRandomEngineVersion(),
        build: branchName,
        time: dayjs.utc().subtract(d3.randomUniform(-3.1, 3.1)(), "minute"),
        payload: [],
      };

      let customData = {};

      await this.uncatcheableRequest(process.env.GENERATE_SDK_INIT_URL, {
        secret: eventHeaders.secret,
        device: eventHeaders.device,
        session: eventHeaders.session,
        build: eventHeaders.build,
      });

      const tableNames = [
        "events",
        "offers",
        "entities",
        "abtests",
        "localization",
        "stattemplates",
        "positionedOffers",
        "flows",
      ];
      // Simulate checksum checkup
      await this.uncatcheableRequest(
        process.env.GENERATE_SDK_CHECKSUM_CHECKUP_URL,
        {
          secret: eventHeaders.secret,
          device: eventHeaders.device,
          environment: "production",
          tableNames: tableNames,
        }
      );
      // Simulate config update fetch
      await Promise.all(
        tableNames.map(async (name) => {
          return await this.uncatcheableRequest(
            process.env.GENERATE_SDK_GET_CONFIG_URL,
            {
              secret: eventHeaders.secret,
              device: eventHeaders.device,
              environment: "production",
              tableName: name,
              itemHashes: {},
            }
          );
        })
      );

      // console.log("trying to get currency for region", eventHeaders.country);
      let playerCurrency = "USD";
      // console.log("Got currency:", playerCurrency);

      let eventsPayload = [];
      // Make newSession event at the start of the payload
      eventsPayload.push(
        makeNewSessionEvent(eventTimestamp, player.isNewPlayer)
      );
      eventTimestamp = incTimestamp(eventTimestamp);

      for (let i = 0; i < matchesAmount; i++) {
        customData = {
          ...customData,
          map: this.getRandomMapName(),
          hero: this.getRandomHeroName(),
        };

        let randomizedEvent_Start = {
          type: "match_started",
          actions: {
            map: customData.map,
            gamemode: null,
            hero: customData.hero,
          },
        };
        randomizedEvent_Start.actions.gamemode =
          randomizedEvent_Start.actions.map.split("_")[1];

        this.uncatcheableRequest(
          process.env.GENERATE_SDK_LIVEOPS_URL + "/getInventoryItems",
          {
            device: eventHeaders.device,
            secret: eventHeaders.secret,
            build: eventHeaders.build,
          }
        );

        if (d3.randomUniform(1, 10)() < 1.5) {
          this.uncatcheableRequest(
            process.env.GENERATE_SDK_LIVEOPS_URL + "/getLeaderboard",
            {
              device: eventHeaders.device,
              secret: eventHeaders.secret,
              build: eventHeaders.build,
              leaderboardID:
                leaderboards[Math.floor(Math.random() * leaderboards.length)]
                  .codename,
            }
          );
        }

        this.uncatcheableRequest(
          process.env.GENERATE_SDK_LIVEOPS_URL + "/getElementValue",
          {
            device: eventHeaders.device,
            secret: eventHeaders.secret,
            build: eventHeaders.build,
            elementID: this.Selements[Math.floor(Math.random() * this.Selements.length)],
          }
        );

        const matchStart = makeDesignEvent(
          eventTimestamp,
          randomizedEvent_Start.type,
          randomizedEvent_Start.actions,
          customData
        );
        eventTimestamp = incTimestamp(eventTimestamp);
        eventsPayload.push(matchStart);

        let randomizedEvent_End = {};
        if (d3.randomUniform(1, 10)() > 3) {
          randomizedEvent_End = {
            type: "match_ended_win",
            actions: {
              hero: randomizedEvent_Start.actions.hero,
              gamemode: randomizedEvent_Start.actions.gamemode,
              map: randomizedEvent_Start.actions.map,
            },
            customData,
          };
          this.uncatcheableRequest(
            process.env.GENERATE_SDK_LIVEOPS_URL +
              "/addValueToStatisticElement",
            {
              device: eventHeaders.device,
              secret: eventHeaders.secret,
              build: eventHeaders.build,
              elementID: "663bd07ccd73d3ab9452ee81",
              value: Math.round(d3.randomUniform(7, 14)()),
            }
          );
        } else {
          randomizedEvent_End = {
            type: "match_ended_lose",
            actions: {
              hero: randomizedEvent_Start.actions.hero,
              gamemode: randomizedEvent_Start.actions.gamemode,
              map: randomizedEvent_Start.actions.map,
            },
            customData,
          };
          this.uncatcheableRequest(
            process.env.GENERATE_SDK_LIVEOPS_URL +
              "/subtractValueFromStatisticElement",
            {
              device: eventHeaders.device,
              secret: eventHeaders.secret,
              build: eventHeaders.build,
              elementID: "663bd07ccd73d3ab9452ee81",
              value: Math.round(d3.randomUniform(4, 10)()),
            }
          );
        }
        this.uncatcheableRequest(
          process.env.GENERATE_SDK_LIVEOPS_URL + "/addValueToStatisticElement",
          {
            device: eventHeaders.device,
            secret: eventHeaders.secret,
            build: eventHeaders.build,
            elementID: "663d155b77b0dc8621b75750",
            value: 1,
          }
        );
        customData = {};

        // Little possibility of report event
        if (Math.random() > 0.95) {
          const reportEvent = makeReportEvent(
            eventTimestamp,
            "debug",
            "someReportID",
            this.getRandomReportMessage(),
            customData
          );
          eventTimestamp = incTimestamp(eventTimestamp, 0.5, 2);
          eventsPayload.push(reportEvent);
        }

        const matchEnded = makeDesignEvent(
          eventTimestamp,
          randomizedEvent_End.type,
          randomizedEvent_End.actions,
          customData
        );
        eventTimestamp = incTimestamp(eventTimestamp, 0.1, 0.15);
        eventsPayload.push(matchEnded);

        //
        // After every match there is an economy event
        //
        let postMatchEvent = {};
        if (randomizedEvent_End.type === "match_ended_lose") {
          var randcurr = d3.randomUniform(10, 40)();
          customData = {
            ...customData,
            availablePowerPoints: Math.round(
              d3.randomUniform(100, 200)() + randcurr
            ),
          };
          postMatchEvent = makeEconomyEvent(
            eventTimestamp,
            "currency_power_point",
            randcurr,
            "source",
            "match_end",
            customData
          );

          this.uncatcheableRequest(
            process.env.GENERATE_SDK_LIVEOPS_URL + "/addInventoryItem",
            {
              device: eventHeaders.device,
              secret: eventHeaders.secret,
              build: eventHeaders.build,
              nodeID: currencyEntities.find(
                (n) => n.entityBasic.entityID === "currency_power_point"
              ).nodeID,
              amount: randcurr,
            }
          );
        } else {
          var randcurr = d3.randomUniform(40, 120)();
          customData = {
            ...customData,
            availablePowerPoints: Math.round(
              d3.randomUniform(100, 200)() + randcurr
            ),
          };
          postMatchEvent = makeEconomyEvent(
            eventTimestamp,
            "currency_power_point",
            randcurr,
            "source",
            "match_end",
            customData
          );
          this.uncatcheableRequest(
            process.env.GENERATE_SDK_LIVEOPS_URL + "/addInventoryItem",
            {
              device: eventHeaders.device,
              secret: eventHeaders.secret,
              build: eventHeaders.build,
              nodeID: currencyEntities.find(
                (n) => n.entityBasic.entityID === "currency_power_point"
              ).nodeID,
              amount: randcurr,
            }
          );
        }
        eventTimestamp = incTimestamp(eventTimestamp, 0.2, 0.3);
        eventsPayload.push(postMatchEvent);

        //
        // After every match there is a possibility that player will be shown an offer
        //
        if (d3.randomUniform(1, 10)() > 2) {
          const randOffer = offers[Math.floor(Math.random() * offers.length)];
          const randPrice = quicklyGetOfferPriceAmount(
            randOffer,
            playerCurrency
          );
          const randOfferCurrency = quicklyGetOfferCurrency(
            randOffer,
            playerCurrency
          );
          const randOfferDiscount = quicklyGetOfferDiscount(randOffer);
          const offerShow = makeOfferShownEvent(
            eventTimestamp,
            randOffer.offerID,
            randPrice,
            randOfferDiscount,
            randOfferCurrency,
            customData
          );
          eventTimestamp = incTimestamp(eventTimestamp, 0.1, 0.4);
          eventsPayload.push(offerShow);

          // People from test group are slighlty better at converting
          var someRandomThreshold =
            randOffer.offerCodeName === "edgar" &&
            player.abtests.some(
              (t) => t.testID === "r1QXt5sGw" && t.groupType === "test"
            )
              ? 56
              : 96;
          // Even more little possibility that player will buy it
          if (d3.randomUniform(1, 100)() > someRandomThreshold) {
            // console.log("------MAKING OFFER-------");

            const offerBuy = makeOfferEvent(
              eventTimestamp,
              randOffer.offerID,
              randPrice,
              randOfferDiscount,
              randOfferCurrency,
              customData,
              eventHeaders
            );
            // console.log("OFFER ID:", randOffer.offerCodeName)

            if (randOffer.offerCodeName === "gold1000") {
              postMatchEvent = makeEconomyEvent(
                eventTimestamp,
                "currency_soft_gold",
                1000,
                "source",
                "offer_gold1000",
                customData
              );
              this.uncatcheableRequest(
                process.env.GENERATE_SDK_LIVEOPS_URL + "/addInventoryItem",
                {
                  device: eventHeaders.device,
                  secret: eventHeaders.secret,
                  build: eventHeaders.build,
                  nodeID: currencyEntities.find(
                    (n) => n.entityBasic.entityID === "currency_soft_gold"
                  ).nodeID,
                  amount: 1000,
                }
              );
              let currencySink = makeEconomyEvent(
                eventTimestamp,
                "currency_soft_gold",
                offers.find((o) => o.offerCodeName === "brawlBoxOffer")
                  .offerPrice.amount,
                "sink",
                "brawlBoxOffer",
                customData
              );
              this.uncatcheableRequest(
                process.env.GENERATE_SDK_LIVEOPS_URL + "/removeInventoryItem",
                {
                  device: eventHeaders.device,
                  secret: eventHeaders.secret,
                  build: eventHeaders.build,
                  nodeID: currencyEntities.find(
                    (n) => n.entityBasic.entityID === "currency_soft_gold"
                  ).nodeID,
                  amount: offers.find(
                    (o) => o.offerCodeName === "brawlBoxOffer"
                  ).offerPrice.amount,
                }
              );

              eventsPayload.push(postMatchEvent);
              eventsPayload.push(currencySink);
              let postMatchCurrencySinkOffer = makeOfferEvent(
                eventTimestamp,
                offers.find((o) => o.offerCodeName === "brawlBoxOffer").offerID,
                offers.find((o) => o.offerCodeName === "brawlBoxOffer")
                  .offerPrice.amount,
                quicklyGetOfferDiscount(
                  offers.find((o) => o.offerCodeName === "brawlBoxOffer")
                ),
                "currency_hard_gems",
                customData,
                eventHeaders
              );
              // console.log("BUYING IN CHAIN OFFER ID:", "brawlBoxOffer")
              if (postMatchCurrencySinkOffer) {
                eventsPayload.push(postMatchCurrencySinkOffer);
              }
            } else if (randOffer.offerCodeName === "gems950") {
              postMatchEvent = makeEconomyEvent(
                eventTimestamp,
                "currency_hard_gems",
                950,
                "source",
                "offer_gems950",
                customData
              );
              this.uncatcheableRequest(
                process.env.GENERATE_SDK_LIVEOPS_URL + "/addInventoryItem",
                {
                  device: eventHeaders.device,
                  secret: eventHeaders.secret,
                  build: eventHeaders.build,
                  nodeID: currencyEntities.find(
                    (n) => n.entityBasic.entityID === "currency_hard_gems"
                  ).nodeID,
                  amount: 950,
                }
              );
              let currencySink = makeEconomyEvent(
                eventTimestamp,
                "currency_hard_gems",
                offers.find((o) => o.offerCodeName === "edgar").offerPrice
                  .amount,
                "sink",
                "edgar",
                customData
              );
              this.uncatcheableRequest(
                process.env.GENERATE_SDK_LIVEOPS_URL + "/removeInventoryItem",
                {
                  device: eventHeaders.device,
                  secret: eventHeaders.secret,
                  build: eventHeaders.build,
                  nodeID: currencyEntities.find(
                    (n) => n.entityBasic.entityID === "currency_hard_gems"
                  ).nodeID,
                  amount: offers.find((o) => o.offerCodeName === "edgar")
                    .offerPrice.amount,
                }
              );
              eventsPayload.push(postMatchEvent);
              eventsPayload.push(currencySink);
              let postMatchCurrencySinkOffer = makeOfferEvent(
                eventTimestamp,
                offers.find((o) => o.offerCodeName === "edgar").offerID,
                offers.find((o) => o.offerCodeName === "edgar").offerPrice
                  .amount,
                quicklyGetOfferDiscount(
                  offers.find((o) => o.offerCodeName === "edgar")
                ),
                "currency_hard_gems",
                customData,
                eventHeaders
              );
              if (postMatchCurrencySinkOffer) {
                eventsPayload.push(postMatchCurrencySinkOffer);
              }
              // console.log("BUYING IN CHAIN OFFER ID:", "edgar")
            } else if (randOffer.offerCodeName === "gems360") {
              postMatchEvent = makeEconomyEvent(
                eventTimestamp,
                "currency_hard_gems",
                360,
                "source",
                "offer_gems360",
                customData
              );
              this.uncatcheableRequest(
                process.env.GENERATE_SDK_LIVEOPS_URL + "/addInventoryItem",
                {
                  device: eventHeaders.device,
                  secret: eventHeaders.secret,
                  build: eventHeaders.build,
                  nodeID: currencyEntities.find(
                    (n) => n.entityBasic.entityID === "currency_hard_gems"
                  ).nodeID,
                  amount: 360,
                }
              );
              let currencySink = makeEconomyEvent(
                eventTimestamp,
                "currency_hard_gems",
                offers.find((o) => o.offerCodeName === "bigBoxOffer").offerPrice
                  .amount,
                "sink",
                "bigBoxOffer",
                customData
              );
              this.uncatcheableRequest(
                process.env.GENERATE_SDK_LIVEOPS_URL + "/removeInventoryItem",
                {
                  device: eventHeaders.device,
                  secret: eventHeaders.secret,
                  build: eventHeaders.build,
                  nodeID: currencyEntities.find(
                    (n) => n.entityBasic.entityID === "currency_hard_gems"
                  ).nodeID,
                  amount: offers.find((o) => o.offerCodeName === "bigBoxOffer")
                    .offerPrice.amount,
                }
              );
              eventsPayload.push(postMatchEvent);
              eventsPayload.push(currencySink);
              let postMatchCurrencySinkOffer = makeOfferEvent(
                eventTimestamp,
                offers.find((o) => o.offerCodeName === "bigBoxOffer").offerID,
                offers.find((o) => o.offerCodeName === "bigBoxOffer").offerPrice
                  .amount,
                quicklyGetOfferDiscount(
                  offers.find((o) => o.offerCodeName === "bigBoxOffer")
                ),
                "currency_hard_gems",
                customData,
                eventHeaders
              );
              if (postMatchCurrencySinkOffer) {
                eventsPayload.push(postMatchCurrencySinkOffer);
              }
              // console.log("BUYING IN CHAIN OFFER ID:", "bigBoxOffer")
            } else if (randOffer.offerCodeName === "gems90") {
              postMatchEvent = makeEconomyEvent(
                eventTimestamp,
                "currency_hard_gems",
                90,
                "source",
                "offer_gems90",
                customData
              );
              this.uncatcheableRequest(
                process.env.GENERATE_SDK_LIVEOPS_URL + "/addInventoryItem",
                {
                  device: eventHeaders.device,
                  secret: eventHeaders.secret,
                  build: eventHeaders.build,
                  nodeID: currencyEntities.find(
                    (n) => n.entityBasic.entityID === "currency_hard_gems"
                  ).nodeID,
                  amount: 90,
                }
              );
              let currencySink = makeEconomyEvent(
                eventTimestamp,
                "currency_hard_gems",
                offers.find((o) => o.offerCodeName === "megaBoxOffer")
                  .offerPrice.amount,
                "sink",
                "megaBoxOffer",
                customData
              );
              this.uncatcheableRequest(
                process.env.GENERATE_SDK_LIVEOPS_URL + "/removeInventoryItem",
                {
                  device: eventHeaders.device,
                  secret: eventHeaders.secret,
                  build: eventHeaders.build,
                  nodeID: currencyEntities.find(
                    (n) => n.entityBasic.entityID === "currency_hard_gems"
                  ).nodeID,
                  amount: offers.find((o) => o.offerCodeName === "megaBoxOffer")
                    .offerPrice.amount,
                }
              );
              eventsPayload.push(postMatchEvent);
              eventsPayload.push(currencySink);
              let postMatchCurrencySinkOffer = makeOfferEvent(
                eventTimestamp,
                offers.find((o) => o.offerCodeName === "megaBoxOffer").offerID,
                offers.find((o) => o.offerCodeName === "megaBoxOffer")
                  .offerPrice.amount,
                quicklyGetOfferDiscount(
                  offers.find((o) => o.offerCodeName === "megaBoxOffer")
                ),
                "currency_hard_gems",
                customData,
                eventHeaders
              );
              if (postMatchCurrencySinkOffer) {
                eventsPayload.push(postMatchCurrencySinkOffer);
              }
              // console.log("BUYING IN CHAIN OFFER ID:", "megaBoxOffer")
            }

            eventTimestamp = incTimestamp(eventTimestamp, 0.1, 0.4);

            if (offerBuy) {
              eventsPayload.push(offerBuy);
            }
          }
        } else {
          // Or be shown an advertisement
          const adEvent = makeAdEvent(eventTimestamp, customData);
          eventTimestamp = incTimestamp(eventTimestamp, 0.4, 0.5);
          eventsPayload.push(adEvent);
        }
        if (d3.randomUniform(1, 10)() > 2) {
          var rndCharacterUpgradeSinkAmount = d3.randomUniform(40, 120)();
          let postMatchSink = makeEconomyEvent(
            eventTimestamp,
            "currency_power_point",
            rndCharacterUpgradeSinkAmount,
            "sink",
            `${this.getRandomHeroName()}_upgrade`,
            customData
          );
          this.uncatcheableRequest(
            process.env.GENERATE_SDK_LIVEOPS_URL + "/removeInventoryItem",
            {
              device: eventHeaders.device,
              secret: eventHeaders.secret,
              build: eventHeaders.build,
              nodeID: currencyEntities.find(
                (n) => n.entityBasic.entityID === "currency_power_point"
              ).nodeID,
              amount: rndCharacterUpgradeSinkAmount,
            }
          );

          eventTimestamp = incTimestamp(eventTimestamp, 0.4, 1);
          eventsPayload.push(postMatchSink);
        }
      }
      customData = {
        matchesPlayed: matchesAmount,
      };

      if (Math.random() > 0.95) {
        const crashEvent = makeReportEvent(
          eventTimestamp,
          "fatal",
          "someCrashID",
          this.getRandomCrashMessage(),
          customData
        );
        eventsPayload.push(crashEvent);
      } else {
        // Make endSession event at the end of the payload
        let sessionLength =
          (eventTimestamp.getTime() -
            new Date(eventsPayload[0].time).getTime()) /
          1000;
        const endSession = makeEndSessionEvent(
          eventTimestamp,
          Math.floor(sessionLength),
          customData
        );
        eventsPayload.push(endSession);
      }

      await populatePWForNewDemoPlayer(player);

      eventHeaders.payload = eventsPayload;
      return eventHeaders;
    }

    try {
      for (let i = 0; i < sessionsAmount; i++) {
        let session;
        if (i % 1000 === 0 && i !== 0) {
          removePlayers();
        }
        if (i % 8 === 0 && i !== 0) {
          // Every N cycles we introduce new player
          const player = await addPlayer();

          session = await constructSession(player);
          sendSession(session);
        } else {
          // Regular session construction
          session = await constructSession();
          sendSession(session);
        }
        console.log(
          "Making session #" + i,
          "| Events:",
          session.payload.length,
          "| Players:",
          totalPlayers
        );

        if (i < sessionsAmount - 1) {
          await new Promise((resolve) => setTimeout(resolve, sendInterval));
        } else {
          console.log("Data generation completed");
        }
      }
    } catch (err) {
      console.error("Session generator:", err);
    }

    
  }
  async uncatcheableRequest(dest, body) {
    try {
      await axios.post(dest, body);
    } catch (error) {
      // Do not catch this
    }
  }
}
