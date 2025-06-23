export const eventValuesMap = {
  // Those are the values we store by default in our events
  // in the databse. Other values are in customData BSON field
  newSession: [
    {
      id: "field1",
      name: "isNewPlayer",
    },
  ],
  endSession: [
    {
      id: "field1",
      name: "sessionLength",
    },
  ],
  offerEvent: [
    {
      id: "field1",
      name: "offerID",
    },
    {
      id: "field2",
      name: "price",
    },
    {
      id: "field3",
      name: "currency",
    },
    {
      id: "field4",
      name: "discount",
    },
    {
      id: "field5",
      name: "orderId",
    },
  ],
  offerShown: [
    {
      id: "field1",
      name: "offerID",
    },
    {
      id: "field2",
      name: "price",
    },
    {
      id: "field3",
      name: "currency",
    },
    {
      id: "field4",
      name: "discount",
    },
  ],
  economyEvent: [
    {
      id: "field1",
      name: "currencyID",
    },
    {
      id: "field2",
      name: "amount",
    },
    {
      id: "field3",
      name: "type",
    },
    {
      id: "field4",
      name: "origin",
    },
  ],
  adEvent: [
    {
      id: "field1",
      name: "adNetwork",
    },
    {
      id: "field2",
      name: "adType",
    },
    {
      id: "field3",
      name: "timeSpent",
    },
  ],
  reportEvent: [
    {
      id: "field1",
      name: "severity",
    },
    {
      id: "field2",
      name: "reportID",
    },
    {
      id: "field3",
      name: "message",
    },
  ],
};
export const sessionFieldsNames = [
  // These are the fields we have in sessions-{studioID} tables
  "clientID",
  "sessionID",
  "timestamp",
  "engineVersion",
  "gameVersion",
  "platform",
  "language",
  "branch",
  "environment",
  "country",
];