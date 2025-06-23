import React, { useState, useEffect } from 'react';

export const useTestValidation = (test) => {
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const validateTest = () => {
      const newErrors = [];

      // Validate subjects
      if (!test.subject || test.subject.length === 0) {
        newErrors.push("Changes are empty");
      } else {
        test.subject.forEach((subject, index) => {
          if (!subject.type) {
            newErrors.push(`Change ${index + 1}: Item type is empty`);
          }
          if (!subject.itemID) {
            newErrors.push(`Change ${index + 1}: Item to change isn't chosen`);
          }
          if (subject.type !== "entity" && (!subject.changedFields || Object.keys(subject.changedFields).length === 0)) {
            newErrors.push(`Subject ${index + 1}: Changed fields are empty`);
          }
          
          // Validate changedFields
          if (subject.changedFields) {
            Object.entries(subject.changedFields).forEach(([field, value]) => {
              if (value === "") {
                newErrors.push(`Subject ${index + 1}: Field '${field}' is empty`);
              }
              if (value && typeof value === "object") {
                Object.entries(value).forEach(([subField, subValue]) => {
                  if (subValue === "" || subValue === undefined) {
                    newErrors.push(`Subject ${index + 1}: Subfield '${subField}' in field '${field}' is empty`);
                  }
                });
              }
            });
          }
        });
      }

      // Validate segments
      if (!test.segments.control) {
        newErrors.push("Control segment is empty");
      }
      if (!test.segments.test) {
        newErrors.push("Test segment is empty");
      }

      // Validate metrics
      if (!test.observedMetric || test.observedMetric.length === 0) {
        newErrors.push("Add at least one metric to observe for this test");
      } else {
        test.observedMetric.forEach((metric, index) => {
          const hasEntitySubject = test.subject.some(subject => subject.type === "entity");
          if (hasEntitySubject) {
            if (!metric.metric.queryAnalyticEventID || !metric.metric.queryEventTargetValueId || !metric.metric.queryMethod) {
              newErrors.push(`Metric ${index + 1}: Required fields for entity change are missing`);
            }
          } else if (!metric.metric) {
            newErrors.push(`Metric ${index + 1} is empty`);
          }
        });
      }

      setErrors(newErrors);
      setIsValid(newErrors.length === 0);
    };

    validateTest();
  }, [test]);

  return { isValid, errors };
};