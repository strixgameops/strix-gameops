import React, { useState, useCallback, useMemo } from "react";
import { Box, Card, CardContent } from "@mui/material";
import TestHeader from "./components/TestHeader";
import TestControls from "./components/TestControls";
import TestSubject from "./components/TestSubject";
import TestSegments from "./components/TestSegments";
import TestMetrics from "./components/TestMetrics";
import TestChart from "./components/TestChart";
import { useTestValidation } from "./hooks/useTestValidation";
import { useTestData } from "./hooks/useTestData";
import s from "./abtesting.module.css";

const TestObj = ({
  test,
  entities,
  segmentsList,
  allAnalyticsEvents,
  offers,
  pricing,
  exchangeRates,
  exchangeRates_USD,
  nodeTree,
  nodeData,
  offersNames,
  entityCurrencies,
  game,
  branch,
  environment,
  setTestName,
  setTestComment,
  setTestStarted,
  setTestPaused,
  setTestSegment,
  setTestSegmentShare,
  setTestObservedMetric,
  setTestSubject,
  onTestDelete,
  deletingTest,
}) => {
  const [selectedMetricIndex, setSelectedMetricIndex] = useState(0);
  const { isValid, errors } = useTestValidation(test);
  const { testGraph, isLoadingData } = useTestData(
    test,
    selectedMetricIndex,
    game,
    branch,
    environment
  );

  const handleSegmentChange = useCallback(
    (segments) => {
      setTestSegment(segments.control, test.id);
      setTestSegmentShare(segments.testShare * 100, test.id);
    },
    [setTestSegment, setTestSegmentShare, test.id]
  );

  const memoizedProps = useMemo(
    () => ({
      entities,
      segmentsList,
      allAnalyticsEvents,
      offers,
      pricing,
      exchangeRates,
      exchangeRates_USD,
      nodeTree,
      nodeData,
      offersNames,
      entityCurrencies,
      game,
      branch,
      environment,
    }),
    [
      entities,
      segmentsList,
      allAnalyticsEvents,
      offers,
      pricing,
      exchangeRates,
      exchangeRates_USD,
      nodeTree,
      nodeData,
      offersNames,
      entityCurrencies,
      game,
      branch,
      environment,
    ]
  );

  return (
    <Card className={s.testBody}>
      <CardContent sx={{ p: 0, pb: "0px !important", height: "100%" }}>
        <Box sx={{ display: "flex", height: "100%" }}>
          <Box className={s.leftSide}>
            <TestHeader
              test={test}
              onNameChange={(name) => setTestName(name, test.id)}
              testGraph={testGraph}
            />

            <Box className={s.body}>
              <TestSubject
                test={test}
                onSubjectChange={(subject) => setTestSubject(subject, test.id)}
                {...memoizedProps}
              />

              <TestSegments
                test={test}
                segmentsList={segmentsList}
                onSegmentChange={handleSegmentChange}
                disabled={Boolean(test.startDate)}
              />
            </Box>

            <TestControls
              test={test}
              isValid={isValid}
              errors={errors}
              onStart={() => setTestStarted(test.id)}
              onPause={() => setTestPaused(test.id)}
              onStop={() => onTestDelete(test.id, true)}
              onDelete={() => onTestDelete(test.id)}
              isDeleting={deletingTest}
            />
          </Box>

          <Box className={s.middleBody}>
            <TestMetrics
              test={test}
              selectedMetricIndex={selectedMetricIndex}
              onMetricIndexChange={setSelectedMetricIndex}
              onMetricChange={(metrics) =>
                setTestObservedMetric(metrics, test.id)
              }
              allAnalyticsEvents={allAnalyticsEvents}
              offersNames={offersNames}
              entityCurrencies={entityCurrencies}
            />

            <TestChart
              testGraph={testGraph}
              isLoading={isLoadingData}
              testStartDate={test.startDate}
            />
          </Box>

          <Box className={s.rightSide}>
            <textarea
              className={s.comment}
              value={test.comment}
              onChange={(e) => setTestComment(e.target.value, test.id)}
              placeholder="Test description..."
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default React.memo(TestObj);
