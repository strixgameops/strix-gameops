import React, { useEffect, useState } from "react";
import useApi from "@strix/api";

import s from "./publishedNode.module.css";

import { useLocation, useNavigate, useParams } from "react-router-dom";

const PublishedNodeContent = () => {
  document.title = "Node: Loading...";

  const { link } = useParams();
  const [content, setContent] = useState(null);
  const [nodeName, setNodeName] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const { getPublishedNode } = useApi();

  let searchParams = new URLSearchParams(location.search);

  useEffect(() => {
    // console.log('link is', link)
    const fetchPublishedContent = async () => {
      try {
        const response = await getPublishedNode({
          link,
          branch: "development",
        });

        setContent(response.content);
        setNodeName(response.name);
        document.title = `Node: ${response.name}`;

        searchParams = new URLSearchParams(location.search);
        const branch = searchParams.set("branch", "development");
        const gameID = searchParams.set("gameID", response.gameID);

        const currentPath = window.location.pathname;
        const newPath = `${currentPath}?${searchParams.toString()}`;
        navigate(newPath);
      } catch (error) {
        console.error("Could not get published node", error);
      }
    };

    fetchPublishedContent();
  }, [link]);

  if (!content) {
    return <p>Loading...</p>;
  }

  //  JSX
  return (
    <div className={s.publishedNodeBody}>
      <div className={s.publishedNodeTitle}>{nodeName}</div>
      <div className={s.publishedNodeEditor}>
        <PlaygroundApp nodeContent={content} editorType={"publishedNode"} />
      </div>
    </div>
  );
};

export default PublishedNodeContent;
