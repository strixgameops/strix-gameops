// Declaring the events here. Declare what IDs are reserved, their styling, etc.
export const sessionStartEvent = {
    id: 'newSession',
    name: 'Session start',
    borderColor: '#3F44B4',
    badgeText: 'Auto',
    badgeWidth: 120,
}
export const sessionEndEvent = {
    id: 'endSession',
    name: 'Session end',
    borderColor: '#3F44B4',
    badgeText: 'Auto',
    badgeWidth: 120,
}
export const offerEvent =
{
    id: 'offerEvent',
    name: 'Purchase made',
    borderColor: '#B4853F',
    badgeText: 'IAP',
    badgeWidth: 70,

    filters: [
        {
            name: 'Offer ID',
            type: 'string',
            targetField: 'offerID',
        },
        {
            name: 'Price',
            type: 'numeric',
            targetField: 'price',
        },
    ]
}
export const offerShownEvent =
{
    id: 'offerShown',
    name: 'Offer shown',
    borderColor: '#B4853F',
    badgeText: 'IAP',
    badgeWidth: 70,

    filters: [
        {
            name: 'Offer ID',
            type: 'string',
            targetField: 'offerID',
        },
        {
            name: 'Price',
            type: 'numeric',
            targetField: 'price',
        },
    ]
}
export const economyEvent =
{
    id: 'economyEvent',
    name: 'Economy',
    borderColor: '#3FA6B4',
    badgeText: 'Economy',
    badgeWidth: 100,
    
    filters: [
        {
            name: 'Entity ID',
            type: 'string',
            targetField: 'currencyID',
        },
        {
            name: 'Amount',
            type: 'numeric',
            targetField: 'amount',
        },
        {
            name: 'Type',
            type: 'string',
            targetField: 'type',
        },
        {
            name: 'Origin',
            type: 'string',
            targetField: 'origin',
        },
    ]
}
export const adEvent =
{
    id: 'adEvent',
    name: 'Ad shown',
    borderColor: '#B1B43F',
    badgeText: 'Ad',
    badgeWidth: 60,

    filters: [
        {
            name: 'Time spent',
            type: 'numeric',
            targetField: 'timeSpent',
        },
        {
            name: 'Ad type',
            type: 'string',
            targetField: 'adType',
        },
    ]
}
export const reportEvent =
{
    id: 'reportEvent',
    name: 'Message sent',
    borderColor: '#B43F46',
    badgeText: 'Report',
    badgeWidth: 90,

    filters: [
        {
            name: 'Time spent',
            type: 'numeric',
            targetField: 'timeSpent',
        },
        {
            name: 'Ad type',
            type: 'string',
            targetField: 'adType',
        },
    ]
}
export const designEvent =
{
    id: 'designEvent',
    borderColor: '#41B43F',
    badgeText: 'Design',
    badgeWidth: 90,
}
export const crashEvent =
{
    id: 'endSessionCrash',
    name: 'Session crash',
    borderColor: '#F50000',
    badgeText: 'Crash',
    badgeWidth: 80,

    filters: [
        {
            name: 'Crash ID',
            type: 'string',
            targetField: 'message',
        },
    ]
}
export const uiEvent =
{
    borderColor: '#8E3FB4',
    badgeText: 'UI',
    badgeWidth: 60,
}

const reservedEvents =
[
    // There are all events that can't be created manually by the user
    sessionStartEvent, 
    sessionEndEvent, 
    offerEvent,
    offerShownEvent, 
    economyEvent, 
    adEvent, 
    reportEvent,
    crashEvent,
    uiEvent,

    // If the event doesn't fall under any category, we put it into designEvent
    designEvent,
]
export default reservedEvents