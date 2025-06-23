import { Alerts } from "../../../models/alertModel.js";
import { Game } from "../../../models/gameModel.js";
import { DeploymentCatalog } from "../../../models/deploymentCatalog.js";
import { Studio } from "../../../models/studioModel.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import nodemailer from "nodemailer";
import axios from "axios";

dayjs.extend(utc);

export class AlertManagerService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.alertingMailService = process.env.MAIL_ENABLED
      ? nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: process.env.MAIL_PORT,
          secure: process.env.MAIL_IS_SECURE,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PWD,
          },
        })
      : null;
    this.strixLogoURL =
      "https://storage.googleapis.com/strix-content/strix-logo-cut.png";
  }

  initialize() {
    if (process.env.SERVER_ROLE === "alertsManager") {
      this.startShortScheduledTasks(10000);
    }
  }

  startShortScheduledTasks(interval) {
    const intervalId = setInterval(async () => {
      try {
        await this.manageAlerts();
      } catch (error) {
        console.error("Error in scheduled tasks:", error);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }

  async manageAlerts() {
    const games = await Alerts.distinct("gameID").lean();
    if (games.length > 0) {
      for (const g of games) {
        const catalogs = await DeploymentCatalog.find({ gameID: g }).lean();
        if (catalogs && catalogs.length > 0) {
          let allAlerts = [];
          for (const catalog of catalogs) {
            for (const environment of catalog.environments) {
              for (const v of environment.deployments) {
                const calculatedAlerts = await this.recalculateAlert(
                  g,
                  v.version,
                  environment.name
                );
                allAlerts = allAlerts.concat(calculatedAlerts);
              }
            }
          }
          allAlerts = Array.from(new Set(allAlerts));
          await Alerts.updateMany(
            { alertID: { $in: allAlerts } },
            { $set: { lastUpdateDate: dayjs.utc().toDate() } }
          );
        }
      }
    }
  }

  async recalculateAlert(gameID, version, environment) {
    const utilityService = this.moduleContainer.get("utility");
    const customDashboardService = this.moduleContainer.get("customDashboard");
    const analytics = this.moduleContainer.get("analytics");

    const gameAlerts = await Alerts.find({
      gameID: gameID,
      branch: utilityService.getBranchWithWorkingSuffix(version),
      $expr: {
        $lte: [
          "$lastUpdateDate",
          {
            $subtract: [
              dayjs.utc().toDate(),
              { $multiply: ["$timeWindow", 60000] },
            ],
          },
        ],
      },
    }).lean();

    let processedAlerts = [];
    for (const alert of gameAlerts) {
      try {
        let chartResponse =
          await customDashboardService.getCustomDashboardChart(
            gameID,
            utilityService.getBranchWithWorkingSuffix(version),
            alert.chartID
          );

        if (!chartResponse.success) {
          console.error(
            "Chart",
            alert.chartID,
            "doesn't exist! If it was deleted, the alert must be deleted too! Deleting alert now..."
          );
          await Alerts.deleteOne({
            gameID,
            branch: utilityService.getBranchWithWorkingSuffix(version),
            alertID: alert.alertID,
            chartID: alert.chartID,
          });
          continue;
        }
        const chartObj = chartResponse.chart;

        let newMetrics = chartObj.metrics;
        const metricsForQuery = newMetrics.map((m) => {
          const properMetric = {
            queryCategoryFilters: m.queryCategoryFilters,
            queryEventTargetValueId: m.queryEventTargetValueId,
            queryAnalyticEventID: m.queryAnalyticEventID,
            queryMethod: m.queryMethod,
            queryValueFilters: m.queryValueFilters,
            queryPercentile: m.queryMethodSecondaryValue,
            dimension: m.dimension,
            categoryField: m.categoryField,
          };
          return properMetric;
        });

        const studioID = await utilityService.getStudioIDByGameID(
          getDemoGameID(gameID)
        );
        const metricsData_past = await Promise.all(
          metricsForQuery.map((metric) =>
            analytics.universalAnalyticsRequest({
              gameID: getDemoGameID(gameID),
              studioID: studioID,
              branch: version,
              environment: environment,
              categoryField: metric.categoryField,
              filterDate: [
                dayjs
                  .utc(alert.lastUpdateDate)
                  .subtract(alert.timeWindow, "minutes")
                  .toISOString(),
                dayjs.utc(alert.lastUpdateDate).toISOString(),
              ],
              filterSegments: [],
              metric: metric,
              viewType: metric.dimension,
              includeBranchInAnalytics: true,
              includeEnvironmentInAnalytics: true,
              specificTimeframe: true,
            })
          )
        );
        const metricsData_current = await Promise.all(
          metricsForQuery.map((metric) =>
            analytics.universalAnalyticsRequest({
              gameID: utilityService.getDemoGameID(gameID),
              studioID: studioID,
              branch: version,
              environment: environment,
              categoryField: metric.categoryField,
              filterDate: [
                dayjs.utc(alert.lastUpdateDate).toISOString(),
                dayjs.utc().toISOString(),
              ],
              filterSegments: [],
              metric: metric,
              viewType: metric.dimension,
              includeBranchInAnalytics: true,
              includeEnvironmentInAnalytics: true,
              specificTimeframe: true,
            })
          )
        );

        let shouldFireAlert = false;
        let previousData = null;
        let newData = null;
        const observedMetricField = alert.observedMetricFieldName;
        const condition = alert.thresholdCondition;
        const thresholdValue = alert.thresholdValue;

        // Alert ruling logic
        for (const datasetIndex in metricsData_current) {
          const currentDataset = metricsData_current[datasetIndex];

          const checkCondition = (currentValue, pastValue = null) => {
            switch (condition) {
              case "shouldBeAbove":
                if (currentValue <= thresholdValue) return true;
                break;
              case "shouldBeBelow":
                if (currentValue >= thresholdValue) return true;
                break;
              case "percentChange":
                if (pastValue === null) return false;
                if (pastValue === 0 && currentValue > 0 && thresholdValue > 0)
                  return true;
                if (pastValue !== 0) {
                  const percentChange =
                    ((currentValue - pastValue) / pastValue) * 100;
                  if (Math.abs(percentChange) >= thresholdValue) return true;
                }
                break;
              default:
                console.warn(`Unknown threshold condition: ${condition}`);
            }
            return false;
          };

          if (observedMetricField === "anyMetric") {
            for (const item of currentDataset) {
              const currentValue = parseFloat(item.y) || 0;
              let pastValue = null;
              if (
                condition === "percentChange" &&
                metricsData_past &&
                metricsData_past[datasetIndex]
              ) {
                const pastDataset = metricsData_past[datasetIndex];
                const pastItem = pastDataset.find(
                  (pastIt) => pastIt.x === item.x
                );
                pastValue = pastItem ? parseFloat(pastItem.y) : 0;
              }
              newData = currentValue;
              previousData = pastValue;

              if (checkCondition(currentValue, pastValue)) {
                shouldFireAlert = true;
                break;
              }
            }
          } else {
            const observedItem = currentDataset.find(
              (item) => item.x === observedMetricField
            );
            const currentValue = observedItem ? parseFloat(observedItem.y) : 0;
            newData = currentValue;
            if (
              condition === "percentChange" &&
              metricsData_past &&
              metricsData_past[datasetIndex]
            ) {
              const pastDataset = metricsData_past[datasetIndex];
              const pastItem = pastDataset.find(
                (item) => item.x === observedMetricField
              );
              const pastValue = pastItem ? parseFloat(pastItem.y) : 0;
              previousData = pastValue;
              if (checkCondition(currentValue, pastValue)) {
                shouldFireAlert = true;
              }
            } else {
              if (checkCondition(currentValue)) {
                shouldFireAlert = true;
              }
            }
          }

          if (shouldFireAlert) break;
        }

        if (shouldFireAlert) {
          console.log(
            `Alert ${alert.alertID} fired for game ${gameID}, branch ${version}, environment ${environment}`
          );
          const metricsData = {
            [observedMetricField]: this.createMetricsObject(
              condition,
              previousData,
              newData
            ),
          };
          await this.sendAlert(
            gameID,
            utilityService.getBranchWithoutSuffix(version),
            environment,
            alert.alertName,
            alert.alertDescription,
            metricsData,
            "threshold"
          );
        }

        processedAlerts.push(alert.alertID);
      } catch (error) {
        console.error(`Error processing alert ${alert.alertID}:`, error);
      }
    }
    return processedAlerts;
  }

  createMetricsObject(condition, previousData, newData) {
    if (condition === "percentChange") {
      return {
        old: previousData || 0,
        new: newData,
      };
    }

    return {
      new: newData,
    };
  }

  async sendAlert(
    gameID,
    branch,
    environment,
    alertName,
    alertDescription,
    metricsData,
    alertType
  ) {
    try {
      const utilityService = this.moduleContainer.get("utilityService");

      const demoGameID = utilityService.getDemoGameID(gameID);
      const studioID = await utilityService.getStudioIDByGameID(demoGameID);
      const studio = await Studio.findOne(
        { studioID },
        { alertSlackWebhook: 1, alertDiscordWebhook: 1, alertEmail: 1 }
      );

      if (!studio) {
        console.error(`No studio found for gameID: ${gameID}`);
        return { success: false, error: "Studio not found" };
      }

      const game = await Game.findOne(
        { gameID: demoGameID },
        { gameName: 1, gameIcon: 1 }
      );

      const formattedDate = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date());

      const alertContent = this.generateAlertContent(
        metricsData,
        alertType,
        game,
        formattedDate,
        alertName,
        alertDescription,
        branch,
        environment
      );

      const results = {
        slack: null,
        discord: null,
        email: null,
      };

      if (studio.alertSlackWebhook) {
        results.slack = await this.sendSlackAlert(
          studio.alertSlackWebhook,
          alertContent,
          game
        );
      }

      if (studio.alertDiscordWebhook) {
        results.discord = await this.sendDiscordAlert(
          studio.alertDiscordWebhook,
          alertContent,
          game,
          alertType
        );
      }

      if (studio.alertEmail) {
        results.email = await this.sendEmailAlert(
          studio.alertEmail,
          alertContent,
          metricsData
        );
      }

      console.log(
        `Analytics alert sent for game: ${gameID}, type: ${alertType}`,
        results
      );
      return { success: true, results };
    } catch (error) {
      console.error(
        `Error sending analytics alert for gameID: ${gameID}`,
        error
      );
      return { success: false, error: error.message };
    }
  }

  generateAlertContent(
    metrics,
    alertType,
    game,
    formattedDate,
    alertName,
    alertDescription,
    branch,
    environment
  ) {
    const gameName = game?.gameName || "Unknown Game";

    let baseTitle;
    switch (alertType) {
      case "daily":
        baseTitle = `📊 Daily Metrics Update - ${gameName}`;
        break;
      case "weekly":
        baseTitle = `📈 Weekly Metrics Roundup - ${gameName}`;
        break;
      case "threshold":
        baseTitle = `⚠️ ${alertName} - ${gameName}`;
        break;
      case "anomaly":
        baseTitle = `🚨 Anomaly Detected - ${gameName}`;
        break;
      default:
        baseTitle = `📊 Metrics Update - ${gameName}`;
    }

    const title = `${baseTitle}`;
    const description =
      alertDescription || `Metrics update for ${formattedDate}`;

    const changedMetrics = Object.entries(metrics).map(([key, value]) => {
      const hasOldValue = "old" in value;
      const oldValue = hasOldValue ? value.old : 0;
      const newValue = value.new;

      const change = newValue - oldValue;
      let percentChange = "N/A";

      if (hasOldValue) {
        percentChange =
          oldValue !== 0
            ? ((change / Math.abs(oldValue)) * 100).toFixed(2)
            : "∞";
      }

      const trend = change > 0 ? "📈" : change < 0 ? "📉" : "➡️";
      const significant = hasOldValue
        ? (Math.abs(change) / (oldValue || 1)) * 100 > 10
        : false;

      return {
        name: this.formatMetricName(key),
        old: hasOldValue ? oldValue : null,
        new: newValue,
        change: hasOldValue ? change : null,
        percentChange,
        trend: hasOldValue ? trend : null,
        significant,
      };
    });

    return {
      title,
      description,
      changedMetrics,
      timestamp: new Date().toISOString(),
      gameInfo: {
        name: gameName,
        icon: game?.gameIcon || null,
      },
      branch,
      environment,
    };
  }

  formatMetricName(metricKey) {
    return metricKey
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  }

  async sendEmailAlert(emailAddress, alertContent, metric) {
    try {
      let metricsTable = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">
          <tr style="background-color: #f8f8f8;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Metric</th>
            ${
              alertContent.changedMetrics[0].old !== null
                ? `<th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Previous</th>`
                : ""
            }
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Current</th>
            ${
              alertContent.changedMetrics[0].change !== null
                ? `<th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Change</th>`
                : ""
            }
          </tr>
      `;

      alertContent.changedMetrics.forEach((metric) => {
        const rowColor = metric.significant
          ? metric.change > 0
            ? "#e6ffe6"
            : "#ffe6e6"
          : "";

        metricsTable += `
          <tr style="background-color: ${rowColor}">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${
              metric.name
            }</td>
            ${
              metric.old !== null
                ? `<td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${metric.old}</td>`
                : ""
            }
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${
              metric.new
            }</td>
            ${
              metric.change !== null
                ? `<td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                ${metric.trend} ${metric.change} (${metric.percentChange}%)
              </td>`
                : ""
            }
          </tr>
        `;
      });
      metricsTable += "</table>";

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4a5568; color: white; padding: 20px; text-align: center;">
            <img src="${
              this.strixLogoURL
            }" alt="Strix Alerts" style="height:40px; margin-bottom: 10px;">
            <h1 style="margin: 0;">${alertContent.title}</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <p>${alertContent.description}</p>
            ${metricsTable}
            <p style="color: #718096; font-size: 12px; margin-top: 30px; text-align: center;">
              Version: ${alertContent.branch} Env: ${
        alertContent.environment
      } | Generated on ${new Date(alertContent.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      `;

      let textBody = `${alertContent.title}\n\n${alertContent.description}\n\n`;
      alertContent.changedMetrics.forEach((metric) => {
        if (metric.old !== null) {
          textBody += `${metric.name}: ${metric.old} → ${metric.new} (${metric.trend} ${metric.change} / ${metric.percentChange}%)\n`;
        } else {
          textBody += `${metric.name}: ${metric.new}\n`;
        }
      });
      textBody += `\nGenerated on ${new Date(
        alertContent.timestamp
      ).toLocaleString()}`;

      if (this.alertingMailService && this.alertingMailService.sendMail) {
        const sendEmailResult = await this.alertingMailService.sendMail({
          from: "team@strixgameops.com",
          to: emailAddress,
          subject: alertContent.title,
          text: textBody,
          html: htmlBody,
        });
        return { success: true, messageId: sendEmailResult.messageId };
      } else {
        console.warn("Skipped email alert because email is not enabled");
        return { success: false, messageId: "" };
      }
    } catch (error) {
      console.error("Error sending email alert:", error);
      return { success: false, error: error.message };
    }
  }

  async sendDiscordAlert(webhookUrl, alertContent, game, alertType) {
    try {
      let description = alertContent.description + "\n\n";

      alertContent.changedMetrics.forEach((metric) => {
        if (metric.change !== null) {
          const emoji = metric.significant
            ? metric.change > 0
              ? "🟢"
              : "🔴"
            : "⚪";
          description += `${emoji} **${metric.name}**: ${metric.old} → ${metric.new} (${metric.trend} ${metric.change} / ${metric.percentChange}%)\n`;
        } else {
          description += `⚪ **${metric.name}**: ${metric.new}\n`;
        }
      });

      const footerText = `Branch: ${alertContent.branch} | Environment: ${alertContent.environment}`;

      const discordPayload = {
        username: "Strix Alerts Bot",
        embeds: [
          {
            title: `Strix Alerts: ${alertContent.title}`,
            description,
            color: this.getColorCode(alertType),
            thumbnail: { url: game.gameIcon },
            timestamp: alertContent.timestamp,
            footer: {
              text: footerText,
              icon_url: this.strixLogoURL,
            },
          },
        ],
      };

      const response = await axios.post(webhookUrl, discordPayload);
      return { success: true, statusCode: response.status };
    } catch (error) {
      console.error("Error sending Discord alert:", error);
      return { success: false, error: error.message };
    }
  }

  async sendSlackAlert(webhookUrl, alertContent, game) {
    try {
      const metricsFields = alertContent.changedMetrics.map((metric) => {
        let metricText;
        if (metric.change !== null) {
          metricText = `Metric name: *${metric.name}*\nValue changed: ${metric.old} → ${metric.new}  •  ${metric.trend} ${metric.change} (${metric.percentChange}%)`;
        } else {
          metricText = `Metric name: *${metric.name}*\nCurrent value: ${metric.new}`;
        }
        return {
          type: "section",
          text: {
            type: "mrkdwn",
            text: metricText,
          },
        };
      });

      const slackPayload = {
        blocks: [
          {
            type: "context",
            elements: [
              {
                type: "image",
                image_url: this.strixLogoURL,
                alt_text: "Strix Alerts",
              },
              {
                type: "mrkdwn",
                text: `*Strix Alerts: Analytics Alert Triggered*`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${alertContent.title}* \n ${alertContent.description}`,
            },
            accessory: {
              type: "image",
              image_url: game.gameIcon,
              alt_text: "Game Icon",
            },
          },
          { type: "divider" },
          ...metricsFields,
          { type: "divider" },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*Branch:* ${alertContent.branch}   •   *Environment:* ${
                  alertContent.environment
                }   •   *Generated on:* ${new Date(
                  alertContent.timestamp
                ).toLocaleString()}`,
              },
            ],
          },
        ],
      };

      const response = await axios.post(webhookUrl, slackPayload);
      return { success: true, statusCode: response.status };
    } catch (error) {
      console.error("Error sending Slack alert:", error);
      return { success: false, error: error.message };
    }
  }

  getColorCode(alertType) {
    switch (alertType) {
      case "threshold":
        return 0xffa500; // Orange
      case "anomaly":
        return 0xff0000; // Red
      case "daily":
        return 0x3498db; // Blue
      case "weekly":
        return 0x2ecc71; // Green
      default:
        return 0x7289da; // Discord default
    }
  }
}
export default AlertManagerService;
