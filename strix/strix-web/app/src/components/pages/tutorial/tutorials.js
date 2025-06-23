const tutorials = [
  {
    title: "Overview",
    page: "/overview",
    steps: [
      {
        title: "Add Game",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/overview/add_game_1.png",
        description: "Add new game by pressing a plus icon.",
      },
      {
        title: "Basic Info",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/overview/add_game_2.png",
        description:
          "Enter basic information about the game. You can access and change it later.",
      },
      {
        title: "Select Branch",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/overview/change_branch.png",
        description:
          "You can select your game's environment branch from the menu on the left by clicking on branch name. Be mindful of the branch you work in at any given time.",
      },
      {
        title: "Select Game",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/overview/select_game_to_start.png",
        description:
          "Press on a game to select it and be able to navigate through Strix.",
      },
    ],
  },
  {
    title: "A/B Testing",
    page: "/abtesting",
    steps: [
      {
        title: "Start Changing",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/abtests/press_to_start_editing.png",
        description: "Press on icon to start making changes for the test.",
      },
      {
        title: "Entities & Offers",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/abtests/make_changes_1.png",
        description:
          "You can change entities' Remote Config for testing. When testing offers, price, icon and content can be changed.",
      },
      {
        title: "Observe Metrics",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/abtests/observe_metrics_cut.png",
        description:
          "You can select metrics to observe for the given test. Since A/B groups have their own segments, you can also analyze each segment from your test in other dashboards and charts.",
      },
    ],
  },
  {
    title: "Analytics Events",
    page: "/allevents",
    steps: [
      {
        title: "View Events",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/analyticsevents/view_events.png",
        description:
          "Here you can view all events you ever sent from your game. All values are also automatically mapped here.",
      },
      {
        title: "Change/Remove Unused Values",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/abtests/make_changes_1.png",
        description:
          "You can change event's values, if needed. Some values from default events cannot be removed, because they are used for built-in analytics.",
      },
    ],
  },
  {
    title: "Behavior Tree",
    page: "/behaviorTree",
    steps: [
      {
        title: "Build Funnel",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/beh_tree/build_funnel.png",
        description:
          "Start building your funnel to map player path in your game.",
      },
      {
        title: "Use Event Filters",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/beh_tree/use_event_filters.png",
        description:
          "You can make value filters for individual events for granular control of what path you want to observe.",
      },
      {
        title: "Panel",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/beh_tree/use_panel.png",
        description:
          "You can use panel positioned on the bottom of your workspace. Panel provides tools to view, filter, and compare data more efficiently.",
      },
      {
        title: "Correlation Table",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/beh_tree/use_correlation_table.png",
        description:
          "After a funnel was built, you can use correlation table to compare different events and see which events are more/less likely to happen in your funnel.",
      },
      {
        title: "Quick Expand",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/beh_tree/quickly_expand_tree.png",
        description:
          "Press Shift + Left Mouse Button to quickly expand a lot of tree events. Only the most 'populated' events are expanded. This way you can quickly expand top path of the tree.",
      },
      {
        title: "TTA",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/beh_tree/click_on_time_for_distrib.png",
        description:
          "You can view time-to-arrive distribution if you click on the time behind the event.",
      },
      {
        title: "Event Details",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/beh_tree/click_on_event_to_view_details.png",
        description:
          "You can view event's values distribution if you click on it.",
      },
    ],
  },
  {
    title: "Profile Composition",
    page: "/profileComposition",
    steps: [
      {
        title: "Add filters",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/composition/add_filters_1.png",
        description:
          "Select filters for a player's profile. You can add filters for any attribute in the player's profile.",
      },
      {
        title: "Select Segments",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/composition/add_filters_2.png",
        description: "Select multiple segments for your audience.",
      },
      {
        title: "Edit Filters",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/composition/add_filters_3.png",
        description: "Edit filters for slice & dice analytics.",
      },
      {
        title: "Map Players",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/composition/add_filters_4.png",
        description:
          "A sample of audience can be mapped on a bubble chart. For that you need to select any attribute for X or Y axis.",
      },
      {
        title: "Select Players",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/composition/select_box.png",
        description:
          "Select multiple items to compare them to each other on a separate chart. You can also start building a segment using customer profiles of a selected items.",
      },
      {
        title: "Pin Tooltips",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/composition/pin_tooltip.png",
        description:
          "You can pin a tooltip by pressing Left Mouse Button on an attribute item.",
      },
      {
        title: "Build Segments",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/composition/build_segment.png",
        description:
          "Players you select can be used to build a new segment. If no players are selected, a new segment will be created based on all players in a bubble chart.",
      },
    ],
  },
  {
    title: "IAP Dashboard",
    page: "/dashboards/iap",
    steps: [
      {
        title: "Compare Items",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/dashboard_monetization/actions_to_compare.png",
        description:
          "Select multiple items to compare them to each other on a separate chart. You can also start building a segment using customer profiles of a selected items.",
      },
      {
        title: "Expand Profile",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/dashboard_monetization/click_to_expand_profile.png",
        description: "Expand customer profile rows by pressing expand button.",
      },
      {
        title: "Compare Segments",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/dashboard_monetization/segment_comparison.png",
        description:
          "You can divide a dashboard to compare two different segments with each other.",
      },
    ],
  },
  {
    title: "In-Game Currency Dashboard",
    page: "/dashboards/ingamecurrency",
    steps: [
      {
        title: "Filter Currency",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/dashboard_monetization/ingame_currency_use_filters.png",
        description:
          "Filter different sources (incomes) and sinks (expenses) of in-game currency in different dimensions: absolute, per player, per player session.",
      },
      {
        title: "Compare Items",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/dashboard_monetization/actions_to_compare.png",
        description:
          "Select multiple items to compare them to each other on a separate chart. You can also start building a segment using customer profiles of a selected items.",
      },
      {
        title: "Expand Profile",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/dashboard_monetization/click_to_expand_profile.png",
        description: "Expand customer profile rows by pressing expand button.",
      },
      {
        title: "Compare Segments",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/dashboard_monetization/segment_comparison.png",
        description:
          "You can divide a dashboard to compare two different segments with each other.",
      },
    ],
  },
  {
    title: "Custom Dashboards",
    page: "/customdashboards",
    steps: [
      {
        title: "Add Charts",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/custom_dashboard/save_chart.png",
        description:
          "You can add charts to your dashboards from Explore Data page after you build a chart.",
      },
      {
        title: "Layout",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/custom_dashboard/edit_and_move_chart_size.png",
        description:
          "You can make your own layout by pressing Edit. You can name, set any position or size, and clone your chart.",
      },
    ],
  },
  {
    title: "Deployment",
    page: "/deployment",
    steps: [
      {
        title: "How To Deploy",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/deployment/how_to_deploy.png",
        description:
          "Current branch is the branch you're currently in, be mindful of it. To start cooking process, click 'Cook content' button. Cooking process may fail sometimes because of some mistakes in configurations , it's OK, just look at the error and fix them. Cooked version will not propagate to users until you assign it to environment.",
      },
      {
        title: "Changes & Logs",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/deployment/see_versions_and_logs.png",
        description:
          "Here you can view your cooked versions and cooking logs. Cooking logs shows if deployment was successful, and sometimes they show you occurred errors.",
      }
    ],
  },
  {
    title: "Entities",
    page: "/entities",
    steps: [
      {
        title: "Add Entity",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/entities/add_entity.png",
        description:
          "Start adding your first entities by pressing plus icon on top of the sidebar.",
      },
      {
        title: "Categorize",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/entities/how_to_build_tree.png",
        description:
          "All entities without parent are uncategorized and won't end up in deployment. Drag & drop your entity to any category in the tree to build a hierarchy and make entity active.",
      },
      {
        title: "Use Groups",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/entities/use_groups.png",
        description:
          "Use group names to categorize your entities. You can then quickly filter the whole tree to find what you need.",
      },
      {
        title: "Shortcut",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/entities/use_shortcut.png",
        description:
          "Press Ctrl + Left Mouse Button to quickly open a node in tree.",
      },
    ],
  },
  {
    title: "Explore Data",
    page: "/charts",
    steps: [
      {
        title: "Add Events",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/explore_data/add_events_1.png",
        description: "Start by adding events into dataset.",
      },
      {
        title: "Filter Events",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/explore_data/add_events_2.png",
        description:
          "You can make various filters based on values or categories.",
      },
      {
        title: "Edit Dataset",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/explore_data/add_events_3.png",
        description: "You can edit your dataset's visual settings.",
      },
      {
        title: "Save Charts",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/explore_data/save_chart.png",
        description: "You can save your charts to a custom dashboard.",
      },
    ],
  },
  {
    title: "Flows",
    page: "/flows",
    steps: [
      {
        title: "Start Building Flow",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/flows/build_flow_1.png",
        description:
          "Create folder, then press plus icon on it's side to create a flow inside a folder. Select any trigger to start building your first flow.",
      },
      {
        title: "Node Details",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/flows/build_flow_2.png",
        description: "You can view and edit node's details by pressing on it.",
      },
      {
        title: "Flow Details",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/flows/build_flow_3.png",
        description:
          "There are Flow setting in any details window. There you can change flow's name, folder, or compare this flow's segment with other audience.",
      },
      {
        title: "Add Nodes",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/flows/build_flow_4.png",
        description: "Add nodes by pressing '+ Add node'.",
      },
    ],
  },
  {
    title: "Game Events",
    page: "/gameevents",
    steps: [
      {
        title: "Create Event",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/game_events/build_event_1.png",
        description:
          "To create an event, press on a date item and then '+ Add new event'. You can also edit existing events from there.",
      },
      {
        title: "Event Editor",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/game_events/build_event_2.png",
        description:
          "An extensive event scheduling tools are available to make any various types of events. You can also edit segments blacklist and whitelist to filter audience access.",
      },
      {
        title: "Create Notes",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/game_events/make_notes_1.png",
        description: "You can also create notes for the given date.",
      },
      {
        title: "Take Notes",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/game_events/make_notes_2.png",
        description: "Take and save your notes for your team or yourself.",
      },
      {
        title: "View Notes",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/game_events/make_notes_3.png",
        description: "You can view existing notes at date item's corner.",
      },
    ],
  },
  {
    title: "Localization",
    page: "/localization",
    steps: [
      {
        title: "Add Keys",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/localization/add_localization_custom_1.png",
        description:
          "When in Custom localization, you can create your own keys and localization.",
      },
      {
        title: "Add Languages",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/localization/add_localization_language.png",
        description: "Add various languages by adding new columns.",
      },
    ],
  },
  {
    title: "Offers",
    page: "/offers",
    steps: [
      {
        title: "Create Offers",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/offers/build_offers.png",
        description:
          "Create offers and IAPs for your audience using both real money and in-game currency.",
      },
      {
        title: "Set Positions",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/offers/build_positions.png",
        description:
          "Create offer positions for places in your game where you just want to swap offers frequently instead of reconfiguring IDs inside a game everytime.",
      },
      {
        title: "Make Pricing",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/offers/make_pricing.png",
        description:
          "Create pricing templates for your offers. You can quickly populate all prices by just entering main currency price value and pressing 'Auto-fill exchange rate'",
      },
    ],
  },
  {
    title: "Segmentation",
    page: "/segmentation",
    steps: [
      {
        title: "Create Segments",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/segmentation/create_segment_1.png",
        description: "Start creating segments by pressing 'Add new segment'.",
      },
      {
        title: "Make Blocks",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/segmentation/create_blocks.png",
        description:
          "Create condition blocks. They act as brackets '()' for your conditions.",
      },
      {
        title: "Build Conditions",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/segmentation/create_segment_2.png",
        description:
          "Drag & drop conditions from the left panel onto created blocks.",
      },
      {
        title: "Take Notes",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/segmentation/make_comments.png",
        description: "Take notes for your team or yourself.",
      },
    ],
  },
  {
    title: "Player Warehouse",
    page: "/playerwarehouse",
    steps: [
      {
        title: "Create Elements",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/warehouse/create_element_1.png",
        description:
          "Besides regular statistics, you can create analytics events' driven player statistics here. To start, press 'Add new' under the Analytics Elements.",
      },
      {
        title: "Event-Driven Statistics",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/warehouse/create_element_2.png",
        description:
          "Pick an analytics event that is registered in Analytics Events page, it's value and calculation method. You can also add various filters for incoming events.",
      },
      {
        title: "View Players",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/warehouse/click_to_view_and_edit_player.png",
        description:
          "You can view players data by querying and clicking on them in the left panel.",
      },
      {
        title: "View Segments & Inventory",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/warehouse/client_view_segments_and_inventory.png",
        description: "View selected player's segments and inventory.",
      },
      {
        title: "Edit Statistics",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/warehouse/edit_statistics.png",
        description: "You can manually edit selected player's statistics element.",
      },
      {
        title: "Leaderboards",
        image:
          "https://storage.googleapis.com/strix-app-tutorials-media/strix-tutorial/warehouse/create_leaderboards.png",
        description: "Create leaderboards for existing statistics elements.",
      },
    ],
  },
];
export default tutorials;
