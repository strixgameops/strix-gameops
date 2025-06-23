import React, { useState, useEffect, useRef } from "react";
import s from "./abtesting.module.css";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import shortid from "shortid";
import Input from "@mui/material/Input";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import NorthSharpIcon from "@mui/icons-material/NorthSharp";
import TargetChangeContainer from "./TargetChangeContainer";
import OfferIconPlaceholder from "shared/icons/OfferIconPlaceholder.jsx";
import { Popover } from "@mui/material";
import { addDays } from "date-fns";

import TestGraph from "./TestGraph";

function TestObj({
  test,
  index,
  entities,
  segmentsList,
  possibleMetrics_offer,
  offers,

  game,
  branch,
}) {
  const [testValid, setTestValid] = useState(true);

  // Inputs
  const [inputIDFocused, setInputIDFocused] = useState(false);
  const inputIDRef = React.useRef();
  useEffect(() => {
    if (inputIDFocused) {
      inputIDRef.current.focus();
    }
  }, [inputIDFocused]);
  function unfocusInputID(e, blur) {
    if ((e.keyCode !== 13) & !blur) return;
    setInputIDFocused(false);
    if (inputIDRef) {
      inputIDRef.current.blur();
    }
  }
  const [inputNameFocused, setInputNameFocused] = useState(false);
  const inputNameRef = React.useRef();
  // Name input
  useEffect(() => {
    if (inputNameFocused) {
      inputNameRef.current.focus();
    }
  }, [inputNameFocused]);
  function unfocusInputName(e, blur) {
    if ((e.keyCode !== 13) & !blur) return;
    setInputNameFocused(false);
    if (inputNameRef) {
      inputNameRef.current.blur();
    }
  }
  // Test segment share input
  const [inputShareFocused, setInputShareFocused] = useState(false);
  const inputShareRef = React.useRef();
  useEffect(() => {
    if (inputShareFocused) {
      inputShareRef.current.focus();
    }
  }, [inputShareFocused]);
  function unfocusInputShare(e, blur) {
    if ((e.keyCode !== 13) & !blur) return;
    setInputShareFocused(false);
    if (inputShareRef) {
      inputShareRef.current.blur();
    }
  }
  function findSegmentName(segmentID) {
    let name = segmentsList.find(
      (segment) => segment.segmentID === segmentID
    )?.segmentName;
    if (name !== undefined) {
      return name;
    } else {
      return "";
    }
  }

  const [openSubjectModal, setOpenSubjectModal] = useState(false);
  const [controlSegmentAnchorEl, setControlSegmentAnchorEl] = useState(null);
  const [testSegmentAnchorEl, setTestSegmentAnchorEl] = useState(null);
  const [possibleMetricsAnchorEl, setPossibleMetricsAnchorEl] = useState(null);
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    height: "fit-content",
    maxHeight: 800,
    bgcolor: "var(--bg-color3)",
    border: "1px solid #625FF440",
    boxShadow: `0px 0px 5px 2px rgba(98, 95, 244, 0.2)`,
    overflowY: "auto",
    scrollbarWidth: "thin",
    borderRadius: "2rem",
    display: "flex",
    flexDirection: "column",
    p: 4,
  };
  function getOfferIcon(offerID) {
    let icon = offers.find((offer) => offer.offerID === offerID)?.offerIcon;
    if (icon === undefined || icon === "") {
      return <OfferIconPlaceholder />;
    }
    return <img src={`${icon}`} className={s.targetSubjectIcon} />;
  }

  function trimStr(str, maxLength) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }

  const [testGraph, setTestGraph] = useState({
    chartID: shortid.generate(),
    name: "",
    metricName: "",
    data: {},
    chartSettings: {
      type: "line",
      showDelta: true,
      deltaFormat: "$",
      deltaFormatPosition: "start",
      showLegend: true,
      legendPosition: "bottom",
      ticks: {
        y: {
          customTickFormatY: true,
          customTickFormatYType: "float",
          tooltipText: " ",
          metricFormat: "",
          metricFormatPosition: "start",
        },
        // y1: {
        //   customTickFormatY: false,
        //   customTickFormatYType: '',
        //   tooltipText: ' ',
        //   metricFormat: '',
        //   metricFormatPosition: 'start',
        //   min: 0,
        //   max: 1,
        // },
        // y2: {
        //   customTickFormatY: false,
        //   customTickFormatYType: '',
        //   tooltipText: ' ',
        //   metricFormat: '',
        //   metricFormatPosition: 'start',
        // },
      },
      fullWidth: true,
    },
    categoryField: "timestamp",
    datasetsConfigs: [
      {
        config: {
          type: "line",
          yAxisID: "y",
          label: "Control group",
        },
        valueField: "control",
      },
      {
        config: {
          type: "line",
          label: "Test group",
          yAxisID: "y",
        },
        valueField: "test",
      },
      // {
      //     config: {
      //       type: 'line',
      //       label: 'p-value',
      //       yAxisID: 'y1',
      //       borderWidth: 1,
      //       pointRadius: 1,
      //       pointHoverRadius: 1

      //     },
      //     valueField: 'pvalue',
      // },
      // {
      //     config: {
      //       type: 'line',
      //       label: 'z-score',
      //       yAxisID: 'y2',
      //       hidden: true,
      //       borderWidth: 1,
      //       pointRadius: 1,
      //       pointHoverRadius: 1

      //     },
      //     valueField: 'zScore',
      // },
    ],
    sampleSize: test.sampleSize,
    expectedResult: test.observedMetric.expectation,
  });

  async function fetchData() {
    // let resp1 = await getRandomDataForABTest({
    //     gameID: game.gameID,
    //     branch: branch,
    //     filterDate: [test.startDate, addDays(new Date(), 30).toISOString()],
    // });
    // resp1 = resp1.message
    console.log(test);
    setTestGraph({ ...testGraph, data: test.archivedData || [] });
  }
  useEffect(() => {
    fetchData();
  }, []);

  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [chooseResult, setChooseResult] = useState(false);

  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  return (
    <div key={index} className={s.testBodyMinified}>
      <div className={s.leftSide}>
        <div className={s.hat}>
          <div className={s.name}>
            <Typography
              sx={{
                width: "fit-content",
                textAlign: "start",
                fontSize: "20px",
                width: "fit-content",
              }}
            >
              {test.name}
            </Typography>

            <div
              className={`${s.resultChip} ${test.archivedResult === "success" ? s.success : s.failure}`}
            >
              <Typography
                sx={{
                  width: "fit-content",
                  textAlign: "start",
                  fontSize: "16px",
                  width: "fit-content",
                }}
              >
                {test.archivedResult === "success" ? `Successful` : "Failed"}
              </Typography>
            </div>
          </div>
        </div>

        <div className={s.body}>
          <div className={s.changedFieldsBody}>
            <Button
              // disabled={test.startDate !== ''}
              onClick={(e) => setOpenSubjectModal(true)}
              variant="outlined"
              sx={{
                width: "150px",
                height: "150px",
                borderRadius: "1rem",
              }}
            >
              {test.subject.type !== ""
                ? getOfferIcon(test.subject.itemID)
                : `set target change`}
            </Button>
            <Modal
              open={openSubjectModal}
              onClose={() => setOpenSubjectModal(false)}
            >
              <Box sx={style}>
                <TargetChangeContainer
                  onChangeFields={() => {}}
                  onTypeChange={() => {}}
                  onItemIDChange={() => {}}
                  test={test}
                  entities={entities}
                  index={index}
                  offersList={offers}
                  gameID={game.gameID}
                  branch={branch}
                  onClose={() => setOpenSubjectModal(false)}
                  onValidation={() => {}}
                />
              </Box>
            </Modal>
          </div>

          <div className={s.group}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography sx={{ m: 1, mr: 0 }} color={"text.secondary"}>
                Control:
              </Typography>
              <Button
                disabled={test.startDate !== ""}
                onClick={(e) => setControlSegmentAnchorEl(e.currentTarget)}
                variant="outlined"
                sx={{
                  height: "35px",
                  minHeight: "35px",
                  textTransform: "none",
                }}
              >
                <Typography component="span" sx={{ p: 1 }} fontSize={14}>
                  {trimStr(findSegmentName(test.segments.control), 20)}
                </Typography>
              </Button>
              <Popover
                open={Boolean(controlSegmentAnchorEl)}
                anchorEl={controlSegmentAnchorEl}
                onClose={() => setControlSegmentAnchorEl(null)}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
              >
                <div className={s.popoverSegmentsList}>
                  <div className={s.segmentsList}>
                    {segmentsList.map((segment, i) => (
                      <Button
                        sx={{
                          textTransform: "none",
                          justifyContent: "start",
                        }}
                        key={i}
                        variant="text"
                        onClick={() => {
                          setControlSegmentAnchorEl(null);
                          setTestControlSegment(segment.segmentID, index);
                        }}
                      >
                        {segment.segmentName}
                      </Button>
                    ))}
                  </div>
                </div>
              </Popover>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography sx={{ m: 1, mr: 0 }} color={"text.secondary"}>
                Test:
              </Typography>
              <Button
                disabled={test.startDate !== ""}
                onClick={(e) => setTestSegmentAnchorEl(e.currentTarget)}
                variant="outlined"
                sx={{
                  height: "35px",
                  minHeight: "35px",
                  textTransform: "none",
                  ml: "auto",
                }}
              >
                <Typography component="span" sx={{ p: 1 }} fontSize={14}>
                  {trimStr(findSegmentName(test.segments.test), 20)}
                </Typography>
              </Button>
              <Popover
                open={Boolean(testSegmentAnchorEl)}
                anchorEl={testSegmentAnchorEl}
                onClose={() => setTestSegmentAnchorEl(null)}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
              >
                <div className={s.popoverSegmentsList}>
                  <div className={s.segmentsList}>
                    {segmentsList.map((segment, i) => (
                      <Button
                        sx={{
                          textTransform: "none",
                          justifyContent: "start",
                        }}
                        key={i}
                        variant="text"
                        onClick={() => {
                          setTestSegmentAnchorEl(null);
                          setTestTargetSegment(segment.segmentID, index);
                        }}
                      >
                        {segment.segmentName}
                      </Button>
                    ))}
                  </div>
                </div>
              </Popover>

              <Button
                disabled={test.startDate !== ""}
                onClick={() => inputShareRef.current.focus()}
                variant="outlined"
                sx={{
                  height: "35px",
                  minHeight: "35px",
                  textTransform: "none",
                  pl: 0,
                  pr: 1,
                  borderLeft: "none",
                }}
              >
                <Tooltip disableInteractive title="" placement="top">
                  <Input
                    spellCheck={false}
                    fullWidth
                    inputRef={inputShareRef}
                    value={
                      test.segments.testShare === 0
                        ? ""
                        : parseInt(test.segments.testShare * 100)
                    }
                    onKeyDown={(e) => unfocusInputShare(e)}
                    onBlur={(e) => unfocusInputShare(e, true)}
                    onFocus={() => setInputShareFocused(true)}
                    onSubmit={(e) => {
                      setTestSegmentShare(e.target.value, index);
                    }}
                    onChange={(e) => {
                      setTestSegmentShare(e.target.value, index);
                    }}
                    sx={{
                      width: "30px",
                      fontSize: "14px",
                      backgroundColor: inputShareFocused
                        ? "rgba(0,0,0,0.1)"
                        : "rgba(0,0,0,0.0)",

                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "13px",
                      },
                      "&.MuiInputBase-root::before": {
                        borderBottom: "none",
                      },
                      "&.MuiInputBase-root:hover::before": {
                        borderBottom: "1px solid #6E758E",
                      },
                      pl: 0,
                      pr: 0,
                    }}
                  />
                </Tooltip>
                %
              </Button>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography sx={{ m: 1, mr: 0 }} color={"text.secondary"}>
                Metric to observe:
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  disabled={test.startDate !== ""}
                  onClick={(e) => setPossibleMetricsAnchorEl(e.currentTarget)}
                  variant="outlined"
                  sx={{
                    height: "35px",
                    minHeight: "35px",
                    ml: "auto",
                    textTransform: "none",
                  }}
                >
                  <Typography component="span" sx={{ p: 1 }} fontSize={14}>
                    {
                      possibleMetrics_offer.find(
                        (m) => m.id === test.observedMetric.id
                      )?.name
                    }
                  </Typography>
                </Button>

                <Popover
                  open={Boolean(possibleMetricsAnchorEl)}
                  anchorEl={possibleMetricsAnchorEl}
                  onClose={() => setPossibleMetricsAnchorEl(null)}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                  }}
                >
                  <div className={s.popoverSegmentsList}>
                    {possibleMetrics_offer.map((metric, i) => (
                      <Button
                        sx={{
                          textTransform: "none",
                          justifyContent: "start",
                        }}
                        key={i}
                        variant="text"
                        onClick={() => {
                          setPossibleMetricsAnchorEl(null);
                          setTestObservedMetric(metric.id, index);
                        }}
                      >
                        {metric.name}
                      </Button>
                    ))}
                  </div>
                </Popover>

                {/* <Tooltip
                  title={"Expected to " + test.observedMetric.expectation}
                >
                  <Button
                    disabled={test.startDate !== ""}
                    onClick={() =>
                      setTestMetricExpectation(
                        test.observedMetric.expectation === "decrease"
                          ? "increase"
                          : "decrease",
                        index
                      )
                    }
                    variant="outlined"
                    sx={{
                      borderLeft: "1px solid rgba(15, 14, 22, 0)",
                      height: "35px",
                      minHeight: "35px",
                      minWidth: "25px",
                      width: "25px",
                      ml: "auto",
                      textTransform: "none",
                    }}
                  >
                    {test.observedMetric.expectation === "decrease" ? (
                      <NorthSharpIcon sx={{ transform: "rotate(180deg)" }} />
                    ) : (
                      <NorthSharpIcon fontSize={"small"} />
                    )}
                  </Button>
                </Tooltip> */}
              </Box>
            </Box>
          </div>
        </div>

        {/* <div className={s.actions}>
                    {test.startDate !== '' ? [
                         <Button variant={test.paused ? 'contained' : 'outlined'}
                        //  disabled={!testValid}
                         sx={{
                           width: '100px', mr: 5
                         }}
                         onClick={() => {
                          setTestPaused(index)
                         }}>
                          {test.paused ? 'Resume' : 'Pause'}
                         </Button>,
                         <Button variant="outlined" 
                        //  disabled={!testValid}
                         sx={{
                           width: '100px'
                         }}
                         onClick={() => setOpenConfirmModal(true)}>
                           Stop
                         </Button>
                     ] : (
                      <Box sx={{display: 'flex', width: '100%', alignItems: 'center'}}>
                        <Button variant="contained" 
                        disabled={!testValid}
                        sx={{
                          width: '100px',
                          mr: 3
                        }}
                        onClick={() => {
                          if (testValid) {
                            setTestStarted(index)
                          }
                        }}>
                          Start
                        </Button>
                        <Typography color='text.grey' sx={{fontSize: 14}}>Fill all fields</Typography>

                        <Button variant="outlined" 
                        sx={{
                          width: '100px',
                          ml: 'auto'
                        }}
                        onClick={() => setOpenConfirmDeleteModal(true)}>
                          Delete
                        </Button>
                      </Box>
                    )}
                  </div> */}
      </div>

      <div className={s.middleBody}>
        <TestGraph chartObj={testGraph} testStartDate={test.startDate} />
      </div>

      <Modal
        open={openConfirmModal}
        onClose={() => {
          setChooseResult(false);
          setOpenConfirmModal(false);
        }}
      >
        <Box sx={style}>
          <Typography
            variant="h4"
            color={"text.secondary"}
            sx={{
              fontSize: "20px",
              fontWeight: "regular",
              textAlign: "center",
            }}
          >
            Stop test "{test.name}"
          </Typography>

          <Typography
            variant="h4"
            color={"text.secondary"}
            sx={{
              fontSize: "16px",
              mt: 5,
              fontWeight: "regular",
              textAlign: "center",
            }}
          >
            If you delete the test, it will immediately stop it and it's results
            won't be put into the archive.
          </Typography>

          <Box
            sx={{
              width: "100%",
              mt: 5,
              display: "flex",
              justifyContent: "start",
            }}
          >
            {chooseResult
              ? [
                  <Button
                    sx={{ mr: 2 }}
                    variant="contained"
                    onClick={() => onTestDelete(index, true, "success")}
                  >
                    Archive as success
                  </Button>,

                  <Button
                    variant="contained"
                    onClick={() => onTestDelete(index, true, "failure")}
                  >
                    Archive as failure
                  </Button>,
                ]
              : [
                  <Button
                    sx={{ mr: 2 }}
                    variant="outlined"
                    onClick={() => onTestDelete(index)}
                  >
                    Stop and delete
                  </Button>,

                  <Button
                    variant="outlined"
                    onClick={() => setChooseResult(true)}
                  >
                    Stop and archive
                  </Button>,
                ]}

            <Button
              sx={{ ml: "auto" }}
              variant="contained"
              onClick={() => {
                setChooseResult(false);
                setOpenConfirmModal(false);
              }}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal
        open={openConfirmDeleteModal}
        onClose={() => {
          setOpenConfirmDeleteModal(false);
        }}
      >
        <Box sx={{ ...style, width: "400px" }}>
          <Typography
            variant="h4"
            color={"text.secondary"}
            sx={{
              fontSize: "20px",
              fontWeight: "regular",
              textAlign: "center",
            }}
          >
            Delete the draft test "{test.name}"
          </Typography>

          <Box
            sx={{
              width: "100%",
              mt: 5,
              display: "flex",
              justifyContent: "start",
            }}
          >
            <Button
              sx={{ mr: 2 }}
              variant="outlined"
              onClick={() => onTestDelete(index)}
            >
              Delete
            </Button>

            <Button
              sx={{ ml: "auto" }}
              variant="contained"
              onClick={() => {
                setOpenConfirmDeleteModal(false);
              }}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* <div className={s.rightSide}>
      <textarea 
      className={s.comment} 
      type="text" 
      value={test.comment} 
      onChange={(e) => setTestComment(e.target.value, index)}/>
    </div> */}
    </div>
  );
}

export default TestObj;
