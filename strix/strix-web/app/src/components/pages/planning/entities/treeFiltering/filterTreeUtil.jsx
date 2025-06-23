// Helper functions for filtering
export const defaultMatcher = ({filterText, groupFilter, node}) => {
  const lowerCaseFilter = filterText.toLowerCase();
  let check = true;
  if (filterText) {
    check =
      node.Name && node.Name.toLowerCase().indexOf(lowerCaseFilter) !== -1;
  }
  if (groupFilter.length > 0) {
    check = node.groupName && groupFilter.includes(node.groupName);
  }
  // console.log(check, groupFilter, node);
  return check;
};

export const findNode = ({ node, filter, groupFilter, matcher }) => {
  return (
    matcher({ filterText: filter, groupFilter: groupFilter, node: node }) || // i match
    (node.Subnodes && // or i have decendents and one of them match
      node.Subnodes.length &&
      !!node.Subnodes.find((Subnode) => {
        // console.log(Subnode, filter, groupFilter, matcher)
        return findNode({ node: Subnode, filter, groupFilter, matcher });
      }))
  );
};

export const filterTree = (
  node,
  filter,
  groupFilter,
  matcher = defaultMatcher
) => {
  // If im an exact match then all my children get to stay
  if (matcher({ filterText: filter, groupFilter: groupFilter, node: node }) || !node.Subnodes) {
    return node;
  }
  // If not then only keep the ones that match or have matching descendants
  const filtered = node.Subnodes.filter((Subnodes) => {
    return findNode({ node: Subnodes, filter, groupFilter, matcher });
  }).map((Subnodes) => filterTree(Subnodes, filter, groupFilter, matcher));
  return Object.assign({}, node, { Subnodes: filtered });
};

// export const filterTreeId = (node, id, matcher = defaultMatcherId) => {
//   if (node.id === id) {
//     return node;
//   }
//   // If not then only keep the ones that match or have matching descendants
//   const filtered = node.Subnodes.filter((Subnode) =>
//     findNode(Subnode, id, matcher)
//   ).map((Subnode) => filterTreeId(Subnode, id, matcher));
//   return Object.assign({}, node, { Subnodes: filtered });
// };

export const expandFilteredNodes = (
  node,
  filter,
  groupFilter,
  matcher = defaultMatcher
) => {
  let Subnodes = node.Subnodes;
  if (!Subnodes || Subnodes.length === 0) {
    return Object.assign({}, node, { toggled: false });
  }
  const childrenWithMatches = node.Subnodes.filter((Subnode) =>
    findNode({ node: Subnode, filter, groupFilter, matcher })
  );
  const shouldExpand = childrenWithMatches.length > 0;
  // If im going to expand, go through all the matches and see if thier children need to expand
  if (shouldExpand) {
    Subnodes = childrenWithMatches.map((Subnode) => {
      return expandFilteredNodes(Subnode, filter, groupFilter, matcher);
    });
  }
  return Object.assign({}, node, {
    Subnodes: Subnodes,
    toggled: shouldExpand,
  });
};

let store = [];
export const getIDsExpandFilter = (node) => {
  let Subnodes = node.Subnodes;
  if (!Subnodes || Subnodes.length === 0) {
    return store;
  }
  if (node.id === "root") {
    store = ["root"];
  }
  if (Subnodes) {
    Subnodes.map((subnode) => store.push(subnode.ID));
  }
  node.Subnodes.map((subnode) => getIDsExpandFilter(subnode));
  return store;
};

/**
 * Find tree item with recursive approach
 * @param node
 * @param id
 */
export const searchTree = (node, ID) => {
  if (node.ID === ID) {
    return node;
  } else if (node.Subnodes != null) {
    let index;
    let result;
    for (index = 0; result == null && index < node.Subnodes.length; index++) {
      result = searchTree(node.Subnodes[index], ID);
    }
    return result;
  }
  return null;
};
