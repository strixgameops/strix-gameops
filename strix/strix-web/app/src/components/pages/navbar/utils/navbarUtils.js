export const trimStr = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
};

export const openPage = (e, link, navigate, setOpenedPage) => {
  if (e.button === 0) {
    setTimeout(() => {
      if (window.location.pathname === link) {
        // Could reload here if needed
      } else {
        navigate(link);
        setOpenedPage(link);
      }
    }, 100);
  } else if (e.button === 1) {
    setTimeout(() => {
      window.open(link, "_blank", "noreferrer");
    }, 100);
  }
};

export const updateURLParams = (game, branch, environment, navigate) => {
  const params = new URLSearchParams(window.location.search);

  if (game?.gameID) params.set("game", game.gameID);
  if (branch) params.set("branch", branch);
  if (environment) params.set("environment", environment);

  const newPath = `${window.location.pathname}?${params.toString()}`;
  navigate(newPath);
};

export const shouldShowItem = (item) => {
  return (
    (!item.devOnly || window.__env?.environment === "development") &&
    (!item.enterpriseOnly || window.__env?.edition === "enterprise")
  );
};
