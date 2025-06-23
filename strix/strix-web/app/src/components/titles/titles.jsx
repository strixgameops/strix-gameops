const t_dashboard = ' | Dashboard';
const t_strix = ' | Strix';
const t_userbehavior = ' | User Behavior';

const titles = {

    // Auth pages
    login: 'Log in' + t_strix,
    register: 'Sign up' + t_strix,

    // Profile page
    profile: 'Profile' + t_strix,

    // Overview page
    overview: 'Overview' + t_strix,
    
    // Gamedesign pages
    gameplay: 'Gameplay' + t_strix,
    entity: 'Entities' + t_strix,
    locations: 'Locations' + t_strix,
    gameOverview: 'Game Overview' + t_strix,
    events: 'Events' + t_strix,
    
    // Analytics pages
    analyticsEvents: 'Analytics Events' + t_strix,
    playerWarehouse: 'Player Warehouse' + t_strix,
    segmentation: 'Segmentation' + t_strix,
    abtesting: 'A/B Testing' + t_strix,
    charts: 'Charts' + t_strix,
    playerComposition: 'Player Composition' + t_strix,
    clustering: `Clustering` + t_strix,

    // Dashboards
    d_general: 'Overview' + t_dashboard,
    d_monetization: 'Monetization' + t_dashboard,
    d_retention: 'Retention' + t_dashboard,
    d_realmoney: 'Real money' + t_dashboard,
    d_ingamecurrency: 'In-game currency' + t_dashboard,
    d_saved: `Saved Dashboards`,

    // User behavior pages
    ub_engagement: 'Behavior Tree' + t_strix,
    ub_retention: 'Retention' + t_strix,
    ub_custom: 'Custom Trees' + t_strix,
    
    // Live-Ops pages
    lo_offers: 'Offers' + t_strix,
    lo_gameEvent: 'Game Events' + t_strix,
    lo_localization: 'Localization' + t_strix,
    lo_deployment: 'Deployment' + t_strix,
    lo_flows: 'Flows' + t_strix,
    lo_model: 'Model' + t_strix,
}

export default titles