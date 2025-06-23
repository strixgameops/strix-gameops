export function mergeSegmentValues(originalSegments, overrideSegments) {
    if (!Boolean(overrideSegments)) {
        // If no override values are provided, keep original values
        return originalSegments;
    }
    let originalSegments_cloned = JSON.parse(JSON.stringify(originalSegments))
    let overrideSegments_cloned = JSON.parse(JSON.stringify(overrideSegments))

    // Iterating over override values
    for (let segmentedValue of overrideSegments_cloned) {

        const index = originalSegments_cloned.findIndex(s => s.segmentID === segmentedValue.segmentID)
        if (index !== -1) {
            // If we have such segmented value, replace it with override
            originalSegments_cloned[index] = segmentedValue;
        } else {
            originalSegments_cloned.push(segmentedValue);
        }
        
    }
    return originalSegments_cloned
}